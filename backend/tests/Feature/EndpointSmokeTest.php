<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

/**
 * Exercises every resource endpoint the frontend talks to: create → index →
 * show → update → delete, plus the custom actions (stock adjust, payment
 * verify/reject, notifications, search, dashboard and reports).
 */
class EndpointSmokeTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $tenant = $this->makeTenant('smoke-farm');
        $this->token = $this->loginAs($tenant['users']['owner']);
    }

    private function auth(): array
    {
        return ['Authorization' => 'Bearer '.$this->token, 'Accept' => 'application/json'];
    }

    private function created(string $uri, array $payload): array
    {
        $response = $this->postJson('/api/v1/'.$uri, $payload, $this->auth());
        $response->assertCreated();

        return $response->json('data');
    }

    public function test_full_crud_lifecycle_for_every_resource(): void
    {
        $farm = $this->created('farms', ['name' => 'Smoke Farm', 'type' => 'commercial', 'area_hectares' => 10]);
        $field = $this->created('fields', ['farm_id' => $farm['id'], 'name' => 'Smoke Field', 'area_hectares' => 4]);
        $season = $this->created('seasons', [
            'name' => 'Smoke Season',
            'year' => 2026,
            'start_date' => '2026-09-11',
            'end_date' => '2027-09-10',
        ]);
        $crop = $this->created('crops', ['name' => 'Smoke Teff', 'category' => 'cereal']);
        $plan = $this->created('crop-plans', [
            'season_id' => $season['id'],
            'field_id' => $field['id'],
            'crop_id' => $crop['id'],
            'planned_area_hectares' => 2,
        ]);
        $activity = $this->created('activities', ['title' => 'Smoke weeding', 'type' => 'weeding']);
        $batch = $this->created('harvest-batches', [
            'harvest_date' => '2026-10-01',
            'quantity' => 5,
            'unit' => 'quintal',
        ]);
        $worker = $this->created('workers', ['name' => 'Smoke Worker']);
        $item = $this->created('inventory-items', ['name' => 'Smoke Seed', 'category' => 'seed', 'quantity' => 10]);
        $customer = $this->created('customers', ['name' => 'Smoke Buyer']);
        $expense = $this->created('expenses', [
            'title' => 'Smoke fuel',
            'category' => 'fuel',
            'amount' => 100,
            'expense_date' => '2026-10-01',
        ]);
        $sale = $this->created('sales', [
            'sale_date' => '2026-10-01',
            'customer_id' => $customer['id'],
            'items' => [['description' => 'Teff grain', 'quantity' => 2, 'unit' => 'quintal', 'unit_price' => 5000]],
        ]);
        $payment = $this->created('payments', ['amount' => 500, 'method' => 'cash', 'sale_id' => $sale['id']]);
        $irrigation = $this->created('irrigation-events', [
            'field_id' => $field['id'],
            'farm_id' => $farm['id'],
            'irrigation_date' => '2026-10-01',
            'method' => 'drip',
            'volume_m3' => 120,
        ]);
        $treatment = $this->created('treatments', [
            'field_id' => $field['id'],
            'applied_date' => '2026-10-02',
            'category' => 'fertilizer',
            'product_name' => 'Urea 46%',
        ]);
        $machine = $this->created('equipment', [
            'name' => 'Smoke Tractor',
            'type' => 'tractor',
        ]);
        $maintenance = $this->created('maintenance-records', [
            'equipment_id' => $machine['id'],
            'title' => 'Smoke oil change',
            'type' => 'preventive',
        ]);
        $attendance = $this->created('attendance-records', [
            'worker_id' => $worker['id'],
            'work_date' => '2026-10-01',
            'status' => 'present',
            'hours' => 8,
        ]);
        $budget = $this->created('budgets', [
            'name' => 'Smoke Inputs Budget',
            'category' => 'inputs',
            'period_start' => '2026-10-01',
            'period_end' => '2026-12-31',
            'amount' => 50000,
        ]);
        $po = $this->created('purchase-orders', [
            'supplier' => 'Smoke Supplies Ltd',
            'order_date' => '2026-10-03',
            'items' => [['description' => 'Fertilizer bag', 'quantity' => 10, 'unit' => 'bag', 'unit_price' => 1200]],
        ]);
        $payroll = $this->created('payroll-runs', [
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
        ]);
        $landRecord = $this->created('land-records', [
            'parcel_name' => 'Smoke Deed',
            'holder_name' => 'Smoke Holder',
            'area_hectares' => 3,
        ]);
        $contract = $this->created('contracts', [
            'title' => 'Smoke Contract',
            'counterparty' => 'Smoke Party',
            'start_date' => '2026-10-01',
            'value' => 10000,
        ]);
        $exportDoc = $this->created('export-documents', [
            'product' => 'Teff',
            'quantity' => 10,
            'unit_price' => 5000,
            'destination_country' => 'Germany',
        ]);

        $this->assertSame('pending', $payment['status']);
        $this->assertNotEmpty($batch['batch_number']);

        $records = [
            ['farms', $farm, ['name' => 'Smoke Farm 2', 'type' => 'commercial', 'area_hectares' => 11], 'name'],
            ['fields', $field, ['farm_id' => $farm['id'], 'name' => 'Smoke Field 2', 'area_hectares' => 4], 'name'],
            ['seasons', $season, ['name' => 'Smoke Season 2', 'year' => 2026, 'start_date' => '2026-09-11', 'end_date' => '2027-09-10'], 'name'],
            ['crops', $crop, ['name' => 'Smoke Teff 2', 'category' => 'cereal'], 'name'],
            ['crop-plans', $plan, ['season_id' => $season['id'], 'field_id' => $field['id'], 'crop_id' => $crop['id'], 'planned_area_hectares' => 3], 'planned_area_hectares'],
            ['activities', $activity, ['title' => 'Smoke weeding 2', 'type' => 'weeding'], 'title'],
            ['harvest-batches', $batch, ['harvest_date' => '2026-10-02', 'quantity' => 6], 'quantity'],
            ['workers', $worker, ['name' => 'Smoke Worker 2'], 'name'],
            ['inventory-items', $item, ['name' => 'Smoke Seed 2', 'category' => 'seed'], 'name'],
            ['customers', $customer, ['name' => 'Smoke Buyer 2'], 'name'],
            ['expenses', $expense, ['title' => 'Smoke fuel 2', 'category' => 'fuel', 'amount' => 150, 'expense_date' => '2026-10-02'], 'title'],
            ['sales', $sale, [
                'sale_date' => '2026-10-01',
                'customer_id' => $customer['id'],
                'items' => [['description' => 'Teff grain', 'quantity' => 3, 'unit' => 'quintal', 'unit_price' => 5000]],
            ], 'invoice_number'],
            ['irrigation-events', $irrigation, [
                'field_id' => $field['id'],
                'irrigation_date' => '2026-10-03',
                'method' => 'sprinkler',
                'volume_m3' => 150,
            ], 'method'],
            ['treatments', $treatment, [
                'field_id' => $field['id'],
                'applied_date' => '2026-10-04',
                'category' => 'pesticide',
                'product_name' => 'Cypermethrin',
            ], 'product_name'],
            ['equipment', $machine, ['name' => 'Smoke Tractor 2', 'type' => 'implement'], 'name'],
            ['maintenance-records', $maintenance, [
                'equipment_id' => $machine['id'],
                'title' => 'Smoke tire repair',
                'type' => 'repair',
                'status' => 'completed',
                'performed_date' => '2026-10-04',
            ], 'title'],
            ['attendance-records', $attendance, [
                'worker_id' => $worker['id'],
                'work_date' => '2026-10-01',
                'status' => 'late',
                'hours' => 6,
            ], 'status'],
            ['budgets', $budget, [
                'name' => 'Smoke Inputs Budget 2',
                'category' => 'inputs',
                'period_start' => '2026-10-01',
                'period_end' => '2026-12-31',
                'amount' => 75000,
            ], 'name'],
            ['purchase-orders', $po, [
                'supplier' => 'Smoke Supplies Ltd 2',
                'order_date' => '2026-10-03',
                'items' => [['description' => 'Fertilizer bag', 'quantity' => 5, 'unit' => 'bag', 'unit_price' => 1500]],
            ], 'supplier'],
            ['payroll-runs', $payroll, ['status' => 'submitted'], 'status'],
            ['land-records', $landRecord, [
                'parcel_name' => 'Smoke Deed 2',
                'holder_name' => 'Smoke Holder',
                'area_hectares' => 4,
                'status' => 'active',
            ], 'parcel_name'],
            ['contracts', $contract, [
                'title' => 'Smoke Contract 2',
                'counterparty' => 'Smoke Party',
                'start_date' => '2026-10-01',
                'value' => 15000,
                'status' => 'active',
            ], 'status'],
            ['export-documents', $exportDoc, [
                'product' => 'Teff Grade A',
                'quantity' => 20,
                'unit_price' => 5000,
                'destination_country' => 'Germany',
            ], 'product'],
        ];

        foreach ($records as [$uri, $record, $update, $field]) {
            $this->getJson("/api/v1/{$uri}", $this->auth())->assertOk();

            $this->getJson("/api/v1/{$uri}/{$record['id']}", $this->auth())
                ->assertOk()
                ->assertJsonPath('data.id', $record['id']);

            $updated = $this->putJson("/api/v1/{$uri}/{$record['id']}", $update, $this->auth());
            $updated->assertOk();

            if ($field !== 'invoice_number' && $field !== 'quantity') {
                $this->assertSame($update[$field], $updated->json("data.{$field}"));
            }
        }

        $this->assertNotSame($payment['id'], null);

        foreach (array_reverse($records) as [$uri, $record]) {
            $this->deleteJson("/api/v1/{$uri}/{$record['id']}", [], $this->auth())->assertOk();
            $this->getJson("/api/v1/{$uri}/{$record['id']}", $this->auth())->assertNotFound();
        }
    }

    public function test_custom_actions_work(): void
    {
        $item = $this->created('inventory-items', ['name' => 'Adjustable', 'category' => 'seed', 'quantity' => 10]);
        $customer = $this->created('customers', ['name' => 'Payee Corp']);
        $sale = $this->created('sales', [
            'sale_date' => '2026-10-01',
            'customer_id' => $customer['id'],
            'items' => [['description' => 'Barley', 'quantity' => 1, 'unit' => 'quintal', 'unit_price' => 2000]],
        ]);

        $adjusted = $this->postJson("/api/v1/inventory-items/{$item['id']}/adjust", [
            'type' => 'out',
            'quantity' => 3,
            'reason' => 'Issued to field',
        ], $this->auth());

        $adjusted->assertOk()->assertJsonPath('data.quantity', 7);

        $this->getJson("/api/v1/inventory-items/{$item['id']}/movements", $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $payment = $this->created('payments', ['amount' => 2000, 'method' => 'cash', 'sale_id' => $sale['id']]);

        $verified = $this->postJson("/api/v1/payments/{$payment['id']}/verify", [], $this->auth());
        $verified->assertOk()->assertJsonPath('data.status', 'verified');

        $rejectedPayment = $this->created('payments', ['amount' => 100, 'method' => 'cash', 'sale_id' => $sale['id']]);
        $this->postJson("/api/v1/payments/{$rejectedPayment['id']}/reject", [
            'reason' => 'Wrong reference number',
        ], $this->auth())
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Wrong reference number');

        $this->getJson('/api/v1/notifications', $this->auth())->assertOk();
        $this->postJson('/api/v1/notifications/read-all', [], $this->auth())->assertOk();

        $this->getJson('/api/v1/search?q=Payee', $this->auth())->assertOk();
        $this->getJson('/api/v1/dashboard', $this->auth())
            ->assertOk()
            ->assertJsonStructure(['data' => ['kpis' => ['water_usage_m3', 'overdue_maintenance']]]);
        $this->getJson('/api/v1/reports/profitability', $this->auth())->assertOk();
        $this->getJson('/api/v1/reports/cash-summary', $this->auth())->assertOk();
        $this->getJson('/api/v1/reports/analytics', $this->auth())
            ->assertOk()
            ->assertJsonStructure(['data' => ['trends', 'forecast', 'cashflow', 'field_map']]);
        $this->getJson('/api/v1/audit-logs', $this->auth())->assertOk();
        $this->getJson('/api/v1/meta/lookups', $this->auth())->assertOk();
        $this->getJson('/api/v1/auth/me', $this->auth())->assertOk();
    }
}
