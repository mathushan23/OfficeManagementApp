<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasTable('commission_manager_attenders')) {
            Schema::create('commission_manager_attenders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('attender_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();

                $table->unique('attender_id');
            });
        }

        if (Schema::hasTable('commission_manager_settings') && Schema::hasColumn('commission_manager_settings', 'manager_attender_id')) {
            $managerId = DB::table('commission_manager_settings')->whereNotNull('manager_attender_id')->value('manager_attender_id');
            if ($managerId) {
                DB::table('commission_manager_attenders')->updateOrInsert(
                    ['attender_id' => (int) $managerId],
                    ['assigned_by' => null, 'updated_at' => now(), 'created_at' => now()]
                );
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('commission_manager_attenders')) {
            Schema::drop('commission_manager_attenders');
        }
    }
};
