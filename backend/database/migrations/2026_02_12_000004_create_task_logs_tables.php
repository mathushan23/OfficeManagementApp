<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('task_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users');
            $table->date('log_date');
            $table->boolean('submitted')->default(true);
            $table->boolean('attender_override_approved')->default(false);
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->unique(['staff_id', 'log_date']);
        });

        Schema::create('task_log_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_log_id')->constrained('task_logs')->cascadeOnDelete();
            $table->time('start_time');
            $table->time('end_time');
            $table->string('project_name');
            $table->text('description');
            $table->timestamps();
        });

        Schema::create('task_log_proofs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_log_entry_id')->constrained('task_log_entries')->cascadeOnDelete();
            $table->string('image_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_log_proofs');
        Schema::dropIfExists('task_log_entries');
        Schema::dropIfExists('task_logs');
    }
};
