<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectAssignment;
use App\Models\ProjectCredential;
use App\Models\ProjectSubmission;
use App\Models\ProjectTask;
use App\Models\ProjectTaskSubtask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectController extends Controller
{
    private function assertRole(Request $request, array $roles): void
    {
        abort_unless(in_array($request->user()->role, $roles, true), 403);
    }

    private function ensureAttenderBranch(Request $request, User $staff): void
    {
        if ($request->user()->role !== 'attender') {
            return;
        }

        abort_unless($staff->branch === $request->user()->branch, 403);
    }

    private function ensureCanAccessAssignment(Request $request, ProjectAssignment $assignment): void
    {
        if ($request->user()->role === 'boss') {
            return;
        }

        if ($request->user()->role === 'attender') {
            abort_unless($assignment->staff?->branch === $request->user()->branch, 403);
            return;
        }

        abort_unless($request->user()->role === 'staff' && $assignment->staff_id === $request->user()->id, 403);
    }

    private function ensureCanAccessTask(Request $request, ProjectTask $task): void
    {
        $task->loadMissing('assignment.staff');
        $this->ensureCanAccessAssignment($request, $task->assignment);
    }

    private function serializeAssignment(ProjectAssignment $assignment, bool $hideCommission = false): array
    {
        $project = $assignment->project;
        $staff = $assignment->staff;

        $data = [
            'id' => $assignment->id,
            'status' => $assignment->status,
            'deadline_at' => optional($assignment->deadline_at)?->toDateTimeString(),
            'submitted_at' => optional($assignment->submitted_at)?->toDateTimeString(),
            'completed_at' => optional($assignment->completed_at)?->toDateTimeString(),
            'project' => [
                'id' => $project?->id,
                'name' => $project?->name,
                'description' => $project?->description,
                'status' => $project?->status,
            ],
            'staff' => [
                'id' => $staff?->id,
                'name' => $staff?->name,
                'office_id' => $staff?->office_id,
                'branch' => $staff?->branch,
            ],
            'task_counts' => [
                'total' => $assignment->tasks->count(),
                'pending' => $assignment->tasks->where('status', 'pending')->count(),
                'completed' => $assignment->tasks->where('status', 'completed')->count(),
            ],
        ];

        if (!$hideCommission) {
            $data['commission_amount'] = $assignment->commission_amount;
        }

        return $data;
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

    private function serializeTask(ProjectTask $task): array
    {
        return [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'plan_date' => $task->plan_date?->toDateString(),
            'in_time' => $task->start_time,
            'estimated_hours' => $task->estimated_hours,
            'status' => $task->status,
            'deadline_at' => optional($task->deadline_at)?->toDateTimeString(),
            'completed_at' => optional($task->completed_at)?->toDateTimeString(),
            'proof_image_path' => $task->proof_image_path,
            'proof_submitted_at' => optional($task->proof_submitted_at)?->toDateTimeString(),
            'project_assignment_id' => $task->project_assignment_id,
            'project' => [
                'id' => $task->assignment?->project?->id,
                'name' => $task->assignment?->project?->name,
            ],
            'staff' => [
                'id' => $task->staff?->id,
                'name' => $task->staff?->name,
                'office_id' => $task->staff?->office_id,
                'branch' => $task->staff?->branch,
            ],
            'is_carry_over' => $task->status !== 'completed'
                && $task->plan_date
                && Carbon::parse($task->plan_date)->lt(Carbon::today('Asia/Colombo')),
            'subtasks' => $task->subtasks->map(fn (ProjectTaskSubtask $sub) => [
                'id' => $sub->id,
                'title' => $sub->title,
                'is_done' => (bool) $sub->is_done,
                'done_at' => optional($sub->done_at)?->toDateTimeString(),
            ])->values(),
        ];
    }

    public function storeProject(Request $request)
    {
        $this->assertRole($request, ['boss']);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $project = Project::create([
            'name' => trim((string) $validated['name']),
            'description' => isset($validated['description']) ? trim((string) $validated['description']) : null,
            'created_by' => $request->user()->id,
            'status' => 'active',
        ]);

        return response()->json($project, 201);
    }

    public function listProjects(Request $request)
    {
        $this->assertRole($request, ['boss', 'attender', 'staff']);

        $query = Project::query()->orderByDesc('id');
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->get());
    }

    public function assignProject(Request $request)
    {
        $this->assertRole($request, ['boss']);

        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'staff_id' => ['required', 'integer', 'exists:users,id'],
            'commission_amount' => ['required', 'numeric', 'min:0'],
            'deadline_at' => ['required', 'date'],
        ]);

        $staff = User::findOrFail((int) $validated['staff_id']);
        if ($staff->role !== 'staff') {
            return response()->json(['message' => 'Selected user is not staff'], 422);
        }

        $assignment = ProjectAssignment::updateOrCreate(
            [
                'project_id' => (int) $validated['project_id'],
                'staff_id' => $staff->id,
            ],
            [
                'commission_amount' => round((float) $validated['commission_amount'], 2),
                'deadline_at' => Carbon::parse($validated['deadline_at']),
                'assigned_by' => $request->user()->id,
                'status' => 'assigned',
                'submitted_at' => null,
                'completed_at' => null,
            ]
        );

        Project::whereKey($assignment->project_id)->update(['status' => 'active']);

        $assignment->load(['project', 'staff', 'tasks']);

        return response()->json($this->serializeAssignment($assignment), 201);
    }

    public function listAssignmentsForBoss(Request $request)
    {
        $this->assertRole($request, ['boss']);

        $rows = ProjectAssignment::query()
            ->with(['project', 'staff:id,name,office_id,branch', 'tasks'])
            ->orderByDesc('id')
            ->get()
            ->map(fn (ProjectAssignment $a) => $this->serializeAssignment($a))
            ->values();

        return response()->json($rows);
    }

    public function listAssignments(Request $request)
    {
        $this->assertRole($request, ['boss', 'attender']);

        $query = ProjectAssignment::query()
            ->with(['project', 'staff:id,name,office_id,branch', 'tasks'])
            ->orderByDesc('id');

        if ($request->user()->role === 'attender') {
            $query->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('staff_id')) {
            $query->where('staff_id', (int) $request->input('staff_id'));
        }

        if ($request->filled('project_id')) {
            $query->where('project_id', (int) $request->input('project_id'));
        }

        $rows = $query->get()->map(fn (ProjectAssignment $a) => $this->serializeAssignment($a))->values();

        return response()->json($rows);
    }

    public function listMyAssignments(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $rows = ProjectAssignment::query()
            ->with(['project', 'staff:id,name,office_id,branch', 'tasks'])
            ->where('staff_id', $request->user()->id)
            ->orderByDesc('deadline_at')
            ->get()
            ->map(fn (ProjectAssignment $a) => $this->serializeAssignment($a, true))
            ->values();

        return response()->json($rows);
    }

    public function showAssignment(Request $request, ProjectAssignment $assignment)
    {
        $assignment->load(['project', 'staff:id,name,office_id,branch', 'tasks.subtasks']);
        $this->ensureCanAccessAssignment($request, $assignment);

        $hideCommission = $request->user()->role === 'staff';
        $data = $this->serializeAssignment($assignment, $hideCommission);
        $data['tasks'] = $assignment->tasks->map(function (ProjectTask $task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'plan_date' => $task->plan_date?->toDateString(),
                'in_time' => $task->start_time,
                'estimated_hours' => $task->estimated_hours,
                'deadline_at' => optional($task->deadline_at)?->toDateTimeString(),
                'status' => $task->status,
                'completed_at' => optional($task->completed_at)?->toDateTimeString(),
                'proof_image_path' => $task->proof_image_path,
                'proof_submitted_at' => optional($task->proof_submitted_at)?->toDateTimeString(),
                'subtasks' => $task->subtasks->map(fn (ProjectTaskSubtask $sub) => [
                    'id' => $sub->id,
                    'title' => $sub->title,
                    'is_done' => (bool) $sub->is_done,
                    'done_at' => optional($sub->done_at)?->toDateTimeString(),
                    'staff_id' => $sub->staff_id,
                ])->values(),
            ];
        })->values();

        return response()->json($data);
    }

    public function createMyTaskPlan(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $validated = $request->validate([
            'entries' => ['required', 'array', 'min:1'],
            'entries.*.date' => ['required', 'date'],
            'entries.*.in_time' => ['required', 'date_format:H:i'],
            'entries.*.project_assignment_id' => ['required', 'integer', 'exists:project_assignments,id'],
            'entries.*.task' => ['required', 'string', 'max:255'],
            'entries.*.estimate_hours' => ['required', 'numeric', 'min:0.25', 'max:24'],
        ]);

        $created = DB::transaction(function () use ($request, $validated) {
            $createdRows = [];

            foreach ($validated['entries'] as $entry) {
                $assignment = ProjectAssignment::with('staff')->findOrFail((int) $entry['project_assignment_id']);
                $this->ensureCanAccessAssignment($request, $assignment);

                if (!in_array($assignment->status, ['assigned', 'in_progress'], true)) {
                    abort(422, 'Task plan can be added only for active assignments');
                }

                $startAt = Carbon::parse($entry['date'] . ' ' . $entry['in_time'], 'Asia/Colombo');
                $deadlineAt = $startAt->copy()->addMinutes((int) round(((float) $entry['estimate_hours']) * 60));

                $task = ProjectTask::create([
                    'project_assignment_id' => $assignment->id,
                    'staff_id' => $request->user()->id,
                    'plan_date' => Carbon::parse($entry['date'])->toDateString(),
                    'start_time' => $entry['in_time'],
                    'estimated_hours' => round((float) $entry['estimate_hours'], 2),
                    'title' => trim((string) $entry['task']),
                    'description' => null,
                    'deadline_at' => $deadlineAt,
                    'status' => 'pending',
                    'completed_at' => null,
                    'proof_image_path' => null,
                    'proof_submitted_at' => null,
                ]);

                if ($assignment->status === 'assigned') {
                    $assignment->update(['status' => 'in_progress']);
                }

                $createdRows[] = [
                    'id' => $task->id,
                    'project_assignment_id' => $task->project_assignment_id,
                    'staff_id' => $task->staff_id,
                    'task' => $task->title,
                    'date' => $task->plan_date?->toDateString(),
                    'in_time' => $task->start_time,
                    'estimate_hours' => $task->estimated_hours,
                    'deadline_at' => optional($task->deadline_at)?->toDateTimeString(),
                    'status' => $task->status,
                ];
            }

            return $createdRows;
        });

        return response()->json([
            'message' => 'Task plans added successfully',
            'entries' => $created,
        ], 201);
    }

    public function listMyTasks(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $query = ProjectTask::query()
            ->with(['assignment.project', 'subtasks'])
            ->where('staff_id', $request->user()->id)
            ->orderByRaw("CASE WHEN status = 'pending' THEN 0 WHEN status = 'in_progress' THEN 1 ELSE 2 END")
            ->orderBy('plan_date')
            ->orderBy('deadline_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $rows = $query->get()->map(fn (ProjectTask $task) => $this->serializeTask($task))->values();

        return response()->json($rows);
    }

    public function todayTaskPlanSummary(Request $request)
    {
        $this->assertRole($request, ['boss', 'attender']);

        $today = Carbon::today('Asia/Colombo')->toDateString();
        $staffQuery = User::query()->where('role', 'staff');
        if ($request->user()->role === 'attender') {
            $staffQuery->where('branch', $request->user()->branch);
        }

        $staffRows = $staffQuery
            ->orderBy('name')
            ->get(['id', 'name', 'office_id', 'branch']);

        $taskQuery = ProjectTask::query()
            ->whereDate('plan_date', $today);
        if ($request->user()->role === 'attender') {
            $taskQuery->whereHas('staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        $tasks = $taskQuery->get(['id', 'staff_id', 'status']);
        $tasksByStaff = $tasks->groupBy('staff_id');

        $rows = $staffRows->map(function (User $staff) use ($tasksByStaff) {
            $staffTasks = $tasksByStaff->get($staff->id, collect());
            return [
                'staff_id' => $staff->id,
                'staff_name' => $staff->name,
                'office_id' => $staff->office_id,
                'branch' => $staff->branch,
                'today_task_counts' => [
                    'total' => $staffTasks->count(),
                    'pending' => $staffTasks->where('status', 'pending')->count(),
                    'in_progress' => $staffTasks->where('status', 'in_progress')->count(),
                    'completed' => $staffTasks->where('status', 'completed')->count(),
                ],
            ];
        })->values();

        return response()->json([
            'date' => $today,
            'rows' => $rows,
        ]);
    }

    public function taskPlanHistoryForStaff(Request $request, User $user)
    {
        $this->assertRole($request, ['boss', 'attender']);
        abort_unless($user->role === 'staff', 422, 'Selected user is not staff');
        $this->ensureAttenderBranch($request, $user);

        $query = ProjectTask::query()
            ->with(['assignment.project', 'subtasks', 'staff:id,name,office_id,branch'])
            ->where('staff_id', $user->id)
            ->orderByDesc('plan_date')
            ->orderByDesc('id');

        if ($request->filled('from_date')) {
            $query->whereDate('plan_date', '>=', $request->string('from_date'));
        }
        if ($request->filled('to_date')) {
            $query->whereDate('plan_date', '<=', $request->string('to_date'));
        }

        $rows = $query->get()->map(fn (ProjectTask $task) => $this->serializeTask($task))->values();

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

    public function markTaskStatus(Request $request, ProjectTask $task)
    {
        $this->assertRole($request, ['staff']);
        $this->ensureCanAccessTask($request, $task);

        $validated = $request->validate([
            'status' => ['required', 'in:pending,in_progress'],
        ]);

        $status = (string) $validated['status'];
        $task->update([
            'status' => $status,
            'completed_at' => null,
            'proof_image_path' => null,
            'proof_submitted_at' => null,
        ]);

        return response()->json($task);
    }

    public function completeTaskWithProof(Request $request, ProjectTask $task)
    {
        $this->assertRole($request, ['staff']);
        $this->ensureCanAccessTask($request, $task);

        $validated = $request->validate([
            'proof_image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:6144'],
        ]);

        $path = $this->storePublicImage($validated['proof_image'], 'project-task-proofs');
        $task->update([
            'status' => 'completed',
            'completed_at' => now(),
            'proof_image_path' => $path,
            'proof_submitted_at' => now(),
        ]);

        return response()->json([
            'id' => $task->id,
            'status' => $task->status,
            'completed_at' => optional($task->completed_at)?->toDateTimeString(),
            'proof_image_path' => $task->proof_image_path,
            'proof_submitted_at' => optional($task->proof_submitted_at)?->toDateTimeString(),
        ]);
    }

    public function addSubtask(Request $request, ProjectTask $task)
    {
        $this->assertRole($request, ['staff']);
        $this->ensureCanAccessTask($request, $task);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
        ]);

        $subtask = ProjectTaskSubtask::create([
            'project_task_id' => $task->id,
            'staff_id' => $request->user()->id,
            'title' => trim((string) $validated['title']),
            'is_done' => false,
            'done_at' => null,
        ]);

        return response()->json($subtask, 201);
    }

    public function updateSubtask(Request $request, ProjectTaskSubtask $subtask)
    {
        $task = $subtask->task()->with('assignment.staff')->firstOrFail();
        $this->assertRole($request, ['staff']);
        $this->ensureCanAccessTask($request, $task);
        abort_unless($subtask->staff_id === $request->user()->id, 403);

        $validated = $request->validate([
            'is_done' => ['required', 'boolean'],
            'title' => ['nullable', 'string', 'max:255'],
        ]);

        $isDone = (bool) $validated['is_done'];
        $updates = [
            'is_done' => $isDone,
            'done_at' => $isDone ? now() : null,
        ];
        if (isset($validated['title'])) {
            $updates['title'] = trim((string) $validated['title']);
        }

        $subtask->update($updates);

        return response()->json($subtask);
    }

    public function addCredential(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $validated = $request->validate([
            'project_assignment_id' => ['required', 'integer', 'exists:project_assignments,id'],
            'app_name' => ['nullable', 'string', 'max:255'],
            'login_url' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ]);

        $assignment = ProjectAssignment::with('staff')->findOrFail((int) $validated['project_assignment_id']);
        $this->ensureCanAccessAssignment($request, $assignment);

        $credential = ProjectCredential::create([
            'project_assignment_id' => $assignment->id,
            'added_by' => $request->user()->id,
            'app_name' => isset($validated['app_name']) ? trim((string) $validated['app_name']) : null,
            'login_url' => trim((string) $validated['login_url']),
            'username' => trim((string) $validated['username']),
            'password_encrypted' => (string) $validated['password'],
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) : null,
        ]);

        return response()->json([
            'id' => $credential->id,
            'project_assignment_id' => $credential->project_assignment_id,
            'app_name' => $credential->app_name,
            'login_url' => $credential->login_url,
            'username' => $credential->username,
            'password' => $credential->password_encrypted,
            'notes' => $credential->notes,
            'added_by' => $credential->added_by,
            'created_at' => optional($credential->created_at)?->toDateTimeString(),
        ], 201);
    }

    public function listCredentials(Request $request)
    {
        $this->assertRole($request, ['boss', 'attender', 'staff']);

        $query = ProjectCredential::query()
            ->with(['assignment.project', 'assignment.staff:id,name,office_id,branch'])
            ->orderByDesc('id');

        if ($request->user()->role === 'staff') {
            $query->whereHas('assignment', fn ($q) => $q->where('staff_id', $request->user()->id));
        } elseif ($request->user()->role === 'attender') {
            $query->whereHas('assignment.staff', fn ($q) => $q->where('branch', $request->user()->branch));
        }

        if ($request->filled('project_assignment_id')) {
            $query->where('project_assignment_id', (int) $request->input('project_assignment_id'));
        }

        $rows = $query->get()->map(function (ProjectCredential $cred) {
            return [
                'id' => $cred->id,
                'project_assignment_id' => $cred->project_assignment_id,
                'project' => [
                    'id' => $cred->assignment?->project?->id,
                    'name' => $cred->assignment?->project?->name,
                ],
                'staff' => [
                    'id' => $cred->assignment?->staff?->id,
                    'name' => $cred->assignment?->staff?->name,
                    'office_id' => $cred->assignment?->staff?->office_id,
                    'branch' => $cred->assignment?->staff?->branch,
                ],
                'app_name' => $cred->app_name,
                'login_url' => $cred->login_url,
                'username' => $cred->username,
                'password' => $cred->password_encrypted,
                'notes' => $cred->notes,
                'created_at' => optional($cred->created_at)?->toDateTimeString(),
            ];
        })->values();

        return response()->json($rows);
    }

    public function submitProject(Request $request, ProjectAssignment $assignment)
    {
        $this->assertRole($request, ['staff']);
        $assignment->load('staff');
        $this->ensureCanAccessAssignment($request, $assignment);

        $validated = $request->validate([
            'login_url' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'documentation_link' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
            'screenshots' => ['required', 'array', 'min:1'],
            'screenshots.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:6144'],
        ]);

        $submission = DB::transaction(function () use ($request, $assignment, $validated) {
            $submission = ProjectSubmission::create([
                'project_assignment_id' => $assignment->id,
                'submitted_by' => $request->user()->id,
                'login_url' => trim((string) $validated['login_url']),
                'username' => trim((string) $validated['username']),
                'password_encrypted' => (string) $validated['password'],
                'documentation_link' => isset($validated['documentation_link']) ? trim((string) $validated['documentation_link']) : null,
                'remarks' => isset($validated['remarks']) ? trim((string) $validated['remarks']) : null,
                'approval_status' => 'pending',
            ]);

            foreach ($request->file('screenshots', []) as $image) {
                $path = $this->storePublicImage($image, 'project-submission-screenshots');
                $submission->screenshots()->create(['image_path' => $path]);
            }

            $assignment->update([
                'status' => 'submitted',
                'submitted_at' => now(),
            ]);

            return $submission->load('screenshots');
        });

        return response()->json([
            'id' => $submission->id,
            'project_assignment_id' => $submission->project_assignment_id,
            'approval_status' => $submission->approval_status,
            'login_url' => $submission->login_url,
            'username' => $submission->username,
            'password' => $submission->password_encrypted,
            'documentation_link' => $submission->documentation_link,
            'remarks' => $submission->remarks,
            'screenshots' => $submission->screenshots->map(fn ($img) => [
                'id' => $img->id,
                'image_path' => $img->image_path,
            ])->values(),
            'created_at' => optional($submission->created_at)?->toDateTimeString(),
        ], 201);
    }

    public function listSubmissions(Request $request)
    {
        $this->assertRole($request, ['boss']);

        $query = ProjectSubmission::query()
            ->with(['assignment.project', 'assignment.staff:id,name,office_id,branch', 'screenshots', 'submitter:id,name,office_id'])
            ->orderByDesc('id');

        if ($request->filled('approval_status')) {
            $query->where('approval_status', $request->string('approval_status'));
        }

        $rows = $query->get()->map(function (ProjectSubmission $row) {
            return [
                'id' => $row->id,
                'approval_status' => $row->approval_status,
                'project_assignment_id' => $row->project_assignment_id,
                'project' => [
                    'id' => $row->assignment?->project?->id,
                    'name' => $row->assignment?->project?->name,
                ],
                'staff' => [
                    'id' => $row->assignment?->staff?->id,
                    'name' => $row->assignment?->staff?->name,
                    'office_id' => $row->assignment?->staff?->office_id,
                    'branch' => $row->assignment?->staff?->branch,
                ],
                'submitted_by' => [
                    'id' => $row->submitter?->id,
                    'name' => $row->submitter?->name,
                    'office_id' => $row->submitter?->office_id,
                ],
                'login_url' => $row->login_url,
                'username' => $row->username,
                'password' => $row->password_encrypted,
                'documentation_link' => $row->documentation_link,
                'remarks' => $row->remarks,
                'rejection_reason' => $row->rejection_reason,
                'reviewed_at' => optional($row->reviewed_at)?->toDateTimeString(),
                'created_at' => optional($row->created_at)?->toDateTimeString(),
                'screenshots' => $row->screenshots->map(fn ($img) => [
                    'id' => $img->id,
                    'image_path' => $img->image_path,
                ])->values(),
            ];
        })->values();

        return response()->json($rows);
    }

    public function myRejectedSubmissions(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $rows = ProjectSubmission::query()
            ->with(['assignment.project', 'assignment.staff:id,name,office_id,branch'])
            ->where('approval_status', 'rejected')
            ->whereHas('assignment', fn ($q) => $q->where('staff_id', $request->user()->id))
            ->orderByDesc('reviewed_at')
            ->orderByDesc('id')
            ->limit(10)
            ->get()
            ->map(function (ProjectSubmission $row) {
                return [
                    'id' => $row->id,
                    'project_assignment_id' => $row->project_assignment_id,
                    'project_name' => $row->assignment?->project?->name,
                    'rejection_reason' => $row->rejection_reason,
                    'reviewed_at' => optional($row->reviewed_at)?->toDateTimeString(),
                ];
            })
            ->values();

        return response()->json($rows);
    }

    public function decideSubmission(Request $request, ProjectSubmission $submission)
    {
        $this->assertRole($request, ['boss']);

        $validated = $request->validate([
            'approval_status' => ['required', 'in:approved,rejected'],
            'rejection_reason' => ['nullable', 'string'],
        ]);

        $assignment = $submission->assignment()->with('project')->firstOrFail();
        $isApproved = $validated['approval_status'] === 'approved';

        DB::transaction(function () use ($request, $validated, $submission, $assignment, $isApproved) {
            $submission->update([
                'approval_status' => $validated['approval_status'],
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $isApproved ? null : (isset($validated['rejection_reason']) ? trim((string) $validated['rejection_reason']) : null),
            ]);

            $assignment->update([
                'status' => $isApproved ? 'completed' : 'assigned',
                'completed_at' => $isApproved ? now() : null,
                'submitted_at' => $isApproved ? $assignment->submitted_at : null,
            ]);

            if ($isApproved) {
                $hasOpenAssignments = ProjectAssignment::query()
                    ->where('project_id', $assignment->project_id)
                    ->where('status', '!=', 'completed')
                    ->exists();

                if (!$hasOpenAssignments) {
                    Project::whereKey($assignment->project_id)->update(['status' => 'completed']);
                }
            }
        });

        return response()->json([
            'message' => $isApproved ? 'Submission approved. Assignment marked complete.' : 'Submission rejected.',
            'submission_id' => $submission->id,
            'assignment_id' => $assignment->id,
            'assignment_status' => $isApproved ? 'completed' : 'assigned',
        ]);
    }

    public function staffNotifications(Request $request)
    {
        $this->assertRole($request, ['staff']);

        $staffId = $request->user()->id;
        $today = Carbon::today('Asia/Colombo');

        $pendingTasks = ProjectTask::query()
            ->with(['assignment.project'])
            ->where('staff_id', $staffId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->orderBy('plan_date')
            ->orderBy('deadline_at')
            ->get()
            ->map(function (ProjectTask $task) {
                $deadline = $task->deadline_at ? Carbon::parse($task->deadline_at) : null;
                return [
                    'task_id' => $task->id,
                    'title' => $task->title,
                    'plan_date' => $task->plan_date?->toDateString(),
                    'in_time' => $task->start_time,
                    'estimated_hours' => $task->estimated_hours,
                    'project_assignment_id' => $task->project_assignment_id,
                    'project_name' => $task->assignment?->project?->name,
                    'status' => $task->status,
                    'deadline_at' => optional($deadline)?->toDateTimeString(),
                    'is_overdue' => $deadline ? $deadline->isPast() : false,
                    'is_carry_over' => $task->plan_date
                        && Carbon::parse($task->plan_date)->lt(Carbon::today('Asia/Colombo')),
                ];
            })
            ->values();

        $deadlineReminders = ProjectAssignment::query()
            ->with('project')
            ->where('staff_id', $staffId)
            ->whereIn('status', ['assigned', 'in_progress', 'submitted'])
            ->whereNotNull('deadline_at')
            ->get()
            ->map(function (ProjectAssignment $assignment) use ($today) {
                $deadline = Carbon::parse($assignment->deadline_at)->timezone('Asia/Colombo');
                $daysLeft = (int) $today->diffInDays($deadline->copy()->startOfDay(), false);
                return [
                    'project_assignment_id' => $assignment->id,
                    'project_name' => $assignment->project?->name,
                    'deadline_at' => $deadline->toDateTimeString(),
                    'days_left' => $daysLeft,
                    'is_one_week_alert' => $daysLeft === 7,
                ];
            })
            ->filter(fn ($row) => $row['days_left'] >= 0 && $row['days_left'] <= 7)
            ->sortBy('days_left')
            ->values();

        return response()->json([
            'pending_tasks' => $pendingTasks,
            'deadline_reminders' => $deadlineReminders,
        ]);
    }
}
