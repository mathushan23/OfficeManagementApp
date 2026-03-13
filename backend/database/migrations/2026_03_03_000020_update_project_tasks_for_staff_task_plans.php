<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            if (!Schema::hasColumn('project_tasks', 'staff_id')) {
                $table->foreignId('staff_id')->nullable()->after('project_assignment_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('project_tasks', 'plan_date')) {
                $table->date('plan_date')->nullable()->after('assigned_by');
            }
            if (!Schema::hasColumn('project_tasks', 'proof_image_path')) {
                $table->string('proof_image_path')->nullable()->after('completed_at');
            }
            if (!Schema::hasColumn('project_tasks', 'proof_submitted_at')) {
                $table->dateTime('proof_submitted_at')->nullable()->after('proof_image_path');
            }
        });

        if (Schema::hasColumn('project_tasks', 'staff_id')) {
            DB::statement("
                UPDATE project_tasks pt
                INNER JOIN project_assignments pa ON pa.id = pt.project_assignment_id
                SET pt.staff_id = pa.staff_id
                WHERE pt.staff_id IS NULL
            ");
        }

        if (Schema::hasColumn('project_tasks', 'plan_date')) {
            DB::statement("
                UPDATE project_tasks
                SET plan_date = DATE(created_at)
                WHERE plan_date IS NULL
            ");
        }
    }

    public function down(): void
    {
        Schema::table('project_tasks', function (Blueprint $table) {
            if (Schema::hasColumn('project_tasks', 'proof_submitted_at')) {
                $table->dropColumn('proof_submitted_at');
            }
            if (Schema::hasColumn('project_tasks', 'proof_image_path')) {
                $table->dropColumn('proof_image_path');
            }
            if (Schema::hasColumn('project_tasks', 'plan_date')) {
                $table->dropColumn('plan_date');
            }
            if (Schema::hasColumn('project_tasks', 'staff_id')) {
                $table->dropConstrainedForeignId('staff_id');
            }
        });
    }
};
