<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('project_tasks', 'start_time')) {
                $table->time('start_time')->nullable()->after('plan_date');
            }
            if (!Schema::hasColumn('project_tasks', 'estimated_hours')) {
                $table->decimal('estimated_hours', 5, 2)->nullable()->after('start_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('project_tasks', 'estimated_hours')) {
                $table->dropColumn('estimated_hours');
            }
            if (Schema::hasColumn('project_tasks', 'start_time')) {
                $table->dropColumn('start_time');
            }
        });
    }
};
