<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->enum('half_day_slot', ['before_break', 'after_break'])->nullable()->after('leave_type');
            $table->time('short_start_time')->nullable()->after('half_day_slot');
            $table->time('short_end_time')->nullable()->after('short_start_time');
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn(['half_day_slot', 'short_start_time', 'short_end_time']);
        });
    }
};

