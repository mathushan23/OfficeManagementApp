<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('task_log_late_permissions', function (Blueprint $table) {
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->after('log_date');
            $table->timestamp('decision_at')->nullable()->after('approved_by');
        });

        DB::statement('ALTER TABLE task_log_late_permissions MODIFY approved_by BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('task_log_late_permissions', function (Blueprint $table) {
            $table->dropColumn(['status', 'decision_at']);
        });
    }
};
