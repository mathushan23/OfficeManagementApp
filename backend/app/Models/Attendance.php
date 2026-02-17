<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $fillable = [
        'staff_id',
        'date',
        'in_time',
        'out_time',
        'marked_by',
    ];

    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }
}
