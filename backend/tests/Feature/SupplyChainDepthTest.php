<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class SupplyChainDepthTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('supply-farm');
        $this->token = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(string $token = null): array
    {
        return ['Authorization' => 'Bearer '.($token ?? $this->token), 'Accept' => 'application/json'];
    }

    public function test_role_boundaries_on_supply_chain_modules(): void
    {
        $agronomistToken = $this->loginAs($this->tenant['users']['agronomist']);
        $accountantToken = $this->loginAs($this->tenant['users']['accountant']);
        $workerToken = $this->loginAs($this->tenant['users']['worker']);

        $this->getJson('/api/v1/contracts', $this->auth($agronomistToken))->assertOk();
        $this->getJson('/api/v1/land-records', $this->auth($agronomistToken))->assertOk();
        $this->getJson('/api/v1/export-documents', $this->auth($agronomistToken))->assertOk();

        $this->getJson('/api/v1/contracts', $this->auth($workerToken))->assertForbidden();
        $this->getJson('/api/v1/land-records', $this->auth($workerToken))->assertForbidden();

        $contractPayload = [
            'title' => 'Agro lease',
            'counterparty' => 'Kebele office',
            'start_date' => '2026-10-01',
            'value' => 5000,
        ];

        $this->postJson('/api/v1/contracts', $contractPayload, $this->auth($agronomistToken))->assertForbidden();

        $this->postJson('/api/v1/land-records', [
            'parcel_name' => 'Agro parcel',
            'holder_name' => 'Kebele office',
            'area_hectares' => 2,
        ], $this->auth($agronomistToken))->assertForbidden();

        $this->postJson('/api/v1/export-documents', [
            'product' => 'Teff',
            'quantity' => 5,
            'unit_price' => 4000,
            'destination_country' => 'UAE',
        ], $this->auth($agronomistToken))->assertForbidden();

        $this->postJson('/api/v1/contracts', $contractPayload, $this->auth($accountantToken))->assertCreated();

        $this->postJson('/api/v1/export-documents', [
            'product' => 'Teff',
            'quantity' => 5,
            'unit_price' => 4000,
            'destination_country' => 'UAE',
        ], $this->auth($accountantToken))->assertCreated();

        $this->getJson('/api/v1/land-records', $this->auth($accountantToken))->assertOk();
    }

    public function test_export_document_totalling_and_numbering(): void
    {
        $document = $this->postJson('/api/v1/export-documents', [
            'product' => 'Teff (Quncho)',
            'quantity' => 40,
            'unit_price' => 4500,
            'destination_country' => 'Germany',
            'transport_mode' => 'sea',
        ], $this->auth())->assertCreated()->json('data');

        $this->assertStringStartsWith('EXP-', $document['doc_number']);
        $this->assertSame(180000.0, (float) $document['total']);

        $updated = $this->putJson("/api/v1/export-documents/{$document['id']}", [
            'product' => 'Teff (Quncho)',
            'quantity' => 50,
            'unit_price' => 4500,
            'destination_country' => 'Germany',
            'status' => 'shipped',
        ], $this->auth())->assertOk()->json('data');

        $this->assertSame(225000.0, (float) $updated['total']);
        $this->assertSame('shipped', $updated['status']);

        $this->getJson('/api/v1/export-documents?status=shipped', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $second = $this->postJson('/api/v1/export-documents', [
            'product' => 'Coffee (Yirgacheffe)',
            'quantity' => 12,
            'unit_price' => 21000,
            'destination_country' => 'Japan',
        ], $this->auth())->assertCreated()->json('data');

        $this->assertNotSame($document['doc_number'], $second['doc_number']);
    }

    public function test_land_record_expiry_and_contract_active_filters(): void
    {
        $this->postJson('/api/v1/land-records', [
            'parcel_name' => 'Leased plot',
            'holder_name' => 'Abebe Kebede',
            'tenure_type' => 'lease',
            'area_hectares' => 5,
            'issue_date' => now()->subYear()->toDateString(),
            'expiry_date' => now()->subDays(10)->toDateString(),
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/land-records', [
            'parcel_name' => 'Owned plot',
            'holder_name' => 'Abebe Kebede',
            'tenure_type' => 'owner',
            'area_hectares' => 8,
        ], $this->auth())->assertCreated();

        $this->getJson('/api/v1/land-records?expired=1', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.parcel_name', 'Leased plot');

        $this->postJson('/api/v1/contracts', [
            'title' => 'Active produce contract',
            'type' => 'produce_sale',
            'counterparty' => 'Addis Millers',
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addMonths(5)->toDateString(),
            'value' => 250000,
            'status' => 'active',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/contracts', [
            'title' => 'Expired lease',
            'type' => 'land_lease',
            'counterparty' => 'Kebele office',
            'start_date' => now()->subYears(2)->toDateString(),
            'end_date' => now()->subMonths(6)->toDateString(),
            'value' => 40000,
            'status' => 'active',
        ], $this->auth())->assertCreated();

        $this->getJson('/api/v1/contracts?active=1', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Active produce contract');

        $this->getJson('/api/v1/contracts?type=land_lease', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_contract_rejects_cross_tenant_farm_and_bad_period(): void
    {
        $foreign = $this->makeTenant('other-supply');
        $foreignFarm = $this->postJson('/api/v1/farms', [
            'name' => 'Foreign Farm',
            'type' => 'smallholder',
            'area_hectares' => 1,
        ], $this->auth($this->loginAs($foreign['users']['owner'])))->assertCreated()->json('data');

        $this->postJson('/api/v1/contracts', [
            'title' => 'Sneaky lease',
            'counterparty' => 'Foreign Party',
            'start_date' => '2026-10-01',
            'value' => 100,
            'farm_id' => $foreignFarm['id'],
        ], $this->auth())->assertStatus(422);

        $this->postJson('/api/v1/contracts', [
            'title' => 'Bad period',
            'counterparty' => 'Party',
            'start_date' => '2026-11-01',
            'end_date' => '2026-10-01',
            'value' => 100,
        ], $this->auth())->assertStatus(422)->assertJsonValidationErrors(['end_date']);
    }
}
