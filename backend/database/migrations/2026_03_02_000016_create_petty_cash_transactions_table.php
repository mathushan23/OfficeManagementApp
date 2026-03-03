<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petty_cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->enum('transaction_type', ['credit', 'debit']);
            $table->decimal('amount', 12, 2);
            $table->date('transaction_date');
            $table->string('note', 255)->nullable();
            $table->timestamps();

            $table->index(['attender_id', 'transaction_type', 'transaction_date'], 'petty_cash_attender_type_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petty_cash_transactions');
    }
};
