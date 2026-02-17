<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LeaveRequest extends Model
{
    protected $fillable = [
        'staff_id',
        'leave_type',
        'half_day_slot',
        'short_start_time',
        'short_end_time',
        'start_date',
        'days_count',
        'rejoin_date',
        'reason',
        'status',
        'approved_by',
        'decision_at',
    ];

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
