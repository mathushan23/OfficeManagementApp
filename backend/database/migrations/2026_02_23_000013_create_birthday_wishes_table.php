<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('birthday_wishes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('wished_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('wish_date');
            $table->text('wish_message');
            $table->timestamps();

            $table->unique(['staff_id', 'wished_by', 'wish_date'], 'birthday_wishes_unique_sender_per_day');
            $table->index(['staff_id', 'wish_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_wishes');
    }
};

