<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaskLogEntry extends Model
{
    protected $fillable = [
        'task_log_id',
        'start_time',
        'end_time',
        'project_name',
        'description',
    ];

    public function proofs()
    {
        return $this->hasMany(TaskLogProof::class);
    }
}

