<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\TaskLog;
use App\Models\TaskLogEntry;
use App\Models\TaskLogLatePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TaskLogController extends Controller
{
    private function ensureAttenderBranch(Request $request, int $staffId): void
    {
        if ($request->user()->role !== 'attender') {
            return;
        }
        abort_unless(User::whereKey($staffId)->where('branch', $request->user()->branch)->exists(), 403);
    }

    public function index(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);
        return response()->json(
            TaskLog::with(['staff:id,name,office_id,branch', 'entries.proofs'])
                ->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch))
                ->orderByDesc('log_date')
                ->limit(200)
                ->get()
        );
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:3'],
            'entries.*.start_time' => ['required', 'date_format:H:i'],
            'entries.*.end_time' => ['required', 'date_format:H:i'],
            'entries.*.project_name' => ['required', 'string'],
            'entries.*.description' => ['required', 'string'],
            'entries.*.proofs' => ['nullable', 'array'],
            'entries.*.proofs.*' => ['string'],
            'log_date' => ['nullable', 'date'],
        ]);

        $today = now()->toDateString();
        $targetDate = $validated['log_date'] ?? $today;
        $isLateSubmission = $targetDate !== $today;

        if ($targetDate > $today) {
            return response()->json(['message' => 'Future date is not allowed'], 422);
        }

        if ($targetDate === $today) {
            $attendanceExists = Attendance::where('staff_id', $request->user()->id)
                ->whereDate('date', $today)
                ->exists();
            if (!$attendanceExists) {
                return response()->json(['message' => 'Today attendance must be marked before submitting today tasklog'], 422);
            }
        }

        $latePermission = null;

        if ($isLateSubmission) {
            $latePermission = TaskLogLatePermission::where('staff_id', $request->user()->id)
                ->whereDate('log_date', $targetDate)
                ->where('status', 'approved')
                ->whereNull('consumed_at')
                ->first();

            if (!$latePermission) {
                return response()->json(['message' => 'Late submission not approved for this date'], 422);
            }
        }

        if (TaskLog::where('staff_id', $request->user()->id)->whereDate('log_date', $targetDate)->exists()) {
            return response()->json(['message' => 'Task log already submitted for this date'], 422);
        }

        $payloadEntries = $validated['entries'];
        unset($validated['entries']);

        for ($i = 0; $i < count($payloadEntries); $i++) {
            $entry = $payloadEntries[$i];
            if ($entry['end_time'] <= $entry['start_time']) {
                return response()->json(['message' => 'Each entry end time must be later than start time'], 422);
            }
            if ($i > 0 && $entry['start_time'] !== $payloadEntries[$i - 1]['end_time']) {
                return response()->json(['message' => 'Each next entry start time must match previous entry end time'], 422);
            }
        }

        $log = DB::transaction(function () use ($request, $targetDate, $isLateSubmission, $latePermission, $payloadEntries) {
            $log = TaskLog::create([
                'staff_id' => $request->user()->id,
                'log_date' => $targetDate,
                'submitted' => true,
                'attender_override_approved' => $isLateSubmission,
                'approved_by' => $latePermission?->approved_by,
            ]);

            foreach ($payloadEntries as $entryPayload) {
                $entry = TaskLogEntry::create([
                    'task_log_id' => $log->id,
                    'start_time' => $entryPayload['start_time'],
                    'end_time' => $entryPayload['end_time'],
                    'project_name' => $entryPayload['project_name'],
                    'description' => $entryPayload['description'],
                ]);

                foreach (($entryPayload['proofs'] ?? []) as $proofPath) {
                    $entry->proofs()->create(['image_path' => $proofPath]);
                }
            }

            if ($latePermission) {
                $latePermission->update(['consumed_at' => now()]);
            }

            return $log->load('entries.proofs');
        });

        return response()->json($log, 201);
    }

    public function uploadProof(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $validated = $request->validate([
            'image' => ['required', 'image', 'max:4096'],
        ]);

        $path = $this->storePublicImage($validated['image'], 'tasklog-proofs');
        $appUrl = rtrim((string) config('app.url', ''), '/');
        $url = $appUrl !== '' ? "{$appUrl}/{$path}" : "/{$path}";

        return response()->json([
            'path' => $path,
            'url' => $url,
        ], 201);
    }

    private function storePublicImage($file, string $folder): string
    {
        $targetDir = public_path($folder);
        if (!is_dir($targetDir)) {
            @mkdir($targetDir, 0755, true);
        }

        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext === '') {
            $ext = strtolower((string) $file->extension());
        }
        if ($ext === '') {
            $ext = 'jpg';
        }

        $filename = Str::random(40) . '.' . $ext;
        $file->move($targetDir, $filename);

        return $folder . '/' . $filename;
    }

    public function allowLateSubmit(Request $request, TaskLog $taskLog)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $taskLog->update([
            'attender_override_approved' => true,
            'approved_by' => $request->user()->id,
        ]);

        return response()->json($taskLog);
    }

    public function missingLogs(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $today = now()->toDateString();
        $currentTime = now()->format('H:i:s');

        $rows = Attendance::query()
            ->leftJoin('task_logs', function ($join) {
                $join->on('attendance.staff_id', '=', 'task_logs.staff_id')
                    ->on('attendance.date', '=', 'task_logs.log_date');
            })
            ->join('users', 'users.id', '=', 'attendance.staff_id')
            ->where('users.branch', $request->user()->branch)
            ->where(function ($q) use ($today, $currentTime) {
                // Show only after day is finished:
                // 1) Any past date, or
                // 2) Today only when out_time is set and current time is beyond out_time.
                $q->whereDate('attendance.date', '<', $today)
                    ->orWhere(function ($todayQuery) use ($today, $currentTime) {
                        $todayQuery->whereDate('attendance.date', '=', $today)
                            ->whereNotNull('attendance.out_time')
                            ->whereRaw('TIME(attendance.out_time) <= ?', [$currentTime]);
                    });
            })
            ->whereNull('task_logs.id')
            ->select([
                'attendance.staff_id',
                'users.name as staff_name',
                'users.office_id',
                'attendance.date',
                'attendance.in_time',
                'attendance.out_time',
            ])
            ->orderByDesc('attendance.date')
            ->limit(200)
            ->get();

        return response()->json($rows);
    }

    public function myMissedLogs(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $today = now()->toDateString();
        $currentTime = now()->format('H:i:s');

        $rows = Attendance::query()
            ->leftJoin('task_logs', function ($join) {
                $join->on('attendance.staff_id', '=', 'task_logs.staff_id')
                    ->on('attendance.date', '=', 'task_logs.log_date');
            })
            ->leftJoin('task_log_late_permissions as p', function ($join) {
                $join->on('attendance.staff_id', '=', 'p.staff_id')
                    ->on('attendance.date', '=', 'p.log_date');
            })
            ->where('attendance.staff_id', $request->user()->id)
            ->where(function ($q) use ($today, $currentTime) {
                $q->whereDate('attendance.date', '<', $today)
                    ->orWhere(function ($todayQuery) use ($today, $currentTime) {
                        $todayQuery->whereDate('attendance.date', '=', $today)
                            ->whereNotNull('attendance.out_time')
                            ->whereRaw('TIME(attendance.out_time) <= ?', [$currentTime]);
                    });
            })
            ->whereNull('task_logs.id')
            ->select([
                'attendance.date as log_date',
                'attendance.in_time',
                'attendance.out_time',
                'p.id as request_id',
                'p.status as request_status',
            ])
            ->orderByDesc('attendance.date')
            ->get();

        return response()->json($rows);
    }

    public function requestLateApproval(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $validated = $request->validate([
            'log_date' => ['required', 'date'],
        ]);

        $logDate = $validated['log_date'];
        $today = now()->toDateString();

        if ($logDate > $today) {
            return response()->json(['message' => 'Future date is not allowed'], 422);
        }

        $attendance = Attendance::where('staff_id', $request->user()->id)
            ->whereDate('date', $logDate)
            ->first();
        if (!$attendance) {
            return response()->json(['message' => 'No attendance found for selected date'], 422);
        }

        if (TaskLog::where('staff_id', $request->user()->id)->whereDate('log_date', $logDate)->exists()) {
            return response()->json(['message' => 'Tasklog already submitted for selected date'], 422);
        }

        $permission = TaskLogLatePermission::updateOrCreate(
            [
                'staff_id' => $request->user()->id,
                'log_date' => $logDate,
            ],
            [
                'status' => 'pending',
                'approved_by' => null,
                'decision_at' => null,
                'consumed_at' => null,
            ]
        );

        return response()->json($permission, 201);
    }

    public function lateRequests(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $validated = $request->validate([
            'status' => ['nullable', 'in:pending,approved,rejected'],
        ]);
        $status = $validated['status'] ?? null;

        $rows = TaskLogLatePermission::query()
            ->join('users', 'users.id', '=', 'task_log_late_permissions.staff_id')
            ->leftJoin('users as approver', 'approver.id', '=', 'task_log_late_permissions.approved_by')
            ->leftJoin('attendance', function ($join) {
                $join->on('attendance.staff_id', '=', 'task_log_late_permissions.staff_id')
                    ->on('attendance.date', '=', 'task_log_late_permissions.log_date');
            })
            ->when($status, fn ($q) => $q->where('task_log_late_permissions.status', $status), fn ($q) => $q->where('task_log_late_permissions.status', 'pending'))
            ->where('users.branch', $request->user()->branch)
            ->select([
                'task_log_late_permissions.id',
                'task_log_late_permissions.staff_id',
                'users.name as staff_name',
                'users.office_id',
                'task_log_late_permissions.log_date',
                'task_log_late_permissions.status',
                'attendance.in_time',
                'attendance.out_time',
                'task_log_late_permissions.created_at as requested_at',
                'task_log_late_permissions.decision_at',
                'approver.name as approved_by_name',
            ])
            ->orderByDesc('task_log_late_permissions.created_at')
            ->get();

        return response()->json($rows);
    }

    public function decideLateRequest(Request $request, TaskLogLatePermission $permission)
    {
        abort_unless($request->user()->role === 'attender', 403);
        $this->ensureAttenderBranch($request, (int) $permission->staff_id);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $permission->update([
            'status' => $validated['status'],
            'approved_by' => $request->user()->id,
            'decision_at' => now(),
            'consumed_at' => null,
        ]);

        return response()->json($permission);
    }

    public function createLatePermission(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $validated = $request->validate([
            'staff_id' => ['required', 'exists:users,id'],
            'log_date' => ['required', 'date'],
        ]);

        $today = now()->toDateString();
        if ($validated['log_date'] > $today) {
            return response()->json(['message' => 'Only past/today dates are allowed'], 422);
        }

        $this->ensureAttenderBranch($request, (int) $validated['staff_id']);

        $attendanceFound = Attendance::where('staff_id', $validated['staff_id'])
            ->whereDate('date', $validated['log_date'])
            ->exists();

        if (!$attendanceFound) {
            return response()->json(['message' => 'No attendance found for this staff and date'], 422);
        }

        $permission = TaskLogLatePermission::updateOrCreate(
            [
                'staff_id' => $validated['staff_id'],
                'log_date' => $validated['log_date'],
            ],
            [
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'decision_at' => now(),
                'consumed_at' => null,
            ]
        );

        return response()->json($permission, 201);
    }

    public function myLatePermissions(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        return response()->json(
            TaskLogLatePermission::where('staff_id', $request->user()->id)
                ->where('status', 'approved')
                ->whereNull('consumed_at')
                ->orderBy('log_date')
                ->get()
        );
    }

    public function myHistory(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $query = TaskLog::with('entries.proofs')->where('staff_id', $request->user()->id);

        if ($request->filled('from_date')) {
            $query->whereDate('log_date', '>=', $request->string('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('log_date', '<=', $request->string('to_date'));
        }

        return response()->json($query->orderByDesc('log_date')->get());
    }

    public function historyForStaff(Request $request, int $user)
    {
        abort_unless(in_array($request->user()->role, ['boss', 'attender'], true), 403);
        $this->ensureAttenderBranch($request, $user);

        $query = TaskLog::with('entries.proofs')->where('staff_id', $user);

        if ($request->filled('from_date')) {
            $query->whereDate('log_date', '>=', $request->string('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('log_date', '<=', $request->string('to_date'));
        }

        return response()->json($query->orderByDesc('log_date')->get());
    }
}
