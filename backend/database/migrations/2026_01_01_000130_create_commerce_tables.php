<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('name')->index();
            $table->string('type', 64)->default('buyer')->index();
            $table->string('phone', 32)->nullable()->index();
            $table->string('email')->nullable();
            $table->string('address')->nullable();
            $table->string('region', 64)->nullable();
            $table->string('tin_number', 32)->nullable();
            $table->decimal('credit_limit', 14, 2)->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('category', 64)->index();
            $table->string('title')->index();
            $table->text('description')->nullable();
            $table->decimal('amount', 14, 2)->default(0);
            $table->string('currency', 8)->default('ETB');
            $table->date('expense_date')->index();
            $table->string('payment_method', 32)->default('cash');
            $table->string('status', 32)->default('paid')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->foreignId('field_id')->nullable()->constrained('fields')->nullOnDelete();
            $table->foreignId('crop_plan_id')->nullable()->constrained('crop_plans')->nullOnDelete();
            $table->string('supplier_name')->nullable();
            $table->string('receipt_url')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'category', 'expense_date']);
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('invoice_number', 48)->index();
            $table->date('sale_date')->index();
            $table->string('status', 32)->default('confirmed')->index();
            $table->string('payment_status', 32)->default('unpaid')->index();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('tax_amount', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->decimal('paid_amount', 14, 2)->default(0);
            $table->string('currency', 8)->default('ETB');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'sale_date']);
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('sale_id')->constrained('sales')->cascadeOnDelete();
            $table->foreignId('harvest_batch_id')->nullable()->constrained('harvest_batches')->nullOnDelete();
            $table->string('description');
            $table->decimal('quantity', 12, 3)->default(0);
            $table->string('unit', 16)->default('quintal');
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('expense_id')->nullable()->constrained('expenses')->nullOnDelete();
            $table->string('direction', 8)->default('in')->index();
            $table->decimal('amount', 14, 2);
            $table->string('currency', 8)->default('ETB');
            $table->string('method', 32)->index();
            $table->string('reference', 64)->nullable()->index();
            $table->string('receipt_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('status', 32)->default('pending')->index();
            $table->unsignedBigInteger('verified_by')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'direction', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('customers');
    }
};
