<?php

namespace Tests\Feature;

use App\Models\Farm;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    public function test_a_tenant_only_sees_its_own_farms(): void
    {
        $alpha = $this->makeTenant('alpha-farm');
        $beta = $this->makeTenant('beta-farm');

        Farm::create([
            'organization_id' => $alpha['organization']->id,
            'name' => 'Alpha Fields',
            'type' => 'commercial',
            'area_hectares' => 10,
        ]);

        Farm::create([
            'organization_id' => $beta['organization']->id,
            'name' => 'Beta Fields',
            'type' => 'commercial',
            'area_hectares' => 20,
        ]);

        $token = $this->loginAs($alpha['users']['owner']);

        $response = $this->getJson('/api/v1/farms', ['Authorization' => 'Bearer '.$token]);

        $response->assertOk()->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Alpha Fields');
    }

    public function test_tenant_id_can_not_be_injected_through_the_payload(): void
    {
        $alpha = $this->makeTenant('alpha-2');
        $beta = $this->makeTenant('beta-2');

        $token = $this->loginAs($alpha['users']['owner']);

        $this->postJson('/api/v1/farms', [
            'name' => 'Injected',
            'type' => 'commercial',
            'area_hectares' => 5,
            'organization_id' => $beta['organization']->id,
        ], ['Authorization' => 'Bearer '.$token])->assertCreated();

        $this->assertDatabaseHas('farms', [
            'name' => 'Injected',
            'organization_id' => $alpha['organization']->id,
        ]);

        $this->assertDatabaseMissing('farms', [
            'name' => 'Injected',
            'organization_id' => $beta['organization']->id,
        ]);
    }

    public function test_cross_tenant_record_lookup_returns_404(): void
    {
        $alpha = $this->makeTenant('alpha-3');
        $beta = $this->makeTenant('beta-3');

        $farm = Farm::create([
            'organization_id' => $beta['organization']->id,
            'name' => 'Secret Farm',
            'type' => 'commercial',
            'area_hectares' => 3,
        ]);

        $token = $this->loginAs($alpha['users']['owner']);

        $this->getJson('/api/v1/farms/'.$farm->id, ['Authorization' => 'Bearer '.$token])
            ->assertNotFound();
    }
}
