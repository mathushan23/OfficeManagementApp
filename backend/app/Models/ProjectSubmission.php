<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProjectSubmission extends Model
{
    protected $fillable = [
        'project_assignment_id',
        'submitted_by',
        'login_url',
        'username',
        'password_encrypted',
        'documentation_link',
        'remarks',
        'approval_status',
        'reviewed_by',
        'reviewed_at',
        'rejection_reason',
    ];

    protected $casts = [
        'password_encrypted' => 'encrypted',
        'reviewed_at' => 'datetime',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ProjectAssignment::class, 'project_assignment_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function screenshots(): HasMany
    {
        return $this->hasMany(ProjectSubmissionScreenshot::class);
    }
}
