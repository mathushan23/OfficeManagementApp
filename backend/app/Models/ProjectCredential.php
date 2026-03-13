<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectCredential extends Model
{
    protected $fillable = [
        'project_assignment_id',
        'added_by',
        'app_name',
        'login_url',
        'username',
        'password_encrypted',
        'notes',
    ];

    protected $casts = [
        'password_encrypted' => 'encrypted',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ProjectAssignment::class, 'project_assignment_id');
    }

    public function addedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'added_by');
    }
}
