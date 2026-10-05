<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Payment;
use App\Models\Sale;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class PaymentVerificationTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private function makeSale(array $tenant): Sale
    {
        $customer = Customer::create([
            'organization_id' => $tenant['organization']->id,
            'name' => 'Buyer PLC',
            'type' => 'buyer',
        ]);

        return Sale::create([
            'organization_id' => $tenant['organization']->id,
            'customer_id' => $customer->id,
            'invoice_number' => 'INV-TEST-0001',
            'sale_date' => now()->toDateString(),
            'status' => 'confirmed',
            'payment_status' => 'unpaid',
            'subtotal' => 1000,
            'tax_amount' => 0,
            'total' => 1000,
            'paid_amount' => 0,
        ]);
    }

    public function test_manual_payment_is_created_as_pending_never_verified(): void
    {
        $tenant = $this->makeTenant('pay-1');
        $sale = $this->makeSale($tenant);
        $token = $this->loginAs($tenant['users']['accountant']);

        $response = $this->postJson('/api/v1/payments', [
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 400,
            'method' => 'telebirr',
            'reference' => 'TRB-9911',
        ], ['Authorization' => 'Bearer '.$token]);

        $response->assertCreated()->assertJsonPath('data.status', 'pending');

        $this->assertSame(0.0, (float) $sale->fresh()->paid_amount);
    }

    public function test_verification_requires_permission_and_updates_the_sale(): void
    {
        $tenant = $this->makeTenant('pay-2');
        $sale = $this->makeSale($tenant);

        $accountant = $this->loginAs($tenant['users']['accountant']);

        $payment = Payment::create([
            'organization_id' => $tenant['organization']->id,
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 250,
            'method' => 'cash',
            'status' => 'pending',
            'paid_at' => now(),
        ]);

        $agronomist = $this->loginAs($tenant['users']['agronomist']);

        $this->postJson('/api/v1/payments/'.$payment->id.'/verify', [], [
            'Authorization' => 'Bearer '.$agronomist,
        ])->assertForbidden();

        $this->postJson('/api/v1/payments/'.$payment->id.'/verify', [], [
            'Authorization' => 'Bearer '.$accountant,
        ])->assertOk()->assertJsonPath('data.status', 'verified');

        $this->assertSame(250.0, (float) $sale->fresh()->paid_amount);
        $this->assertSame('partial', $sale->fresh()->payment_status);
    }

    public function test_full_verification_marks_the_sale_paid(): void
    {
        $tenant = $this->makeTenant('pay-3');
        $sale = $this->makeSale($tenant);
        $token = $this->loginAs($tenant['users']['owner']);

        $payment = Payment::create([
            'organization_id' => $tenant['organization']->id,
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 1000,
            'method' => 'bank_transfer',
            'status' => 'pending',
            'paid_at' => now(),
        ]);

        $this->postJson('/api/v1/payments/'.$payment->id.'/verify', [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $sale->refresh();

        $this->assertSame(1000.0, (float) $sale->paid_amount);
        $this->assertSame('paid', $sale->payment_status);
    }

    public function test_payment_can_be_rejected_with_a_reason(): void
    {
        $tenant = $this->makeTenant('pay-4');
        $sale = $this->makeSale($tenant);
        $token = $this->loginAs($tenant['users']['owner']);

        $payment = Payment::create([
            'organization_id' => $tenant['organization']->id,
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 100,
            'method' => 'cash',
            'status' => 'pending',
            'paid_at' => now(),
        ]);

        $this->postJson('/api/v1/payments/'.$payment->id.'/reject', [
            'reason' => 'Receipt image unreadable',
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $this->assertDatabaseHas('payments', [
            'id' => $payment->id,
            'status' => 'rejected',
            'rejection_reason' => 'Receipt image unreadable',
        ]);

        $this->assertSame(0.0, (float) $sale->fresh()->paid_amount);
    }
}
