<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN leave_type ENUM('full_day','half_day','short_leave','special_leave') NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE leave_requests MODIFY COLUMN leave_type ENUM('full_day','half_day','short_leave') NOT NULL");
    }
};

