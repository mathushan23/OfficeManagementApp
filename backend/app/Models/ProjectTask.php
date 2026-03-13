<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectTask extends Model
{
    protected $fillable = [
        'project_assignment_id',
        'staff_id',
        'assigned_by',
        'plan_date',
        'start_time',
        'estimated_hours',
        'title',
        'description',
        'deadline_at',
        'status',
        'completed_at',
        'proof_image_path',
        'proof_submitted_at',
    ];

    protected $casts = [
        'plan_date' => 'date',
        'estimated_hours' => 'float',
        'deadline_at' => 'datetime',
        'completed_at' => 'datetime',
        'proof_submitted_at' => 'datetime',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ProjectAssignment::class, 'project_assignment_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(ProjectTaskSubtask::class);
    }
}
