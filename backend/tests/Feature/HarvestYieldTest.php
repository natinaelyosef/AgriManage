<?php

namespace Tests\Feature;

use App\Models\Crop;
use App\Models\CropPlan;
use App\Models\Farm;
use App\Models\Field;
use App\Models\Season;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class HarvestYieldTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private function setupPlan(array $tenant): CropPlan
    {
        $farm = Farm::create([
            'organization_id' => $tenant['organization']->id,
            'name' => 'Test Farm',
            'type' => 'commercial',
            'area_hectares' => 30,
            'cultivated_hectares' => 24,
        ]);

        $field = Field::create([
            'organization_id' => $tenant['organization']->id,
            'farm_id' => $farm->id,
            'name' => 'Block A',
            'area_hectares' => 12,
        ]);

        $crop = Crop::firstOrCreate(
            ['name' => 'Teff', 'organization_id' => null],
            ['category' => 'cereal', 'default_unit' => 'quintal', 'is_global' => true]
        );

        $season = Season::create([
            'organization_id' => $tenant['organization']->id,
            'name' => 'Meher '.now()->year,
            'code' => 'MEHER-'.now()->year,
            'year' => now()->year,
            'start_date' => now()->subMonth()->toDateString(),
            'end_date' => now()->addMonths(3)->toDateString(),
        ]);

        return CropPlan::create([
            'organization_id' => $tenant['organization']->id,
            'season_id' => $season->id,
            'field_id' => $field->id,
            'crop_id' => $crop->id,
            'variety' => 'Quncho',
            'planned_area_hectares' => 12,
            'expected_yield' => 216,
            'yield_unit' => 'quintal',
            'status' => 'growing',
        ]);
    }

    public function test_harvest_batch_gets_sequential_batch_number_and_updates_plan_yield(): void
    {
        $tenant = $this->makeTenant('harvest-1');
        $plan = $this->setupPlan($tenant);
        $token = $this->loginAs($tenant['users']['manager']);

        $first = $this->postJson('/api/v1/harvest-batches', [
            'harvest_date' => now()->toDateString(),
            'quantity' => 100,
            'unit' => 'quintal',
            'crop_plan_id' => $plan->id,
            'field_id' => $plan->field_id,
            'crop_id' => $plan->crop_id,
            'moisture_percent' => 11.5,
            'grade' => 'A',
        ], ['Authorization' => 'Bearer '.$token]);

        $first->assertCreated();
        $this->assertStringStartsWith('HB-'.now()->format('ymd').'-', $first->json('data.batch_number'));
        $this->assertNotEmpty($first->json('data.qr_code'));

        $second = $this->postJson('/api/v1/harvest-batches', [
            'harvest_date' => now()->toDateString(),
            'quantity' => 50,
            'unit' => 'quintal',
            'crop_plan_id' => $plan->id,
            'field_id' => $plan->field_id,
            'crop_id' => $plan->crop_id,
        ], ['Authorization' => 'Bearer '.$token]);

        $second->assertCreated();
        $this->assertNotSame(
            $first->json('data.batch_number'),
            $second->json('data.batch_number')
        );

        $this->assertSame(150.0, (float) $plan->fresh()->actual_yield);
    }

    public function test_deleting_a_batch_recalculates_plan_yield(): void
    {
        $tenant = $this->makeTenant('harvest-2');
        $plan = $this->setupPlan($tenant);
        $token = $this->loginAs($tenant['users']['manager']);

        $batch = $this->postJson('/api/v1/harvest-batches', [
            'harvest_date' => now()->toDateString(),
            'quantity' => 80,
            'crop_plan_id' => $plan->id,
            'field_id' => $plan->field_id,
            'crop_id' => $plan->crop_id,
        ], ['Authorization' => 'Bearer '.$token])->json('data');

        $this->assertSame(80.0, (float) $plan->fresh()->actual_yield);

        $this->deleteJson('/api/v1/harvest-batches/'.$batch['id'], [], [
            'Authorization' => 'Bearer '.$token,
        ])->assertOk();

        $this->assertSame(0.0, (float) $plan->fresh()->actual_yield);
    }

    public function test_worker_can_not_delete_a_harvest_batch(): void
    {
        $tenant = $this->makeTenant('harvest-3');
        $plan = $this->setupPlan($tenant);

        $manager = $this->loginAs($tenant['users']['manager']);
        $batch = $this->postJson('/api/v1/harvest-batches', [
            'harvest_date' => now()->toDateString(),
            'quantity' => 20,
            'crop_plan_id' => $plan->id,
        ], ['Authorization' => 'Bearer '.$manager])->json('data');

        $worker = $this->loginAs($tenant['users']['worker']);

        $this->deleteJson('/api/v1/harvest-batches/'.$batch['id'], [], [
            'Authorization' => 'Bearer '.$worker,
        ])->assertForbidden();
    }
}
