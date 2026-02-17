<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskLog extends Model
{
    protected $fillable = [
        'staff_id',
        'log_date',
        'submitted',
        'attender_override_approved',
        'approved_by',
    ];

    public function entries()
    {
        return $this->hasMany(TaskLogEntry::class);
    }

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
