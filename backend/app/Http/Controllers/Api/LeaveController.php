<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\LeaveDateService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class LeaveController extends Controller
{
    public function __construct(private LeaveDateService $leaveDateService)
    {
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $validated = $request->validate([
            'leave_type' => ['required', 'in:full_day,half_day,short_leave'],
            'start_date' => ['required', 'date'],
            'days_count' => ['nullable', 'integer', 'min:1'],
            'half_day_slot' => ['nullable', 'in:before_break,after_break'],
            'short_start_time' => ['nullable', 'date_format:H:i'],
            'short_end_time' => ['nullable', 'date_format:H:i'],
            'reason' => ['required', 'string'],
        ]);

        if ($validated['leave_type'] === 'half_day' && empty($validated['half_day_slot'])) {
            return response()->json(['message' => 'half_day_slot is required for half day leave'], 422);
        }

        if ($validated['leave_type'] === 'short_leave') {
            if (empty($validated['short_start_time']) || empty($validated['short_end_time'])) {
                return response()->json(['message' => 'short_start_time and short_end_time are required for short leave'], 422);
            }
            if ($validated['short_end_time'] <= $validated['short_start_time']) {
                return response()->json(['message' => 'short_end_time must be later than short_start_time'], 422);
            }
            $shortStart = Carbon::createFromFormat('H:i', $validated['short_start_time']);
            $shortEnd = Carbon::createFromFormat('H:i', $validated['short_end_time']);
            if ($shortEnd->diffInMinutes($shortStart) >= 300) {
                return response()->json(['message' => 'Short leave is 5 hours or more. Please apply as half day leave.'], 422);
            }
        }

        $days = $validated['leave_type'] === 'full_day' ? ($validated['days_count'] ?? 1) : 1;
        $rejoinDate = $validated['leave_type'] === 'full_day'
            ? $this->leaveDateService->calculateRejoinDate($validated['start_date'], $days)
            : $validated['start_date'];

        $leave = LeaveRequest::create([
            'staff_id' => $request->user()->id,
            'leave_type' => $validated['leave_type'],
            'half_day_slot' => $validated['leave_type'] === 'half_day' ? ($validated['half_day_slot'] ?? null) : null,
            'short_start_time' => $validated['leave_type'] === 'short_leave' ? ($validated['short_start_time'] ?? null) : null,
            'short_end_time' => $validated['leave_type'] === 'short_leave' ? ($validated['short_end_time'] ?? null) : null,
            'start_date' => $validated['start_date'],
            'days_count' => $days,
            'rejoin_date' => $rejoinDate,
            'reason' => $validated['reason'] ?? null,
            'status' => 'pending',
        ]);

        if ($request->user()->email) {
            try {
                Mail::raw(
                    "Your leave request submitted on {$leave->start_date} is pending review.",
                    function ($message) use ($request) {
                        $message->to($request->user()->email)
                            ->subject('Leave Request Submitted');
                    }
                );
            } catch (\Throwable) {
                // Keep API response successful even if mail transport is not configured.
            }
        }

        return response()->json($leave, 201);
    }

    public function index(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['staff', 'attender', 'boss'], true), 403);

        $query = LeaveRequest::with('staff:id,name,office_id,branch,role');

        if ($request->user()->role === 'staff') {
            $query->where('staff_id', $request->user()->id);
        } elseif ($request->user()->role === 'attender') {
            $query->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->orderByDesc('start_date')->limit(200)->get());
    }

    public function decide(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);
        abort_unless($request->user()->role !== 'attender' || $leaveRequest->staff?->branch === $request->user()->branch, 403);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $previousStatus = $leaveRequest->status;

        $leaveRequest->update([
            'status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'decision_at' => now(),
        ]);

        if (
            $previousStatus !== 'approved'
            && $validated['status'] === 'approved'
            && $leaveRequest->staff?->employment_type === 'intern'
            && $leaveRequest->staff->intern_end_date
        ) {
            $extensionDays = (int) ceil(match ($leaveRequest->leave_type) {
                'full_day' => (float) $leaveRequest->days_count,
                'half_day' => 0.5,
                default => 0.25,
            });
            if ($extensionDays > 0) {
                $leaveRequest->staff->update([
                    'intern_end_date' => Carbon::parse($leaveRequest->staff->intern_end_date)->addDays($extensionDays)->toDateString(),
                ]);
            }
        }

        if ($leaveRequest->staff) {
            $staff = $leaveRequest->staff->fresh();
            $units = $this->leaveUnitsForRequest($leaveRequest);

            // If boss never edited leave_count, keep it synced to approved leaves.
            if ($staff->leave_count === null) {
                $staff->update([
                    'leave_count' => round($this->approvedLeaveDaysFor($staff), 2),
                ]);
            } else {
                // If boss edited leave_count manually, apply status delta on top of manual baseline.
                $next = (float) $staff->leave_count;
                if ($previousStatus !== 'approved' && $validated['status'] === 'approved') {
                    $next += $units;
                } elseif ($previousStatus === 'approved' && $validated['status'] !== 'approved') {
                    $next = max(0, $next - $units);
                }

                if (abs($next - (float) $staff->leave_count) > 0.00001) {
                    $staff->update([
                        'leave_count' => round($next, 2),
                    ]);
                }
            }
        }

        if ($leaveRequest->staff?->email) {
            try {
                Mail::raw(
                    "Your leave request submitted on {$leaveRequest->start_date} has been {$leaveRequest->status}.",
                    function ($message) use ($leaveRequest) {
                        $message->to($leaveRequest->staff->email)
                            ->subject('Leave Request Update');
                    }
                );
            } catch (\Throwable) {
                // Keep API response successful even if mail transport is not configured.
            }
        }

        return response()->json($leaveRequest);
    }

    public function calendar(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        return response()->json(
            LeaveRequest::with('staff:id,name,office_id,branch')
                ->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch))
                ->where('status', 'approved')
                ->orderBy('start_date')
                ->get()
        );
    }

    private function approvedLeaveDaysFor(User $staff): float
    {
        return (float) LeaveRequest::where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->get()
            ->sum(function (LeaveRequest $row) {
                if ($row->leave_type === 'full_day') {
                    return (float) $row->days_count;
                }
                if ($row->leave_type === 'half_day') {
                    return 0.5;
                }
                return 0.25;
            });
    }

    private function leaveUnitsForRequest(LeaveRequest $leaveRequest): float
    {
        if ($leaveRequest->leave_type === 'full_day') {
            return (float) $leaveRequest->days_count;
        }
        if ($leaveRequest->leave_type === 'half_day') {
            return 0.5;
        }
        return 0.25;
    }

    private function internAutoLeaveDays(User $staff): int
    {
        if ($staff->employment_type !== 'intern') {
            return 0;
        }

        $start = Carbon::parse($staff->intern_start_date ?? $staff->joining_date ?? now()->toDateString())->startOfDay();
        $end = Carbon::parse($staff->intern_end_date ?? now()->toDateString())->startOfDay();
        $today = now()->startOfDay();
        if ($end->gt($today)) {
            $end = $today;
        }
        if ($start->gt($end)) {
            return 0;
        }

        $attendanceByDate = Attendance::where('staff_id', $staff->id)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get()
            ->keyBy(fn ($a) => Carbon::parse($a->date)->toDateString());

        $approvedLeaveDays = LeaveRequest::where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('rejoin_date', '>=', $start->toDateString())
            ->get();

        $approvedLeaveDates = [];
        foreach ($approvedLeaveDays as $leave) {
            $cursor = Carbon::parse($leave->start_date)->startOfDay();
            $endExclusive = $leave->leave_type === 'full_day'
                ? Carbon::parse($leave->rejoin_date)->startOfDay()
                : Carbon::parse($leave->start_date)->addDay()->startOfDay();
            while ($cursor->lt($endExclusive)) {
                if (!$cursor->isSunday()) {
                    $approvedLeaveDates[$cursor->toDateString()] = true;
                }
                $cursor->addDay();
            }
        }

        $missing = 0;
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            $attendance = $attendanceByDate->get($key);
            $isCompanyLeave = (bool) ($attendance?->is_company_leave ?? false);
            $hasAttendance = $attendance !== null;

            if (!$cursor->isSunday() && !$isCompanyLeave && !$hasAttendance && empty($approvedLeaveDates[$key])) {
                $missing++;
            }

            $cursor->addDay();
        }

        return $missing;
    }

    public function leaveCounts(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['staff', 'attender', 'boss'], true), 403);

        if ($request->user()->role === 'staff') {
            $staffList = User::whereKey($request->user()->id)->get();
        } elseif ($request->user()->role === 'attender') {
            $staffList = User::where('role', 'staff')->where('branch', $request->user()->branch)->orderBy('name')->get();
        } else {
            $staffList = User::where('role', 'staff')->orderBy('name')->get();
        }

        $rows = $staffList->map(function (User $staff) {
            $joiningDate = ($staff->joining_date ?? now())->toDateString();
            $approvedDays = $this->approvedLeaveDaysFor($staff);
            $attendedDays = Attendance::where('staff_id', $staff->id)
                ->where('is_company_leave', false)
                ->count();
            return [
                'staff_id' => $staff->id,
                'name' => $staff->name,
                'office_id' => $staff->office_id,
                'branch' => $staff->branch,
                'employment_type' => $staff->employment_type ?? 'permanent',
                'joining_date' => $joiningDate,
                'intern_end_date' => $staff->intern_end_date?->toDateString(),
                'attended_days' => $attendedDays,
                'leave_days' => $staff->leave_count ?? $approvedDays,
                'leave_days_auto' => $approvedDays,
                'leave_count' => $staff->leave_count,
            ];
        })->values();

        return response()->json($rows);
    }

    public function shortLeaveAlerts(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);

        return response()->json(
            LeaveRequest::with('staff:id,name,office_id,branch')
                ->where('leave_type', 'short_leave')
                ->whereDate('start_date', now()->toDateString())
                ->get()
        );
    }

    public function internEndingAlerts(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);

        $today = Carbon::today();
        $rows = User::where('role', 'staff')
            ->where('employment_type', 'intern')
            ->where('status', 'currently_working')
            ->orderBy('name')
            ->get()
            ->map(function (User $staff) use ($today) {
                $effectiveEndDate = Carbon::parse($staff->intern_end_date ?? $staff->joining_date ?? now()->toDateString());
                $daysLeft = $today->diffInDays($effectiveEndDate, false);

                return [
                    'staff_id' => $staff->id,
                    'name' => $staff->name,
                    'office_id' => $staff->office_id,
                    'branch' => $staff->branch,
                    'joining_date' => ($staff->joining_date ?? now())->toDateString(),
                    'intern_end_date' => $staff->intern_end_date?->toDateString(),
                    'effective_intern_end_date' => $effectiveEndDate->toDateString(),
                    'days_left' => $daysLeft,
                ];
            })
            ->filter(fn ($row) => $row['days_left'] >= 0 && $row['days_left'] <= 7)
            ->sortBy('days_left')
            ->values();

        return response()->json($rows);
    }

    public function updateLeaveCount(Request $request, User $user)
    {
        abort_unless($request->user()->role === 'boss', 403);
        abort_unless($user->role === 'staff', 422, 'Selected user is not staff');

        $validated = $request->validate([
            'leave_days' => ['required', 'numeric', 'min:0'],
        ]);

        $leaveDays = round((float) $validated['leave_days'], 2);
        $user->update([
            'leave_count' => $leaveDays,
        ]);

        return response()->json([
            'message' => 'Leave count updated',
            'staff_id' => $user->id,
            'leave_days' => $leaveDays,
        ]);
    }
}
