<?php

namespace Tests\Feature;

use App\Models\InventoryItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class InventoryAdjustmentTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private function makeItem(array $tenant, float $quantity = 100): InventoryItem
    {
        return InventoryItem::create([
            'organization_id' => $tenant['organization']->id,
            'name' => 'Urea',
            'category' => 'fertilizer',
            'unit' => 'kg',
            'quantity' => $quantity,
            'unit_cost' => 90,
            'reorder_level' => 20,
        ]);
    }

    public function test_stock_in_and_stock_out_update_quantity_and_ledger(): void
    {
        $tenant = $this->makeTenant('inv-1');
        $item = $this->makeItem($tenant);
        $token = $this->loginAs($tenant['users']['manager']);

        $this->postJson("/api/v1/inventory-items/{$item->id}/adjust", [
            'type' => 'in',
            'quantity' => 50,
            'reason' => 'Supplier delivery',
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $this->assertSame(150.0, (float) $item->fresh()->quantity);

        $this->postJson("/api/v1/inventory-items/{$item->id}/adjust", [
            'type' => 'out',
            'quantity' => 30,
            'reason' => 'Field application',
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $this->assertSame(120.0, (float) $item->fresh()->quantity);
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public function test_stock_can_not_go_negative(): void
    {
        $tenant = $this->makeTenant('inv-2');
        $item = $this->makeItem($tenant, 10);
        $token = $this->loginAs($tenant['users']['manager']);

        $this->postJson("/api/v1/inventory-items/{$item->id}/adjust", [
            'type' => 'out',
            'quantity' => 50,
        ], ['Authorization' => 'Bearer '.$token])->assertStatus(422);

        $this->assertSame(10.0, (float) $item->fresh()->quantity);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_low_stock_raises_a_warning_notification(): void
    {
        $tenant = $this->makeTenant('inv-3');
        $item = $this->makeItem($tenant, 25);
        $token = $this->loginAs($tenant['users']['manager']);

        $this->postJson("/api/v1/inventory-items/{$item->id}/adjust", [
            'type' => 'out',
            'quantity' => 10,
        ], ['Authorization' => 'Bearer '.$token])->assertOk();

        $this->assertDatabaseHas('notifications', [
            'organization_id' => $tenant['organization']->id,
            'severity' => 'WARNING',
            'entity_type' => 'InventoryItem',
            'entity_id' => $item->id,
        ]);
    }
}
