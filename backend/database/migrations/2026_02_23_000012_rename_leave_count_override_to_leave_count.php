<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        $hasOverride = Schema::hasColumn('users', 'leave_count_override');
        $hasLeaveCount = Schema::hasColumn('users', 'leave_count');

        if ($hasOverride && !$hasLeaveCount) {
            Schema::table('users', function (Blueprint $table) {
                $table->decimal('leave_count', 6, 2)->nullable()->after('intern_end_date');
            });
            DB::statement('UPDATE users SET leave_count = leave_count_override WHERE leave_count_override IS NOT NULL');
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('leave_count_override');
            });
            return;
        }

        if ($hasOverride && $hasLeaveCount) {
            DB::statement('UPDATE users SET leave_count = leave_count_override WHERE leave_count_override IS NOT NULL');
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('leave_count_override');
            });
            return;
        }

        if (!$hasOverride && !$hasLeaveCount) {
            Schema::table('users', function (Blueprint $table) {
                $table->decimal('leave_count', 6, 2)->nullable()->after('intern_end_date');
            });
        }
    }

    public function down(): void
    {
        $hasOverride = Schema::hasColumn('users', 'leave_count_override');
        $hasLeaveCount = Schema::hasColumn('users', 'leave_count');

        if (!$hasOverride && $hasLeaveCount) {
            Schema::table('users', function (Blueprint $table) {
                $table->decimal('leave_count_override', 6, 2)->nullable()->after('intern_end_date');
            });
            DB::statement('UPDATE users SET leave_count_override = leave_count WHERE leave_count IS NOT NULL');
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('leave_count');
            });
        }
    }
};

