<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectAssignmentCommissionAdvance extends Model
{
    protected $table = 'project_commission_advances';

    protected $fillable = [
        'project_assignment_id',
        'staff_id',
        'attender_id',
        'amount',
        'note',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ProjectAssignment::class, 'project_assignment_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function attender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attender_id');
    }
}
