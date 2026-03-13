<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectAssignment extends Model
{
    protected $fillable = [
        'project_id',
        'staff_id',
        'assigned_by',
        'commission_amount',
        'deadline_at',
        'status',
        'submitted_at',
        'completed_at',
    ];

    protected $casts = [
        'commission_amount' => 'float',
        'deadline_at' => 'datetime',
        'submitted_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(ProjectTask::class);
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(ProjectCredential::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(ProjectSubmission::class);
    }

    public function commissionAdvances(): HasMany
    {
        return $this->hasMany(ProjectAssignmentCommissionAdvance::class, 'project_assignment_id');
    }
}
