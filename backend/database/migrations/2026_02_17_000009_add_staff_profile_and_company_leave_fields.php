<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('joining_date')->nullable()->after('email');
            $table->enum('employment_type', ['permanent', 'intern'])->default('permanent')->after('joining_date');
            $table->date('intern_start_date')->nullable()->after('employment_type');
            $table->date('intern_end_date')->nullable()->after('intern_start_date');
        });

        Schema::table('attendance', function (Blueprint $table) {
            $table->boolean('is_company_leave')->default(false)->after('out_time');
        });
    }

    public function down(): void
    {
        Schema::table('attendance', function (Blueprint $table) {
            $table->dropColumn('is_company_leave');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['joining_date', 'employment_type', 'intern_start_date', 'intern_end_date']);
        });
    }
};

