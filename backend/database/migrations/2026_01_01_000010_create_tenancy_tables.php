<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('type', 64)->default('individual_farmer');
            $table->string('plan', 32)->default('free');
            $table->string('country', 64)->default('Ethiopia');
            $table->string('region', 64)->nullable();
            $table->string('zone', 64)->nullable();
            $table->string('woreda', 64)->nullable();
            $table->string('kebele', 64)->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('email')->nullable();
            $table->string('locale', 8)->default('en');
            $table->string('timezone', 64)->default('Africa/Addis_Ababa');
            $table->string('currency', 8)->default('ETB');
            $table->string('area_unit', 16)->default('hectare');
            $table->string('calendar', 16)->default('ethiopian');
            $table->json('settings')->nullable();
            $table->string('status', 16)->default('active');
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->string('name');
            $table->string('slug', 64);
            $table->string('description')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();

            $table->unique(['organization_id', 'slug']);
        });

        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('key', 128)->unique();
            $table->string('name');
            $table->string('module', 64)->index();
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('permission_role', function (Blueprint $table) {
            $table->foreignId('role_id')->constrained('roles')->cascadeOnDelete();
            $table->foreignId('permission_id')->constrained('permissions')->cascadeOnDelete();
            $table->primary(['role_id', 'permission_id']);
        });

        Schema::create('organization_user', function (Blueprint $table) {
            $table->foreignId('organization_id')->constrained('organizations')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->primary(['organization_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organization_user');
        Schema::dropIfExists('permission_role');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('organizations');
    }
};
