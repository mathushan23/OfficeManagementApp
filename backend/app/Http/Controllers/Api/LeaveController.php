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
            'leave_type' => ['required', 'in:full_day,half_day,short_leave,special_leave'],
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

        $isMultiDayType = in_array($validated['leave_type'], ['full_day', 'special_leave'], true);
        $days = $isMultiDayType ? ($validated['days_count'] ?? 1) : 1;
        $rejoinDate = $isMultiDayType
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

        $approverEmails = User::query()
            ->where(function ($q) use ($request) {
                $q->where('role', 'boss')
                    ->orWhere(function ($q2) use ($request) {
                        $q2->where('role', 'attender')->where('branch', $request->user()->branch);
                    });
            })
            ->whereNotNull('email')
            ->pluck('email')
            ->filter(fn ($email) => is_string($email) && trim($email) !== '')
            ->unique()
            ->values()
            ->all();

        if (!empty($approverEmails)) {
            try {
                Mail::raw(
                    "Leave request from {$request->user()->name} ({$request->user()->office_id}) on {$leave->start_date} is pending approval.",
                    function ($message) use ($approverEmails) {
                        $message->to($approverEmails)->subject('Leave Request Pending Approval');
                    }
                );
            } catch (\Throwable) {
                // Keep API response successful even if mail transport is not configured.
            }
        }

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

        // Leave approval no longer affects leave_count or intern extension.
        // Both are derived from attendance gaps.

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
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);

        $query = LeaveRequest::with('staff:id,name,office_id,branch')
            ->where('status', 'approved');

        if ($request->user()->role === 'attender') {
            $query->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        return response()->json(
            $query->orderBy('start_date')->get()
        );
    }

    private function missingAttendanceLeaveDays(User $staff): float
    {
        $start = Carbon::parse($staff->joining_date ?? now()->toDateString())->startOfDay();
        $today = Carbon::today();
        if ($start->gt($today)) {
            return 0;
        }

        return $this->ruleBasedLeaveDaysForRange($staff, $start, $today);
    }

    private function leaveScoreByDate(User $staff, Carbon $start, Carbon $end): array
    {
        $requests = LeaveRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('rejoin_date', '>=', $start->toDateString())
            ->orderBy('id')
            ->get([
                'leave_type',
                'start_date',
                'days_count',
            ]);

        $scores = [];
        foreach ($requests as $request) {
            if (in_array($request->leave_type, ['full_day', 'special_leave'], true)) {
                $cursor = Carbon::parse($request->start_date)->startOfDay();
                $remainingDays = max((int) ($request->days_count ?? 1), 1);
                while ($remainingDays > 0 && $cursor->lte($end)) {
                    if (!$cursor->isSunday()) {
                        if ($cursor->gte($start)) {
                            $key = $cursor->toDateString();
                            $isSpecialLeave = $request->leave_type === 'special_leave';
                            if ($isSpecialLeave) {
                                $scores[$key] = [
                                    'score' => 0.0,
                                    'source' => 'approved_special_leave',
                                    'is_exempt' => true,
                                ];
                            } else {
                                $existing = $scores[$key] ?? null;
                                if ($existing === null || !(bool) ($existing['is_exempt'] ?? false) && (float) $existing['score'] < 1.0) {
                                    $scores[$key] = [
                                        'score' => 1.0,
                                        'source' => 'approved_full_day',
                                        'is_exempt' => false,
                                    ];
                                }
                            }
                        }
                        $remainingDays--;
                    }
                    $cursor->addDay();
                }
                continue;
            }

            $requestDate = Carbon::parse($request->start_date)->startOfDay();
            if ($requestDate->lt($start) || $requestDate->gt($end) || $requestDate->isSunday()) {
                continue;
            }

            $isSpecialLeave = $request->leave_type === 'special_leave';
            $score = $request->leave_type === 'half_day' ? 0.5 : ($request->leave_type === 'short_leave' ? 0.25 : 0.0);
            if (!$isSpecialLeave && $score <= 0) {
                continue;
            }

            $key = $requestDate->toDateString();
            $existing = $scores[$key] ?? null;
            if (
                $existing === null
                || ($isSpecialLeave && !(bool) ($existing['is_exempt'] ?? false))
                || ((bool) ($existing['is_exempt'] ?? false) === false && (float) $existing['score'] < $score)
            ) {
                $scores[$key] = [
                    'score' => $score,
                    'source' => $isSpecialLeave
                        ? 'approved_special_leave'
                        : ($request->leave_type === 'half_day' ? 'approved_half_day' : 'approved_short_leave'),
                    'is_exempt' => $isSpecialLeave,
                ];
            }
        }

        return $scores;
    }

    private function leaveBreakdownForRange(User $staff, Carbon $start, Carbon $end): array
    {
        if ($start->gt($end)) {
            return [];
        }

        $attendanceByDate = Attendance::where('staff_id', $staff->id)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get()
            ->keyBy(fn ($a) => Carbon::parse($a->date)->toDateString());

        $companyLeaveByDate = $this->branchCompanyLeaveDatesForRange($staff, $start, $end);
        $leaveScoreByDate = $this->leaveScoreByDate($staff, $start, $end);
        $rows = [];

        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            $key = $cursor->toDateString();
            if ($cursor->isSunday()) {
                $cursor->addDay();
                continue;
            }

            if (isset($companyLeaveByDate[$key])) {
                $cursor->addDay();
                continue;
            }

            $attendance = $attendanceByDate->get($key);
            if ((bool) ($attendance?->is_company_leave ?? false)) {
                $cursor->addDay();
                continue;
            }

            if ((bool) ($leaveScoreByDate[$key]['is_exempt'] ?? false)) {
                $cursor->addDay();
                continue;
            }

            $leaveValue = 0.0;
            $source = null;
            if ($attendance === null) {
                // If attendance is not marked, count as full-day leave regardless of leave request type.
                $leaveValue = 1.0;
                $source = 'missing_attendance';
            } elseif (array_key_exists($key, $leaveScoreByDate)) {
                // Partial leave applies only when attendance exists.
                $leaveValue = (float) ($leaveScoreByDate[$key]['score'] ?? 0);
                $source = (string) ($leaveScoreByDate[$key]['source'] ?? '');
            }

            if ($leaveValue > 0) {
                $rows[] = [
                    'date' => $key,
                    'leave_value' => round($leaveValue, 2),
                    'source' => $source,
                    'attendance_marked' => $attendance !== null,
                ];
            }

            $cursor->addDay();
        }

        return $rows;
    }

    private function branchCompanyLeaveDatesForRange(User $staff, Carbon $start, Carbon $end): array
    {
        if ($start->gt($end)) {
            return [];
        }

        $today = Carbon::today();
        $branchStaffIds = User::query()
            ->where('role', 'staff')
            ->where('branch', $staff->branch)
            ->pluck('id');

        if ($branchStaffIds->isEmpty()) {
            return [];
        }

        $attendanceDates = Attendance::query()
            ->whereIn('staff_id', $branchStaffIds)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->select('date')
            ->distinct()
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $companyLeave = [];
        $cursor = $start->copy();
        while ($cursor->lte($end)) {
            if (!$cursor->isSunday() && $cursor->lt($today)) {
                $key = $cursor->toDateString();
                if (!$attendanceDates->has($key)) {
                    $companyLeave[$key] = true;
                }
            }
            $cursor->addDay();
        }

        return $companyLeave;
    }

    private function ruleBasedLeaveDaysForRange(User $staff, Carbon $start, Carbon $end): float
    {
        $rows = $this->leaveBreakdownForRange($staff, $start, $end);
        $total = collect($rows)->sum('leave_value');
        return round((float) $total, 2);
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

        return (int) ceil($this->ruleBasedLeaveDaysForRange($staff, $start, $end));
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
            $missingDays = $this->missingAttendanceLeaveDays($staff);
            $effectiveInternEndDate = null;
            if (($staff->employment_type ?? 'permanent') === 'intern' && $staff->intern_end_date) {
                $effectiveInternEndDate = Carbon::parse($staff->intern_end_date)->addDays($this->internAutoLeaveDays($staff))->toDateString();
            }
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
                'intern_end_date' => $effectiveInternEndDate ?? $staff->intern_end_date?->toDateString(),
                'intern_end_date_base' => $staff->intern_end_date?->toDateString(),
                'attended_days' => $attendedDays,
                'leave_days' => $missingDays,
                'leave_days_auto' => $missingDays,
                'leave_count' => $missingDays,
                'leave_count_manual' => $staff->leave_count,
            ];
        })->values();

        return response()->json($rows);
    }

    public function leaveDetails(Request $request, User $user)
    {
        abort_unless(in_array($request->user()->role, ['staff', 'attender', 'boss'], true), 403);
        abort_unless($user->role === 'staff', 422, 'Selected user is not staff');

        if ($request->user()->role === 'staff' && $request->user()->id !== $user->id) {
            abort(403);
        }

        if ($request->user()->role === 'attender' && $request->user()->branch !== $user->branch) {
            abort(403);
        }

        $start = Carbon::parse($user->joining_date ?? now()->toDateString())->startOfDay();
        $today = Carbon::today();
        $rows = $start->gt($today) ? [] : $this->leaveBreakdownForRange($user, $start, $today);
        $total = collect($rows)->sum('leave_value');

        return response()->json([
            'staff_id' => $user->id,
            'name' => $user->name,
            'office_id' => $user->office_id,
            'branch' => $user->branch,
            'from_date' => $start->toDateString(),
            'to_date' => $today->toDateString(),
            'total_leave_days' => round((float) $total, 2),
            'rows' => $rows,
        ]);
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
                $effectiveEndDate = $effectiveEndDate->addDays($this->internAutoLeaveDays($staff));
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
