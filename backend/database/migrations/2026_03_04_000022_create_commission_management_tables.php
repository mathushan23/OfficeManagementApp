<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('commission_manager_settings')) {
            Schema::create('commission_manager_settings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('manager_attender_id')->nullable()->constrained('users')->nullOnDelete();
                $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('project_assignment_commission_advances') && !Schema::hasTable('project_commission_advances')) {
            Schema::rename('project_assignment_commission_advances', 'project_commission_advances');
        }

        if (!Schema::hasTable('project_commission_advances')) {
            Schema::create('project_commission_advances', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_assignment_id')->constrained('project_assignments')->cascadeOnDelete();
                $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('attender_id')->nullable()->constrained('users')->nullOnDelete();
                $table->decimal('amount', 12, 2);
                $table->string('note', 255)->nullable();
                $table->timestamps();

                $table->index(['project_assignment_id', 'staff_id'], 'commission_adv_assignment_staff_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('project_commission_advances')) {
            Schema::drop('project_commission_advances');
        } elseif (Schema::hasTable('project_assignment_commission_advances')) {
            Schema::drop('project_assignment_commission_advances');
        }
        if (Schema::hasTable('commission_manager_settings')) {
            Schema::drop('commission_manager_settings');
        }
    }
};
