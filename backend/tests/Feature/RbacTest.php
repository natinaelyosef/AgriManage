<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    public function test_worker_can_not_create_a_farm(): void
    {
        $tenant = $this->makeTenant('rbac-farm');
        $token = $this->loginAs($tenant['users']['worker']);

        $this->postJson('/api/v1/farms', [
            'name' => 'Blocked Farm',
            'type' => 'commercial',
            'area_hectares' => 4,
        ], ['Authorization' => 'Bearer '.$token])->assertForbidden();
    }

    public function test_owner_can_create_and_worker_can_read(): void
    {
        $tenant = $this->makeTenant('rbac-farm-2');
        $ownerToken = $this->loginAs($tenant['users']['owner']);

        $this->postJson('/api/v1/farms', [
            'name' => 'Owner Farm',
            'type' => 'commercial',
            'area_hectares' => 4,
        ], ['Authorization' => 'Bearer '.$ownerToken])->assertCreated();

        $workerToken = $this->loginAs($tenant['users']['worker']);

        $this->getJson('/api/v1/farms', ['Authorization' => 'Bearer '.$workerToken])
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_accountant_can_create_expense_but_agronomist_cannot(): void
    {
        $tenant = $this->makeTenant('rbac-expense');

        $accountant = $this->loginAs($tenant['users']['accountant']);

        $this->postJson('/api/v1/expenses', [
            'title' => 'Seed purchase',
            'category' => 'inputs',
            'amount' => 1500,
            'expense_date' => now()->toDateString(),
        ], ['Authorization' => 'Bearer '.$accountant])->assertCreated();

        $agronomist = $this->loginAs($tenant['users']['agronomist']);

        $this->postJson('/api/v1/expenses', [
            'title' => 'Not allowed',
            'category' => 'inputs',
            'amount' => 100,
            'expense_date' => now()->toDateString(),
        ], ['Authorization' => 'Bearer '.$agronomist])->assertForbidden();
    }

    public function test_only_privileged_roles_can_view_audit_logs(): void
    {
        $tenant = $this->makeTenant('rbac-audit');

        $owner = $this->loginAs($tenant['users']['owner']);
        $this->getJson('/api/v1/audit-logs', ['Authorization' => 'Bearer '.$owner])->assertOk();

        $agronomist = $this->loginAs($tenant['users']['agronomist']);
        $this->getJson('/api/v1/audit-logs', ['Authorization' => 'Bearer '.$agronomist])->assertForbidden();
    }
}
