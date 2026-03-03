<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashExpenseRequest extends Model
{
    protected $fillable = [
        'attender_id',
        'amount',
        'expense_date',
        'note',
        'status',
        'reviewed_by',
        'decision_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'expense_date' => 'date',
        'decision_at' => 'datetime',
    ];

    public function attender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attender_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
