<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PettyCashTransaction extends Model
{
    protected $fillable = [
        'attender_id',
        'created_by',
        'transaction_type',
        'amount',
        'transaction_date',
        'note',
        'proof_image',
    ];

    protected $casts = [
        'amount' => 'float',
        'transaction_date' => 'date',
    ];

    public function attender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attender_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
