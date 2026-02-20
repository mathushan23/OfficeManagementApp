<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AttendanceController extends Controller
{
    private function applyStaffScope($query, Request $request, string $table = 'users')
    {
        return $query->where("{$table}.role", 'staff')
            ->when($request->user()->role === 'attender', function ($q) use ($request, $table) {
                $q->where("{$table}.branch", $request->user()->branch);
            });
    }

    private function isCompanyLeaveDay(Request $request, string $targetDate): bool
    {
        $staffQuery = User::query();
        $this->applyStaffScope($staffQuery, $request, 'users');
        $staffIds = $staffQuery->pluck('users.id');
        if ($staffIds->isEmpty()) {
            return false;
        }

        $attendanceCount = Attendance::whereIn('staff_id', $staffIds)
            ->whereDate('date', $targetDate)
            ->count();

        return $attendanceCount === 0;
    }

    public function companyLeaveDays(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);

        $validated = $request->validate([
            'from_date' => ['required', 'date'],
            'to_date' => ['required', 'date', 'after_or_equal:from_date'],
            'today_date' => ['nullable', 'date'],
        ]);

        $from = Carbon::parse($validated['from_date'])->startOfDay();
        $to = Carbon::parse($validated['to_date'])->startOfDay();

        $staffQuery = User::query();
        $this->applyStaffScope($staffQuery, $request, 'users');
        $staffIds = $staffQuery->pluck('users.id');
        if ($staffIds->isEmpty()) {
            return response()->json([]);
        }

        $attendanceDates = Attendance::whereIn('staff_id', $staffIds)
            ->whereDate('date', '>=', $from->toDateString())
            ->whereDate('date', '<=', $to->toDateString())
            ->select('date')
            ->distinct()
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        $companyLeaveDates = [];
        $today = Carbon::parse($validated['today_date'] ?? now()->toDateString())->startOfDay();
        $cursor = $from->copy();
        while ($cursor->lte($to)) {
            if (!$cursor->isSunday() && $cursor->lt($today)) {
                $key = $cursor->toDateString();
                if (!$attendanceDates->has($key)) {
                    $companyLeaveDates[] = $key;
                }
            }
            $cursor->addDay();
        }

        return response()->json($companyLeaveDates);
    }

    private function decorateCompanyLeaveRows(Collection $rows, bool $companyLeaveDay): Collection
    {
        if (!$companyLeaveDay) {
            return $rows;
        }

        return $rows->map(function ($row) {
            $row->is_company_leave = true;
            return $row;
        });
    }

    private function canAttenderManageStaff(Request $request, int $staffId): bool
    {
        if ($request->user()->role !== 'attender') {
            return true;
        }

        return User::whereKey($staffId)->where('branch', $request->user()->branch)->exists();
    }

    public function details(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);

        $validated = $request->validate([
            'date' => ['nullable', 'date'],
        ]);

        $targetDate = $validated['date'] ?? now()->toDateString();

        $query = DB::table('users')
            ->leftJoin('attendance as a', function ($join) use ($targetDate) {
                $join->on('users.id', '=', 'a.staff_id')
                    ->whereDate('a.date', '=', $targetDate);
            })
            ->leftJoin('task_logs as t', function ($join) use ($targetDate) {
                $join->on('users.id', '=', 't.staff_id')
                    ->whereDate('t.log_date', '=', $targetDate);
            });

        $this->applyStaffScope($query, $request, 'users');

        $rows = $query
            ->select([
                'users.id as staff_id',
                'users.name as staff_name',
                'users.office_id',
                'users.branch',
                'users.status as staff_status',
                'a.id as attendance_id',
                DB::raw("'" . $targetDate . "' as date"),
                'a.in_time',
                'a.out_time',
                'a.is_company_leave',
                DB::raw('CASE WHEN t.id IS NULL THEN 0 ELSE 1 END as tasklog_submitted'),
                't.id as tasklog_id',
            ])
            ->orderBy('users.name')
            ->get();

        $companyLeaveDay = $this->isCompanyLeaveDay($request, $targetDate);
        $rows = $this->decorateCompanyLeaveRows($rows, $companyLeaveDay);

        return response()->json($rows);
    }

    public function myTodayStatus(Request $request)
    {
        abort_unless($request->user()->role === 'staff', 403);

        $today = now()->toDateString();
        $row = Attendance::where('staff_id', $request->user()->id)
            ->whereDate('date', $today)
            ->first();

        return response()->json([
            'date' => $today,
            'attendance_marked' => $row !== null,
            'in_time' => $row?->in_time,
            'out_time' => $row?->out_time,
        ]);
    }

    public function staffDetails(Request $request, User $user)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);
        abort_unless($user->role === 'staff', 422, 'Selected user is not staff');
        abort_unless($request->user()->role !== 'attender' || $user->branch === $request->user()->branch, 403);

        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date' => ['nullable', 'date'],
        ]);

        $query = DB::table('attendance as a')
            ->leftJoin('task_logs as t', function ($join) {
                $join->on('a.staff_id', '=', 't.staff_id')
                    ->on('a.date', '=', 't.log_date');
            })
            ->where('a.staff_id', $user->id)
            ->select([
                'a.id as attendance_id',
                'a.date',
                'a.in_time',
                'a.out_time',
                'a.is_company_leave',
                DB::raw('CASE WHEN t.id IS NULL THEN 0 ELSE 1 END as tasklog_submitted'),
                't.id as tasklog_id',
            ]);

        if (!empty($validated['from_date'])) {
            $query->whereDate('a.date', '>=', $validated['from_date']);
        }

        if (!empty($validated['to_date'])) {
            $query->whereDate('a.date', '<=', $validated['to_date']);
        }

        $rows = $query->orderByDesc('a.date')->get();

        return response()->json([
            'staff' => [
                'id' => $user->id,
                'name' => $user->name,
                'office_id' => $user->office_id,
                'branch' => $user->branch,
            ],
            'rows' => $rows,
        ]);
    }

    private function normalizeTime(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Accept both HH:mm and HH:mm:ss and persist as HH:mm.
        return substr($value, 0, 5);
    }

    public function index(Request $request)
    {
        abort_unless(in_array($request->user()->role, ['attender', 'boss'], true), 403);

        $query = Attendance::with('staff:id,name,office_id')->orderByDesc('date');

        if ($request->user()->role === 'attender') {
            $query->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', $request->integer('staff_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('date', '>=', $request->string('from_date'));
        }

        if ($request->filled('to_date')) {
            $query->whereDate('date', '<=', $request->string('to_date'));
        }

        return response()->json($query->limit(100)->get());
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->role === 'attender', 403);

        $today = now()->toDateString();

        $validated = $request->validate([
            'staff_id' => [
                'required',
                'exists:users,id',
                Rule::unique('attendance')->where(fn ($query) => $query->whereDate('date', $today)),
            ],
            'in_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'out_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        ], [
            'staff_id.unique' => 'Attendance is already marked for this staff today.',
        ]);

        if (!$this->canAttenderManageStaff($request, (int) $validated['staff_id'])) {
            return response()->json(['message' => 'You can mark attendance only for your branch staff'], 403);
        }

        $attendance = Attendance::create([
            ...$validated,
            'date' => $today,
            'in_time' => $this->normalizeTime($validated['in_time'] ?? null),
            'out_time' => $this->normalizeTime($validated['out_time'] ?? null),
            'is_company_leave' => false,
            'marked_by' => $request->user()->id,
        ]);

        return response()->json($attendance->load('staff:id,name,office_id'), 201);
    }

    public function update(Request $request, Attendance $attendance)
    {
        abort_unless($request->user()->role === 'attender', 403);
        abort_unless($this->canAttenderManageStaff($request, (int) $attendance->staff_id), 403);

        $date = Carbon::parse($attendance->date)->startOfDay();
        $cutoff = now()->subDays(5)->startOfDay();

        if ($date->lt($cutoff)) {
            return response()->json(['message' => 'Edit window (5 days) expired'], 422);
        }

        $validated = $request->validate([
            'in_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'out_time' => ['nullable', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        ]);

        $attendance->update([
            'in_time' => $this->normalizeTime($validated['in_time'] ?? null),
            'out_time' => $this->normalizeTime($validated['out_time'] ?? null),
            'is_company_leave' => false,
        ]);
        return response()->json($attendance);
    }
}
