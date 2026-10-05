<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crops', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->nullable()->index();
            $table->string('name')->index();
            $table->string('category', 64)->default('cereal')->index();
            $table->string('default_unit', 16)->default('quintal');
            $table->unsignedSmallInteger('growing_days')->nullable();
            $table->string('scientific_name')->nullable();
            $table->boolean('is_global')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('seasons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('name')->index();
            $table->string('code', 32)->nullable()->index();
            $table->unsignedSmallInteger('year')->index();
            $table->date('start_date');
            $table->date('end_date');
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['organization_id', 'code']);
        });

        Schema::create('crop_plans', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('season_id')->constrained('seasons')->cascadeOnDelete();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->string('variety')->nullable();
            $table->decimal('planned_area_hectares', 12, 4)->default(0);
            $table->date('planting_date')->nullable();
            $table->date('expected_harvest_date')->nullable();
            $table->decimal('expected_yield', 12, 3)->default(0);
            $table->decimal('actual_yield', 12, 3)->default(0);
            $table->string('yield_unit', 16)->default('quintal');
            $table->decimal('seed_quantity', 12, 3)->nullable();
            $table->decimal('estimated_cost', 14, 2)->nullable();
            $table->string('status', 32)->default('planned')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'season_id']);
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('crop_plan_id')->nullable()->constrained('crop_plans')->nullOnDelete();
            $table->foreignId('field_id')->nullable()->constrained('fields')->nullOnDelete();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('type', 64)->index();
            $table->string('title')->index();
            $table->text('description')->nullable();
            $table->string('status', 32)->default('pending')->index();
            $table->string('priority', 16)->default('medium');
            $table->date('scheduled_date')->nullable()->index();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedBigInteger('assigned_worker_id')->nullable()->index();
            $table->unsignedBigInteger('assigned_user_id')->nullable();
            $table->decimal('labor_hours', 8, 2)->nullable();
            $table->decimal('quantity', 12, 3)->nullable();
            $table->string('unit', 16)->nullable();
            $table->decimal('cost', 14, 2)->nullable();
            $table->string('weather_note')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'scheduled_date', 'status']);
        });

        Schema::create('harvest_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('batch_number', 48)->unique();
            $table->foreignId('crop_plan_id')->nullable()->constrained('crop_plans')->nullOnDelete();
            $table->foreignId('field_id')->nullable()->constrained('fields')->nullOnDelete();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->foreignId('crop_id')->nullable()->constrained('crops')->nullOnDelete();
            $table->date('harvest_date')->index();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->string('unit', 16)->default('quintal');
            $table->decimal('moisture_percent', 5, 2)->nullable();
            $table->string('grade', 16)->nullable();
            $table->string('quality_status', 32)->default('pending')->index();
            $table->string('status', 32)->default('recorded')->index();
            $table->string('location')->nullable();
            $table->decimal('unit_price', 14, 2)->nullable();
            $table->unsignedBigInteger('recorded_by')->nullable();
            $table->text('notes')->nullable();
            $table->string('qr_code', 64)->nullable()->index();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'harvest_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('harvest_batches');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('crop_plans');
        Schema::dropIfExists('seasons');
        Schema::dropIfExists('crops');
    }
};
