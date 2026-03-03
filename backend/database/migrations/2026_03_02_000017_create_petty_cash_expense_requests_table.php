<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petty_cash_expense_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attender_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('expense_date');
            $table->string('note', 255);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decision_at')->nullable();
            $table->timestamps();

            $table->index(['attender_id', 'status', 'expense_date'], 'petty_cash_exp_req_attender_status_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petty_cash_expense_requests');
    }
};
