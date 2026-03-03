<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class TaskLogProof extends Model
{
    protected $appends = ['url'];

    protected $fillable = [
        'task_log_entry_id',
        'image_path',
    ];

    public function getUrlAttribute(): string
    {
        $path = $this->image_path ?? '';

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $normalized = ltrim($path, '/');
        $appUrl = rtrim((string) (config('app.url') ?? ''), '/');

        if (
            str_starts_with($normalized, 'tasklog-proofs/')
            || str_starts_with($normalized, 'staff-profiles/')
            || str_starts_with($normalized, 'petty-cash-proofs/')
        ) {
            return $appUrl !== '' ? "{$appUrl}/{$normalized}" : "/{$normalized}";
        }

        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, 9);
        }

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, 8);
        }

        $appUrl = rtrim(config('app.url') ?? '', '/');
        if ($appUrl !== '') {
            return $appUrl . '/storage/' . ltrim($path, '/');
        }

        if (str_starts_with($this->image_path, '/storage/')) {
            return $this->image_path;
        }

        return Storage::disk('public')->url($path);
    }
}
