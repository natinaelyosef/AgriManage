<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class FinanceDepthTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('finance-farm');
        $this->token = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(string $token = null): array
    {
        return ['Authorization' => 'Bearer '.($token ?? $this->token), 'Accept' => 'application/json'];
    }

    private function makeWorker(string $name, float $rate): array
    {
        return $this->postJson('/api/v1/workers', [
            'name' => $name,
            'daily_rate' => $rate,
            'status' => 'active',
        ], $this->auth())->assertCreated()->json('data');
    }

    public function test_role_boundaries_on_finance_modules(): void
    {
        $workerToken = $this->loginAs($this->tenant['users']['worker']);
        $accountantToken = $this->loginAs($this->tenant['users']['accountant']);
        $agronomistToken = $this->loginAs($this->tenant['users']['agronomist']);

        $this->getJson('/api/v1/payroll-runs', $this->auth($workerToken))->assertForbidden();
        $this->getJson('/api/v1/budgets', $this->auth($workerToken))->assertForbidden();
        $this->getJson('/api/v1/attendance-records', $this->auth($workerToken))->assertOk();

        $worker = $this->makeWorker('Boundary Worker', 200);

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $worker['id'],
            'work_date' => '2026-10-05',
        ], $this->auth($accountantToken))->assertForbidden();

        $this->postJson('/api/v1/budgets', [
            'name' => 'Agro budget',
            'category' => 'inputs',
            'period_start' => '2026-10-01',
            'period_end' => '2026-12-31',
            'amount' => 1000,
        ], $this->auth($agronomistToken))->assertForbidden();

        $this->postJson('/api/v1/purchase-orders', [
            'supplier' => 'Acc Supplier',
            'order_date' => '2026-10-05',
            'items' => [['description' => 'Item', 'quantity' => 1, 'unit_price' => 100]],
        ], $this->auth($accountantToken))->assertCreated();

        $this->postJson('/api/v1/payroll-runs', [
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
        ], $this->auth($accountantToken))->assertCreated();
    }

    public function test_attendance_rejects_duplicates_and_cross_tenant_workers(): void
    {
        $worker = $this->makeWorker('Dup Worker', 150);

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $worker['id'],
            'work_date' => '2026-10-05',
            'status' => 'present',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $worker['id'],
            'work_date' => '2026-10-05',
            'status' => 'absent',
        ], $this->auth())->assertStatus(422)->assertJsonValidationErrors(['worker_id']);

        $foreign = $this->makeTenant('other-finance');
        $foreignWorker = $this->postJson('/api/v1/workers', [
            'name' => 'Foreign Worker',
            'daily_rate' => 100,
        ], $this->auth($this->loginAs($foreign['users']['owner'])))->assertCreated()->json('data');

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $foreignWorker['id'],
            'work_date' => '2026-10-06',
        ], $this->auth())->assertStatus(422);

        $this->getJson('/api/v1/attendance-records?from=2026-10-05&to=2026-10-05', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/attendance-records?status=present', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_payroll_run_generates_items_from_attendance(): void
    {
        $alice = $this->makeWorker('Alice', 200);
        $bob = $this->makeWorker('Bob', 150);

        foreach (['2026-10-01', '2026-10-02', '2026-10-03'] as $date) {
            $this->postJson('/api/v1/attendance-records', [
                'worker_id' => $alice['id'],
                'work_date' => $date,
                'status' => 'present',
            ], $this->auth())->assertCreated();
        }

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $bob['id'],
            'work_date' => '2026-10-01',
            'status' => 'half_day',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $bob['id'],
            'work_date' => '2026-10-02',
            'status' => 'present',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/attendance-records', [
            'worker_id' => $bob['id'],
            'work_date' => '2026-10-04',
            'status' => 'absent',
        ], $this->auth())->assertCreated();

        $run = $this->postJson('/api/v1/payroll-runs', [
            'period_start' => '2026-10-01',
            'period_end' => '2026-10-31',
        ], $this->auth())->assertCreated()->json('data');

        $this->assertCount(2, $run['items']);
        $this->assertSame(825.0, (float) $run['total']);

        $aliceItem = collect($run['items'])->firstWhere('worker_id', $alice['id']);
        $bobItem = collect($run['items'])->firstWhere('worker_id', $bob['id']);

        $this->assertSame(3.0, (float) $aliceItem['days_worked']);
        $this->assertSame(600.0, (float) $aliceItem['net']);
        $this->assertSame(1.5, (float) $bobItem['days_worked']);
        $this->assertSame(225.0, (float) $bobItem['net']);

        $this->postJson('/api/v1/payroll-runs', [
            'period_start' => '2026-11-01',
            'period_end' => '2026-11-30',
        ], $this->auth())
            ->assertCreated()
            ->assertJsonPath('data.items', []);
    }

    public function test_purchase_order_totalling_and_recompute(): void
    {
        $po = $this->postJson('/api/v1/purchase-orders', [
            'supplier' => 'Fertilizer Co',
            'order_date' => '2026-10-05',
            'items' => [
                ['description' => 'Urea', 'quantity' => 10, 'unit' => 'bag', 'unit_price' => 1200],
                ['description' => 'DAP', 'quantity' => 5, 'unit' => 'bag', 'unit_price' => 1500],
            ],
        ], $this->auth())->assertCreated()->json('data');

        $this->assertStringStartsWith('PO-', $po['po_number']);
        $this->assertSame(19500.0, (float) $po['total']);
        $this->assertCount(2, $po['items']);

        $updated = $this->putJson("/api/v1/purchase-orders/{$po['id']}", [
            'supplier' => 'Fertilizer Co',
            'order_date' => '2026-10-05',
            'status' => 'sent',
            'items' => [
                ['description' => 'Urea', 'quantity' => 20, 'unit' => 'bag', 'unit_price' => 1200],
            ],
        ], $this->auth())->assertOk()->json('data');

        $this->assertSame(24000.0, (float) $updated['total']);
        $this->assertCount(1, $updated['items']);
        $this->assertSame('sent', $updated['status']);

        $this->getJson('/api/v1/purchase-orders?status=sent', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_budget_reports_spent_amounts(): void
    {
        $farm = $this->postJson('/api/v1/farms', [
            'name' => 'Budget Farm',
            'type' => 'commercial',
            'area_hectares' => 5,
        ], $this->auth())->assertCreated()->json('data');

        $budget = $this->postJson('/api/v1/budgets', [
            'name' => 'Inputs budget',
            'category' => 'inputs',
            'period_start' => '2026-10-01',
            'period_end' => '2026-12-31',
            'amount' => 50000,
            'farm_id' => $farm['id'],
        ], $this->auth())->assertCreated()->json('data');

        $this->postJson('/api/v1/expenses', [
            'title' => 'Seed purchase',
            'category' => 'inputs',
            'amount' => 8000,
            'expense_date' => '2026-10-10',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/expenses', [
            'title' => 'Fuel outside budget window',
            'category' => 'inputs',
            'amount' => 3000,
            'expense_date' => '2027-01-15',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/expenses', [
            'title' => 'Repairs',
            'category' => 'repairs',
            'amount' => 2500,
            'expense_date' => '2026-10-20',
        ], $this->auth())->assertCreated();

        $listed = $this->getJson('/api/v1/budgets', $this->auth())->assertOk()->json('data');

        $this->assertCount(1, $listed);
        $this->assertSame(8000.0, (float) $listed[0]['spent']);
        $this->assertSame(50000.0, (float) $listed[0]['amount']);
        $this->assertNotNull($listed[0]['farm'] ?? null);

        $this->assertSame(8000.0, (float) $this->getJson("/api/v1/budgets/{$budget['id']}", $this->auth())
            ->assertOk()
            ->json('data.spent'));
    }
}
