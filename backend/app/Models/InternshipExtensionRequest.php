<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InternshipExtensionRequest extends Model
{
    protected $fillable = [
        'staff_id',
        'requested_days',
        'current_intern_end_date',
        'requested_intern_end_date',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'current_intern_end_date' => 'date',
        'requested_intern_end_date' => 'date',
        'reviewed_at' => 'datetime',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
