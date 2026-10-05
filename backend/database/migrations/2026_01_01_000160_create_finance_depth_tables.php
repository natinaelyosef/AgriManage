<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->date('work_date')->index();
            $table->string('status', 32)->default('present')->index();
            $table->decimal('hours', 5, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['worker_id', 'work_date']);
            $table->index(['organization_id', 'work_date']);
        });

        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->date('period_start')->index();
            $table->date('period_end')->index();
            $table->string('status', 32)->default('draft')->index();
            $table->decimal('total', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignId('worker_id')->constrained('workers')->cascadeOnDelete();
            $table->decimal('days_worked', 6, 2)->default(0);
            $table->decimal('base_rate', 12, 2)->default(0);
            $table->decimal('gross', 14, 2)->default(0);
            $table->decimal('deductions', 14, 2)->default(0);
            $table->decimal('net', 14, 2)->default(0);
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'payroll_run_id']);
            $table->unique(['payroll_run_id', 'worker_id']);
        });

        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('po_number', 48)->unique();
            $table->string('supplier')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->date('order_date')->index();
            $table->date('expected_date')->nullable();
            $table->string('status', 32)->default('draft')->index();
            $table->decimal('subtotal', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('purchase_order_items', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->cascadeOnDelete();
            $table->string('description')->index();
            $table->decimal('quantity', 12, 3)->default(1);
            $table->string('unit', 16)->default('unit');
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->timestamps();

            $table->index(['organization_id', 'purchase_order_id']);
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('name')->index();
            $table->string('category', 64)->default('other')->index();
            $table->date('period_start')->index();
            $table->date('period_end')->index();
            $table->decimal('amount', 14, 2)->default(0);
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('purchase_order_items');
        Schema::dropIfExists('purchase_orders');
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('attendance_records');
    }
};
