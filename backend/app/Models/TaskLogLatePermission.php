<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskLogLatePermission extends Model
{
    protected $fillable = [
        'staff_id',
        'log_date',
        'status',
        'approved_by',
        'decision_at',
        'consumed_at',
    ];
}
