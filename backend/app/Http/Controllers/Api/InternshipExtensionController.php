<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\InternshipExtensionRequest;
use App\Models\LeaveRequest;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InternshipExtensionController extends Controller
{
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
                                    'is_exempt' => true,
                                ];
                            } else {
                                $existing = $scores[$key] ?? null;
                                if ($existing === null || (!(bool) ($existing['is_exempt'] ?? false) && (float) ($existing['score'] ?? 0) < 1.0)) {
                                    $scores[$key] = [
                                        'score' => 1.0,
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
                    'is_exempt' => $isSpecialLeave,
                ];
            }
        }

        return $scores;
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
        if ($start->gt($end)) {
            return 0;
        }

        $attendanceByDate = Attendance::where('staff_id', $staff->id)
            ->whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->get()
            ->keyBy(fn ($a) => Carbon::parse($a->date)->toDateString());

        $companyLeaveByDate = $this->branchCompanyLeaveDatesForRange($staff, $start, $end);
        $leaveScoreByDate = $this->leaveScoreByDate($staff, $start, $end);
        $total = 0.0;
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

            if ($attendance === null) {
                $total += 1.0;
            } elseif (array_key_exists($key, $leaveScoreByDate)) {
                $total += (float) ($leaveScoreByDate[$key]['score'] ?? 0);
            }

            $cursor->addDay();
        }

        return round($total, 2);
    }

    private function internAutoLeaveDays(User $staff): int
    {
        if (($staff->employment_type ?? 'permanent') !== 'intern') {
            return 0;
        }

        $start = Carbon::parse($staff->intern_start_date ?? $staff->joining_date ?? now()->toDateString())->startOfDay();
        $end = Carbon::parse($staff->intern_end_date ?? now()->toDateString())->startOfDay();
        $today = Carbon::today();
        if ($end->gt($today)) {
            $end = $today;
        }
        if ($start->gt($end)) {
            return 0;
        }

        return (int) ceil($this->ruleBasedLeaveDaysForRange($staff, $start, $end));
    }

    public function myStatus(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);
        $staff = $request->user();

        if (($staff->employment_type ?? 'permanent') !== 'intern' || !$staff->intern_end_date) {
            return response()->json([
                'is_intern' => false,
                'should_prompt' => false,
            ]);
        }

        $today = Carbon::today('Asia/Colombo');
        $actualEnd = Carbon::parse($staff->intern_end_date)->startOfDay();
        $extendedEnd = $actualEnd->copy()->addDays($this->internAutoLeaveDays($staff));
        $daysLeft = $today->diffInDays($extendedEnd, false);

        $pendingRequest = InternshipExtensionRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'pending')
            ->latest('id')
            ->first();

        return response()->json([
            'is_intern' => true,
            'actual_intern_end_date' => $actualEnd->toDateString(),
            'extended_intern_end_date' => $extendedEnd->toDateString(),
            'days_left' => $daysLeft,
            'has_pending_request' => (bool) $pendingRequest,
            'pending_request' => $pendingRequest ? [
                'id' => $pendingRequest->id,
                'requested_days' => $pendingRequest->requested_days,
                'requested_intern_end_date' => $pendingRequest->requested_intern_end_date?->toDateString(),
                'status' => $pendingRequest->status,
            ] : null,
            'should_prompt' => $daysLeft === 1 && !$pendingRequest,
        ]);
    }

    public function create(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);
        $staff = $request->user();
        abort_unless(($staff->employment_type ?? 'permanent') === 'intern' && $staff->intern_end_date, 422, 'Only intern staff can request extension.');

        $validated = $request->validate([
            'extend_days' => ['required', 'integer', 'min:1', 'max:365'],
        ]);

        $pendingExists = InternshipExtensionRequest::query()
            ->where('staff_id', $staff->id)
            ->where('status', 'pending')
            ->exists();
        if ($pendingExists) {
            return response()->json(['message' => 'You already have a pending extension request.'], 422);
        }

        $today = Carbon::today('Asia/Colombo');
        $actualEnd = Carbon::parse($staff->intern_end_date)->startOfDay();
        $extendedEnd = $actualEnd->copy()->addDays($this->internAutoLeaveDays($staff));
        $daysLeft = $today->diffInDays($extendedEnd, false);
        if ($daysLeft !== 1) {
            return response()->json(['message' => 'Extension request allowed only one day before extended internship period finish.'], 422);
        }

        $extendDays = (int) $validated['extend_days'];
        $requestedEnd = $extendedEnd->copy()->addDays($extendDays);

        $row = InternshipExtensionRequest::create([
            'staff_id' => $staff->id,
            'requested_days' => $extendDays,
            'current_intern_end_date' => $extendedEnd->toDateString(),
            'requested_intern_end_date' => $requestedEnd->toDateString(),
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Internship extension request submitted for boss approval.',
            'request' => [
                'id' => $row->id,
                'staff_id' => $row->staff_id,
                'requested_days' => $row->requested_days,
                'current_intern_end_date' => $row->current_intern_end_date?->toDateString(),
                'requested_intern_end_date' => $row->requested_intern_end_date?->toDateString(),
                'status' => $row->status,
            ],
        ], 201);
    }

    public function listForBoss(Request $request)
    {
        abort_unless($request->user()->role === 'boss', 403);

        $query = InternshipExtensionRequest::query()
            ->with(['staff:id,name,office_id,branch,intern_end_date', 'reviewer:id,name,office_id'])
            ->orderByDesc('id');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $rows = $query->get()->map(fn (InternshipExtensionRequest $row) => [
            'id' => $row->id,
            'status' => $row->status,
            'staff' => [
                'id' => $row->staff?->id,
                'name' => $row->staff?->name,
                'office_id' => $row->staff?->office_id,
                'branch' => $row->staff?->branch,
            ],
            'requested_days' => $row->requested_days,
            'current_intern_end_date' => $row->current_intern_end_date?->toDateString(),
            'requested_intern_end_date' => $row->requested_intern_end_date?->toDateString(),
            'rejection_reason' => $row->rejection_reason,
            'reviewed_at' => optional($row->reviewed_at)?->toDateTimeString(),
            'reviewer' => [
                'id' => $row->reviewer?->id,
                'name' => $row->reviewer?->name,
                'office_id' => $row->reviewer?->office_id,
            ],
            'created_at' => optional($row->created_at)?->toDateTimeString(),
        ])->values();

        $pendingCount = InternshipExtensionRequest::query()->where('status', 'pending')->count();

        return response()->json([
            'pending_count' => $pendingCount,
            'rows' => $rows,
        ]);
    }

    public function decide(Request $request, InternshipExtensionRequest $extensionRequest)
    {
        abort_unless($request->user()->role === 'boss', 403);
        abort_unless($extensionRequest->status === 'pending', 422, 'This request is already processed.');

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $approved = $validated['status'] === 'approved';

        DB::transaction(function () use ($request, $extensionRequest, $validated, $approved) {
            if ($approved) {
                $staff = User::query()->findOrFail($extensionRequest->staff_id);
                $staff->update([
                    'intern_end_date' => $extensionRequest->requested_intern_end_date,
                    // Reset auto-extension carryover so actual and extended are aligned after approval.
                    'intern_start_date' => $extensionRequest->requested_intern_end_date,
                ]);
            }

            $extensionRequest->update([
                'status' => $validated['status'],
                'rejection_reason' => $approved ? null : (isset($validated['rejection_reason']) ? trim((string) $validated['rejection_reason']) : null),
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
        });

        return response()->json([
            'message' => $approved ? 'Internship extension approved.' : 'Internship extension rejected.',
            'id' => $extensionRequest->id,
            'status' => $validated['status'],
        ]);
    }
}
