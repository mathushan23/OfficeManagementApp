<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommissionManagerSetting extends Model
{
    protected $fillable = [
        'manager_attender_id',
        'updated_by',
    ];

    public function managerAttender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_attender_id');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
