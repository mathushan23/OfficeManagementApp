<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionManagerAttender extends Model
{
    protected $fillable = [
        'attender_id',
        'assigned_by',
    ];

    public function attender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attender_id');
    }

    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }
}
