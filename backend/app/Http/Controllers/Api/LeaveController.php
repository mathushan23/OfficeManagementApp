<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveRequest;
use App\Services\LeaveDateService;
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
            'reason' => ['nullable', 'string'],
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
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->orderByDesc('start_date')->limit(200)->get());
    }

    public function decide(Request $request, LeaveRequest $leaveRequest)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $leaveRequest->update([
            'status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'decision_at' => now(),
        ]);

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

        $today = now()->toDateString();
        return response()->json(
            LeaveRequest::with('staff:id,name,office_id,branch')
                ->whereDate('start_date', '>=', $today)
                ->orderBy('start_date')
                ->get()
        );
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
}
