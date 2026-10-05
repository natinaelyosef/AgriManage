<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('land_records', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('parcel_name')->index();
            $table->string('holder_name')->index();
            $table->string('tenure_type', 32)->default('owner')->index();
            $table->string('document_number', 64)->nullable()->index();
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('area_hectares', 12, 4)->default(0);
            $table->string('region')->nullable();
            $table->string('zone')->nullable();
            $table->string('woreda')->nullable();
            $table->string('kebele')->nullable();
            $table->string('status', 32)->default('active')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });

        Schema::create('contracts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
            $table->string('title')->index();
            $table->string('type', 32)->default('produce_sale')->index();
            $table->string('counterparty')->index();
            $table->string('counterparty_phone', 32)->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->decimal('value', 14, 2)->default(0);
            $table->string('currency', 8)->default('ETB');
            $table->string('payment_terms', 160)->nullable();
            $table->string('status', 32)->default('draft')->index();
            $table->string('document_number', 64)->nullable();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
            $table->index(['organization_id', 'type']);
        });

        Schema::create('export_documents', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('organization_id')->index();
            $table->string('doc_number', 48)->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('product')->index();
            $table->decimal('quantity', 12, 3)->default(0);
            $table->string('unit', 16)->default('quintal');
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('total', 14, 2)->default(0);
            $table->string('destination_country', 64)->index();
            $table->string('transport_mode', 16)->default('road');
            $table->date('ship_date')->nullable();
            $table->string('status', 32)->default('draft')->index();
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['organization_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('export_documents');
        Schema::dropIfExists('contracts');
        Schema::dropIfExists('land_records');
    }
};
