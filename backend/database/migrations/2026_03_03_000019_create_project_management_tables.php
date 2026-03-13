<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['draft', 'active', 'completed', 'archived'])->default('active');
            $table->timestamps();
        });

        Schema::create('project_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('commission_amount', 12, 2)->nullable();
            $table->dateTime('deadline_at');
            $table->enum('status', ['assigned', 'in_progress', 'submitted', 'completed', 'rejected'])->default('assigned');
            $table->dateTime('submitted_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'staff_id']);
        });

        Schema::create('project_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_assignment_id')->constrained('project_assignments')->cascadeOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('deadline_at')->nullable();
            $table->enum('status', ['pending', 'in_progress', 'completed'])->default('pending');
            $table->dateTime('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('project_task_subtasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_task_id')->constrained('project_tasks')->cascadeOnDelete();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_done')->default(false);
            $table->dateTime('done_at')->nullable();
            $table->timestamps();
        });

        Schema::create('project_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_assignment_id')->constrained('project_assignments')->cascadeOnDelete();
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('app_name')->nullable();
            $table->string('login_url');
            $table->string('username');
            $table->text('password_encrypted');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('project_submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_assignment_id')->constrained('project_assignments')->cascadeOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('login_url');
            $table->string('username');
            $table->text('password_encrypted');
            $table->string('documentation_link')->nullable();
            $table->text('remarks')->nullable();
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('project_submission_screenshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_submission_id')->constrained('project_submissions')->cascadeOnDelete();
            $table->string('image_path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_submission_screenshots');
        Schema::dropIfExists('project_submissions');
        Schema::dropIfExists('project_credentials');
        Schema::dropIfExists('project_task_subtasks');
        Schema::dropIfExists('project_tasks');
        Schema::dropIfExists('project_assignments');
        Schema::dropIfExists('projects');
    }
};
