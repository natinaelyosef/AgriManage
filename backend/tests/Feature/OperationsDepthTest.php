<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class OperationsDepthTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;

    private string $token;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('ops-farm');
        $this->token = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(string $token = null): array
    {
        return ['Authorization' => 'Bearer '.($token ?? $this->token), 'Accept' => 'application/json'];
    }

    private function seedBase(): array
    {
        $farm = $this->postJson('/api/v1/farms', [
            'name' => 'Ops Farm',
            'type' => 'commercial',
            'area_hectares' => 5,
        ], $this->auth())->assertCreated()->json('data');

        $field = $this->postJson('/api/v1/fields', [
            'farm_id' => $farm['id'],
            'name' => 'Ops Field',
            'area_hectares' => 2,
        ], $this->auth())->assertCreated()->json('data');

        return ['farm' => $farm, 'field' => $field];
    }

    public function test_worker_can_log_irrigation_but_not_treatments(): void
    {
        $base = $this->seedBase();
        $workerToken = $this->loginAs($this->tenant['users']['worker']);

        $this->postJson('/api/v1/irrigation-events', [
            'field_id' => $base['field']['id'],
            'irrigation_date' => '2026-10-05',
            'method' => 'manual',
        ], $this->auth($workerToken))->assertCreated();

        $this->postJson('/api/v1/treatments', [
            'field_id' => $base['field']['id'],
            'applied_date' => '2026-10-05',
            'category' => 'fertilizer',
            'product_name' => 'Urea',
        ], $this->auth($workerToken))->assertForbidden();
    }

    public function test_agronomist_cannot_manage_equipment_and_accountant_cannot_write_maintenance(): void
    {
        $agronomistToken = $this->loginAs($this->tenant['users']['agronomist']);
        $accountantToken = $this->loginAs($this->tenant['users']['accountant']);

        $this->postJson('/api/v1/equipment', [
            'name' => 'Agro Tractor',
            'type' => 'tractor',
        ], $this->auth($agronomistToken))->assertForbidden();

        $this->postJson('/api/v1/equipment', [
            'name' => 'Acc Tractor',
            'type' => 'tractor',
        ], $this->auth($accountantToken))->assertForbidden();

        $machine = $this->postJson('/api/v1/equipment', [
            'name' => 'Shared Tractor',
            'type' => 'tractor',
        ], $this->auth())->assertCreated()->json('data');

        $this->getJson('/api/v1/maintenance-records', $this->auth($accountantToken))->assertOk();

        $this->postJson('/api/v1/maintenance-records', [
            'equipment_id' => $machine['id'],
            'title' => 'Oil change',
            'type' => 'preventive',
        ], $this->auth($accountantToken))->assertForbidden();
    }

    public function test_cross_tenant_references_are_rejected(): void
    {
        $foreign = $this->makeTenant('other-ops');
        $foreignFarm = $this->postJson('/api/v1/farms', [
            'name' => 'Foreign Farm',
            'type' => 'smallholder',
            'area_hectares' => 1,
        ], $this->auth($this->loginAs($foreign['users']['owner'])))->assertCreated()->json('data');
        $foreignField = $this->postJson('/api/v1/fields', [
            'farm_id' => $foreignFarm['id'],
            'name' => 'Foreign Field',
            'area_hectares' => 1,
        ], $this->auth($this->loginAs($foreign['users']['owner'])))->assertCreated()->json('data');

        $this->postJson('/api/v1/irrigation-events', [
            'field_id' => $foreignField['id'],
            'irrigation_date' => '2026-10-05',
            'method' => 'drip',
        ], $this->auth())->assertStatus(422);

        $foreignMachine = $this->postJson('/api/v1/equipment', [
            'name' => 'Foreign Tractor',
            'type' => 'tractor',
        ], $this->auth($this->loginAs($foreign['users']['owner'])))->assertCreated()->json('data');

        $this->postJson('/api/v1/maintenance-records', [
            'equipment_id' => $foreignMachine['id'],
            'title' => 'Foreign service',
            'type' => 'repair',
        ], $this->auth())->assertStatus(422);
    }

    public function test_irrigation_requires_a_field(): void
    {
        $this->postJson('/api/v1/irrigation-events', [
            'irrigation_date' => '2026-10-05',
            'method' => 'drip',
        ], $this->auth())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['field_id']);
    }

    public function test_overdue_maintenance_filter_and_dashboard_kpi(): void
    {
        $machine = $this->postJson('/api/v1/equipment', [
            'name' => 'Service Tractor',
            'type' => 'tractor',
        ], $this->auth())->assertCreated()->json('data');

        $overdue = $this->postJson('/api/v1/maintenance-records', [
            'equipment_id' => $machine['id'],
            'title' => 'Brake service overdue',
            'type' => 'preventive',
            'next_due_date' => now()->subDays(3)->toDateString(),
        ], $this->auth())->assertCreated()->json('data');

        $this->postJson('/api/v1/maintenance-records', [
            'equipment_id' => $machine['id'],
            'title' => 'Old completed job',
            'type' => 'repair',
            'status' => 'completed',
            'next_due_date' => now()->subDays(10)->toDateString(),
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/maintenance-records', [
            'equipment_id' => $machine['id'],
            'title' => 'Upcoming service',
            'type' => 'scheduled',
            'next_due_date' => now()->addDays(5)->toDateString(),
        ], $this->auth())->assertCreated();

        $this->getJson('/api/v1/maintenance-records?overdue=1', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $overdue['id']);

        $this->getJson('/api/v1/dashboard', $this->auth())
            ->assertOk()
            ->assertJsonPath('data.kpis.overdue_maintenance', 1);

        $this->getJson('/api/v1/maintenance-records?status=completed', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_search_and_sort_work_on_new_resources(): void
    {
        $base = $this->seedBase();

        $this->postJson('/api/v1/treatments', [
            'field_id' => $base['field']['id'],
            'applied_date' => '2026-10-05',
            'category' => 'herbicide',
            'product_name' => 'Roundup 360',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/treatments', [
            'field_id' => $base['field']['id'],
            'applied_date' => '2026-10-06',
            'category' => 'fertilizer',
            'product_name' => 'DAP',
        ], $this->auth())->assertCreated();

        $this->getJson('/api/v1/treatments?q=Roundup', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/treatments?category=fertilizer', $this->auth())
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/treatments?sort=product_name', $this->auth())->assertOk();
        $this->getJson('/api/v1/irrigation-events?sort=irrigation_date', $this->auth())->assertOk();
        $this->getJson('/api/v1/equipment?sort=hours_meter', $this->auth())->assertOk();

        $this->getJson('/api/v1/meta/lookups', $this->auth())
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'irrigation_methods',
                    'irrigation_sources',
                    'treatment_categories',
                    'treatment_methods',
                    'equipment_types',
                    'equipment_statuses',
                    'maintenance_types',
                    'maintenance_statuses',
                ],
            ]);
    }
}
