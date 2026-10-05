<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('name')->index();
            $table->string('phone', 32)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('role', 64)->nullable();
            $table->string('employment_type', 32)->default('seasonal');
            $table->decimal('daily_rate', 12, 2)->default(0);
            $table->string('currency', 8)->default('ETB');
            $table->date('hire_date')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->string('gender', 16)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('name')->index();
            $table->string('sku', 48)->nullable()->index();
            $table->string('category', 64)->default('other')->index();
            $table->string('unit', 16)->default('unit');
            $table->decimal('quantity', 14, 3)->default(0);
            $table->decimal('unit_cost', 14, 2)->default(0);
            $table->decimal('reorder_level', 14, 3)->default(0);
            $table->string('warehouse', 64)->nullable();
            $table->string('supplier_name')->nullable();
            $table->date('expiry_date')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'category']);
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->cascadeOnDelete();
            $table->string('type', 16)->index();
            $table->decimal('quantity', 14, 3);
            $table->decimal('unit_cost', 14, 2)->nullable();
            $table->string('reference_type', 64)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->string('reason', 128)->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamp('moved_at')->index();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'inventory_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('inventory_items');
        Schema::dropIfExists('workers');
    }
};
