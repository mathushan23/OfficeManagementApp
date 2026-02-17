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
        'joining_date',
        'employment_type',
        'intern_start_date',
        'intern_end_date',
    ];

    protected $hidden = ['pin_hash'];

    protected $casts = [
        'joining_date' => 'date',
        'intern_start_date' => 'date',
        'intern_end_date' => 'date',
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
