<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class AnalyticsTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('analytics-farm');
        $this->token = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(string $token = null): array
    {
        return ['Authorization' => 'Bearer '.($token ?? $this->token), 'Accept' => 'application/json'];
    }

    private function created(string $uri, array $payload): array
    {
        return $this->postJson('/api/v1/'.$uri, $payload, $this->auth())
            ->assertCreated()
            ->json('data');
    }

    public function test_analytics_returns_all_four_sections(): void
    {
        $this->getJson('/api/v1/reports/analytics', $this->auth())
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'trends' => ['from', 'to', 'months', 'totals'],
                    'forecast' => ['season', 'rows', 'totals'],
                    'cashflow' => ['opening_balance', 'receivables', 'months', 'totals'],
                    'field_map' => ['bounds', 'fields', 'totals'],
                ],
            ])
            ->assertJsonCount(12, 'data.trends.months')
            ->assertJsonCount(6, 'data.cashflow.months');
    }

    public function test_trends_forecast_and_cashflow_aggregate_org_data(): void
    {
        $farm = $this->created('farms', ['name' => 'Analytics Farm', 'type' => 'commercial', 'area_hectares' => 20]);
        $field = $this->created('fields', [
            'farm_id' => $farm['id'],
            'name' => 'Analytics Field',
            'area_hectares' => 2,
        ]);
        $season = $this->created('seasons', [
            'name' => 'Analytics Season',
            'year' => 2026,
            'start_date' => now()->subMonths(3)->toDateString(),
            'end_date' => now()->addMonths(6)->toDateString(),
        ]);
        $crop = $this->created('crops', ['name' => 'Analytics Teff', 'category' => 'cereal']);
        $this->created('crop-plans', [
            'season_id' => $season['id'],
            'field_id' => $field['id'],
            'crop_id' => $crop['id'],
            'planned_area_hectares' => 2,
            'status' => 'growing',
        ]);
        $this->created('harvest-batches', [
            'field_id' => $field['id'],
            'crop_id' => $crop['id'],
            'harvest_date' => now()->toDateString(),
            'quantity' => 40,
            'unit' => 'quintal',
        ]);

        $customer = $this->created('customers', ['name' => 'Analytics Buyer']);
        $sale = $this->created('sales', [
            'sale_date' => now()->toDateString(),
            'customer_id' => $customer['id'],
            'items' => [['description' => 'Teff grain', 'quantity' => 2, 'unit' => 'quintal', 'unit_price' => 5000]],
        ]);
        $payment = $this->created('payments', ['amount' => 4000, 'method' => 'cash', 'sale_id' => $sale['id']]);
        $this->postJson("/api/v1/payments/{$payment['id']}/verify", [], $this->auth())->assertOk();
        $this->created('expenses', [
            'title' => 'Analytics fuel',
            'category' => 'fuel',
            'amount' => 1000,
            'expense_date' => now()->toDateString(),
        ]);

        $analytics = $this->getJson('/api/v1/reports/analytics', $this->auth())
            ->assertOk()
            ->json('data');

        $this->assertSame(10000.0, (float) $analytics['trends']['totals']['revenue']);
        $this->assertSame(1000.0, (float) $analytics['trends']['totals']['expenses']);
        $this->assertSame(9000.0, (float) $analytics['trends']['totals']['profit']);

        $this->assertSame(6000.0, (float) $analytics['cashflow']['receivables']);
        $this->assertSame(3000.0, (float) $analytics['cashflow']['opening_balance']);

        $forecastRow = collect($analytics['forecast']['rows'])
            ->firstWhere('crop', 'Analytics Teff');
        $this->assertNotNull($forecastRow);
        $this->assertSame(20.0, (float) $forecastRow['historical_yield_per_ha']);
        $this->assertSame(40.0, (float) $forecastRow['forecast_quantity']);

        $this->assertSame('Analytics Season', $analytics['forecast']['season']);
    }

    public function test_cashflow_projects_contracts_and_budgets(): void
    {
        $this->created('contracts', [
            'title' => 'Analytics supply deal',
            'type' => 'produce_sale',
            'counterparty' => 'Analytics Millers',
            'start_date' => now()->subDays(5)->toDateString(),
            'end_date' => now()->addMonths(5)->toDateString(),
            'value' => 120000,
            'status' => 'active',
        ]);
        $this->created('budgets', [
            'name' => 'Analytics Inputs',
            'category' => 'inputs',
            'period_start' => now()->startOfMonth()->toDateString(),
            'period_end' => now()->startOfMonth()->addMonths(2)->toDateString(),
            'amount' => 60000,
        ]);

        $analytics = $this->getJson('/api/v1/reports/analytics', $this->auth())
            ->assertOk()
            ->json('data');

        $months = collect($analytics['cashflow']['months']);
        $this->assertCount(6, $months);

        $this->assertSame(20000.0, (float) $months[0]['inflow']['contracts']);
        $this->assertSame(20000.0, (float) $months[0]['outflow']['budgeted']);
        $this->assertSame(0.0, (float) $months[0]['net']);
        $this->assertSame(0.0, (float) $months[0]['inflow']['accounts_receivable']);

        $this->assertSame(0.0, (float) $months[3]['outflow']['budgeted']);
        $this->assertSame(20000.0, (float) $months[3]['inflow']['contracts']);
    }

    public function test_field_map_is_populated_and_tenant_isolated(): void
    {
        $farm = $this->created('farms', ['name' => 'Mapped Farm', 'type' => 'commercial', 'area_hectares' => 30]);
        $this->created('fields', [
            'farm_id' => $farm['id'],
            'name' => 'Mapped Field',
            'area_hectares' => 6,
            'latitude' => 8.55,
            'longitude' => 39.27,
        ]);

        $foreign = $this->makeTenant('other-analytics');
        $foreignToken = $this->loginAs($foreign['users']['owner']);
        $foreignCustomer = $this->postJson('/api/v1/customers', ['name' => 'Foreign Buyer'], $this->auth($foreignToken))
            ->assertCreated()
            ->json('data');
        $this->postJson('/api/v1/sales', [
            'sale_date' => now()->toDateString(),
            'customer_id' => $foreignCustomer['id'],
            'items' => [['description' => 'Foreign teff', 'quantity' => 100, 'unit' => 'quintal', 'unit_price' => 9000]],
        ], $this->auth($foreignToken))->assertCreated();

        $analytics = $this->getJson('/api/v1/reports/analytics', $this->auth())
            ->assertOk()
            ->json('data');

        $this->assertSame(1, (int) $analytics['field_map']['totals']['fields']);
        $this->assertNotNull($analytics['field_map']['bounds']);
        $this->assertSame(8.55, (float) $analytics['field_map']['bounds']['min_latitude']);

        $mapped = collect($analytics['field_map']['fields'])->first();
        $this->assertSame('Mapped Farm', $mapped['farm']);
        $this->assertArrayHasKey('crop', $mapped);

        $this->assertSame(0.0, (float) $analytics['trends']['totals']['revenue']);
    }
}
