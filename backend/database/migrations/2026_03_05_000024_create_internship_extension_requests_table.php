<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('internship_extension_requests')) {
            Schema::create('internship_extension_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('requested_days');
                $table->date('current_intern_end_date');
                $table->date('requested_intern_end_date');
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->text('rejection_reason')->nullable();
                $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
                $table->dateTime('reviewed_at')->nullable();
                $table->timestamps();

                $table->index(['staff_id', 'status'], 'intern_ext_staff_status_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('internship_extension_requests')) {
            Schema::drop('internship_extension_requests');
        }
    }
};
