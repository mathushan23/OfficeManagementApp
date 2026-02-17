<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('task_log_late_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users');
            $table->date('log_date');
            $table->foreignId('approved_by')->constrained('users');
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->unique(['staff_id', 'log_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_log_late_permissions');
    }
};

