<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farms', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->unsignedBigInteger('owner_user_id')->nullable();
            $table->string('name')->index();
            $table->string('code', 32)->nullable()->index();
            $table->string('type', 64)->default('family');
            $table->string('country', 64)->default('Ethiopia');
            $table->string('region', 64)->nullable()->index();
            $table->string('zone', 64)->nullable();
            $table->string('woreda', 64)->nullable();
            $table->string('kebele', 64)->nullable();
            $table->decimal('area_hectares', 12, 4)->default(0);
            $table->decimal('cultivated_hectares', 12, 4)->default(0);
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('established_year')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->text('description')->nullable();
            $table->json('custom_fields')->nullable();
            $table->string('qr_code', 64)->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('fields', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('farm_id')->constrained('farms')->cascadeOnDelete();
            $table->string('name')->index();
            $table->string('code', 32)->nullable()->index();
            $table->decimal('area_hectares', 12, 4)->default(0);
            $table->string('soil_type', 64)->nullable();
            $table->string('irrigation_type', 64)->nullable();
            $table->string('topography', 32)->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('altitude_m', 8, 2)->nullable();
            $table->json('boundary')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->string('qr_code', 64)->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'farm_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fields');
        Schema::dropIfExists('farms');
    }
};
