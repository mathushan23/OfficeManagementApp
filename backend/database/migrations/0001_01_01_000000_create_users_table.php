<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('office_id')->unique();
            $table->string('branch');
            $table->enum('role', ['boss', 'attender', 'staff']);
            $table->string('pin_hash');
            $table->enum('status', ['currently_working', 'leaved'])->default('currently_working');
            $table->string('email')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
