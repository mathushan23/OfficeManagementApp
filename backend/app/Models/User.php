<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Facades\Hash;

class User extends Authenticatable
{
    protected $fillable = [
        'name',
        'office_id',
        'branch',
        'role',
        'pin_hash',
        'status',
        'email',
        'profile_photo',
        'date_of_birth',
        'joining_date',
        'employment_type',
        'intern_start_date',
        'intern_end_date',
        'leave_count',
    ];

    protected $hidden = ['pin_hash'];

    protected $casts = [
        'date_of_birth' => 'date',
        'joining_date' => 'date',
        'intern_start_date' => 'date',
        'intern_end_date' => 'date',
        'leave_count' => 'float',
    ];

    public function setPinAttribute(string $pin): void
    {
        $this->attributes['pin_hash'] = bcrypt($pin);
    }

    public static function pinAlreadyUsed(string $pin, ?int $exceptUserId = null): bool
    {
        $query = self::query();
        if ($exceptUserId) {
            $query->where('id', '!=', $exceptUserId);
        }

        foreach ($query->get(['id', 'pin_hash']) as $user) {
            if (Hash::check($pin, $user->pin_hash)) {
                return true;
            }
        }

        return false;
    }
}
