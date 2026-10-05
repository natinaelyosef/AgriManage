<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('irrigation_events', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->date('irrigation_date')->index();
            $table->string('method', 32)->default('manual');
            $table->string('source', 32)->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->decimal('volume_m3', 12, 2)->nullable();
            $table->decimal('cost', 14, 2)->nullable();
            $table->unsignedBigInteger('performed_by')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'irrigation_date']);
            $table->index(['organization_id', 'method']);
        });

        Schema::create('treatments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('field_id')->constrained('fields')->cascadeOnDelete();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->foreignId('crop_plan_id')->nullable()->constrained('crop_plans')->nullOnDelete();
            $table->date('applied_date')->index();
            $table->string('category', 64)->default('fertilizer')->index();
            $table->string('product_name')->index();
            $table->decimal('dose', 12, 3)->nullable();
            $table->string('dose_unit', 16)->nullable();
            $table->string('method', 32)->nullable();
            $table->string('target')->nullable();
            $table->unsignedSmallInteger('pre_harvest_interval_days')->nullable();
            $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->nullOnDelete();
            $table->decimal('quantity_used', 12, 3)->nullable();
            $table->decimal('cost', 14, 2)->nullable();
            $table->unsignedBigInteger('performed_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'applied_date']);
        });

        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('name')->index();
            $table->string('code', 32)->nullable()->index();
            $table->string('type', 64)->default('tool')->index();
            $table->string('serial_number', 64)->nullable();
            $table->string('manufacturer')->nullable();
            $table->date('purchase_date')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->decimal('hours_meter', 12, 1)->nullable();
            $table->string('fuel_type', 32)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('maintenance_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('equipment_id')->constrained('equipment')->cascadeOnDelete();
            $table->string('title')->index();
            $table->string('type', 32)->default('scheduled');
            $table->string('status', 32)->default('scheduled')->index();
            $table->date('performed_date')->nullable();
            $table->date('next_due_date')->nullable()->index();
            $table->decimal('cost', 14, 2)->nullable();
            $table->unsignedBigInteger('performed_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_records');
        Schema::dropIfExists('equipment');
        Schema::dropIfExists('treatments');
        Schema::dropIfExists('irrigation_events');
    }
};
