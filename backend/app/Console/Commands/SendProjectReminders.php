<?php

namespace App\Console\Commands;

use App\Models\ProjectAssignment;
use App\Models\ProjectTask;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendProjectReminders extends Command
{
    protected $signature = 'projects:send-reminders';

    protected $description = 'Send daily project reminders for pending tasks and approaching deadlines';

    public function handle(): int
    {
        $today = Carbon::today('Asia/Colombo');
        $staffRows = User::query()
            ->where('role', 'staff')
            ->where('status', 'currently_working')
            ->whereNotNull('email')
            ->get(['id', 'name', 'email']);

        $sent = 0;

        foreach ($staffRows as $staff) {
            $pendingTasks = ProjectTask::query()
                ->with('assignment.project')
                ->whereHas('assignment', fn ($q) => $q->where('staff_id', $staff->id))
                ->whereIn('status', ['pending', 'in_progress'])
                ->orderBy('deadline_at')
                ->get();

            $deadlines = ProjectAssignment::query()
                ->with('project')
                ->where('staff_id', $staff->id)
                ->whereIn('status', ['assigned', 'in_progress', 'submitted'])
                ->whereNotNull('deadline_at')
                ->get()
                ->map(function (ProjectAssignment $assignment) use ($today) {
                    $deadline = Carbon::parse($assignment->deadline_at);
                    return [
                        'project_name' => $assignment->project?->name,
                        'deadline_at' => $deadline->toDateTimeString(),
                        'days_left' => $today->diffInDays($deadline->copy()->startOfDay(), false),
                    ];
                })
                ->filter(fn ($row) => $row['days_left'] >= 0 && $row['days_left'] <= 7)
                ->sortBy('days_left')
                ->values();

            if ($pendingTasks->isEmpty() && $deadlines->isEmpty()) {
                continue;
            }

            $taskLines = $pendingTasks->map(function (ProjectTask $task) {
                $projectName = $task->assignment?->project?->name ?? 'Project';
                $deadline = $task->deadline_at ? Carbon::parse($task->deadline_at)->toDateTimeString() : 'No deadline';
                return "- {$projectName}: {$task->title} ({$task->status}) - {$deadline}";
            })->implode("\n");

            $deadlineLines = $deadlines->map(fn ($d) => "- {$d['project_name']} - {$d['deadline_at']} ({$d['days_left']} day(s) left)")->implode("\n");

            $body = "Hello {$staff->name},\n\n";
            if ($taskLines !== '') {
                $body .= "Pending Tasks:\n{$taskLines}\n\n";
            }
            if ($deadlineLines !== '') {
                $body .= "Project Deadlines (within 7 days):\n{$deadlineLines}\n\n";
            }
            $body .= "Please review your staff dashboard.\n";

            try {
                Mail::raw($body, function ($message) use ($staff) {
                    $message->to($staff->email)->subject('Project Reminder');
                });
                $sent++;
            } catch (\Throwable) {
                // Keep scheduler successful if SMTP is unavailable.
            }
        }

        $this->info("Project reminders processed for {$today->toDateString()}. Emails sent: {$sent}");

        return self::SUCCESS;
    }
}
