<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectSubmissionScreenshot extends Model
{
    protected $fillable = [
        'project_submission_id',
        'image_path',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(ProjectSubmission::class, 'project_submission_id');
    }
}
