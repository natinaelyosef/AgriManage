<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class ResourceQueryTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('query-farm');
        $this->token = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(): array
    {
        return ['Authorization' => 'Bearer '.$this->token, 'Accept' => 'application/json'];
    }

    private function makeFarm(string $name = 'Query Farm'): int
    {
        $response = $this->postJson('/api/v1/farms', [
            'name' => $name,
            'type' => 'commercial',
            'area_hectares' => 12.5,
        ], $this->auth());

        $response->assertCreated();

        return $response->json('data.id');
    }

    public function test_partial_update_only_touches_sent_fields(): void
    {
        $farmId = $this->makeFarm();

        $this->patchJson("/api/v1/farms/{$farmId}", [
            'description' => 'Updated description only',
        ], $this->auth())
            ->assertOk()
            ->assertJsonPath('data.description', 'Updated description only')
            ->assertJsonPath('data.name', 'Query Farm');
    }

    public function test_activity_index_filters_by_status(): void
    {
        foreach ([['pending', 'Task A'], ['completed', 'Task B']] as [$status, $title]) {
            $this->postJson('/api/v1/activities', [
                'title' => $title,
                'type' => 'weeding',
                'status' => $status,
            ], $this->auth())->assertCreated();
        }

        $this->getJson('/api/v1/activities?status=completed', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Task B');
    }

    public function test_expense_index_filters_by_status(): void
    {
        $this->postJson('/api/v1/expenses', [
            'title' => 'Seed purchase',
            'category' => 'inputs',
            'amount' => 500,
            'expense_date' => now()->toDateString(),
            'status' => 'pending',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/expenses', [
            'title' => 'Fuel',
            'category' => 'fuel',
            'amount' => 200,
            'expense_date' => now()->toDateString(),
            'status' => 'approved',
        ], $this->auth())->assertCreated();

        $this->getJson('/api/v1/expenses?status=approved', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Fuel');
    }

    public function test_sales_search_across_relations_returns_ok(): void
    {
        $response = $this->postJson('/api/v1/sales', [
            'sale_date' => now()->toDateString(),
            'items' => [
                ['description' => 'Teff grain', 'quantity' => 10, 'unit' => 'quintal', 'unit_price' => 4500],
            ],
        ], $this->auth());

        $response->assertCreated();
        $invoice = $response->json('data.invoice_number');

        $this->getJson('/api/v1/sales?q='.urlencode($invoice), $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/sales?q=no-such-invoice', $this->auth())
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_payment_without_sale_id_key_returns_validation_error(): void
    {
        $this->postJson('/api/v1/payments', [
            'amount' => 100,
            'method' => 'cash',
        ], $this->auth())
            ->assertStatus(422)
            ->assertJson(['message' => 'A payment must be linked to a sale or an expense.']);
    }

    public function test_date_range_flags_do_not_become_column_filters(): void
    {
        $this->getJson('/api/v1/farms?from=2026-01-01&to=2026-12-31', $this->auth())->assertOk();
        $this->getJson('/api/v1/inventory-items?low_stock=1', $this->auth())->assertOk();
        $this->getJson('/api/v1/activities?overdue=1&upcoming=1', $this->auth())->assertOk();
    }

    public function test_foreign_keys_from_another_tenant_are_rejected(): void
    {
        $rival = $this->makeTenant('rival-tenant');
        $rivalFarmId = $this->postJson('/api/v1/farms', [
            'name' => 'Rival Farm',
            'type' => 'commercial',
            'area_hectares' => 5,
        ], $this->auth())
            ->assertCreated()
            ->json('data.id');

        $rivalToken = $this->loginAs($rival['users']['owner']);

        $this->postJson('/api/v1/fields', [
            'farm_id' => $rivalFarmId,
            'name' => 'Borrowed field',
            'area_hectares' => 1,
        ], ['Authorization' => 'Bearer '.$rivalToken, 'Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['farm_id']);
    }

    public function test_wildcard_foreign_keys_from_another_tenant_are_rejected(): void
    {
        $this->postJson('/api/v1/sales', [
            'sale_date' => now()->toDateString(),
            'items' => [[
                'description' => 'Grain',
                'quantity' => 1,
                'unit_price' => 100,
                'harvest_batch_id' => 999999,
            ]],
        ], $this->auth())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['items.0.harvest_batch_id']);
    }
}
