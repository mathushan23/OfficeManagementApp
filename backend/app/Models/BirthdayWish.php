<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BirthdayWish extends Model
{
    protected $fillable = [
        'staff_id',
        'wished_by',
        'wish_date',
        'wish_message',
    ];

    protected $casts = [
        'wish_date' => 'date',
    ];

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function wishedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'wished_by');
    }
}

