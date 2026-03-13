<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTaskSubtask extends Model
{
    protected $fillable = [
        'project_task_id',
        'staff_id',
        'title',
        'is_done',
        'done_at',
    ];

    protected $casts = [
        'is_done' => 'boolean',
        'done_at' => 'datetime',
    ];

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'project_task_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
