<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DefaultUsersSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['office_id' => 'BOSS001'],
            [
                'name' => 'Boss',
                'branch' => 'HQ',
                'role' => 'boss',
                'pin_hash' => bcrypt('1'),
                'status' => 'currently_working',
                'email' => 'boss@example.com',
            ]
        );

        User::updateOrCreate(
            ['office_id' => 'ATT001'],
            [
                'name' => 'Main Attender',
                'branch' => 'HQ',
                'role' => 'attender',
                'pin_hash' => bcrypt('5'),
                'status' => 'currently_working',
                'email' => 'attender@example.com',
            ]
        );
    }
}
