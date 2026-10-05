<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\InventoryItem;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends ResourceController
{
    protected string $model = InventoryItem::class;

    protected string $permission = 'inventory';

    protected array $searchable = ['name', 'sku', 'category', 'warehouse', 'supplier_name'];

    protected array $sortable = ['name', 'category', 'quantity', 'unit_cost', 'reorder_level', 'created_at'];

    protected array $rules = [
        'name' => 'required|string|max:160',
        'sku' => 'nullable|string|max:48',
        'category' => 'required|string|max:64',
        'unit' => 'nullable|string|max:16',
        'quantity' => 'nullable|numeric|min:0',
        'unit_cost' => 'nullable|numeric|min:0',
        'reorder_level' => 'nullable|numeric|min:0',
        'warehouse' => 'nullable|string|max:64',
        'supplier_name' => 'nullable|string|max:160',
        'expiry_date' => 'nullable|date',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('low_stock')) {
            $query->whereColumn('quantity', '<=', 'reorder_level')
                ->where('reorder_level', '>', 0);
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
    }

    /**
     * Stock in / out / adjustment. The item quantity and the immutable movement
     * ledger are always written together.
     */
    public function adjust(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $allowed = collect(['inventory.edit', 'inventory.receive', 'inventory.issue'])
            ->contains(fn (string $key) => $user->hasPermission($key));

        if (! $allowed) {
            abort(403, 'Missing permission: inventory.receive or inventory.issue');
        }

        $item = $this->newQuery()->findOrFail($id);

        $data = $request->validate([
            'type' => 'required|in:in,out,adjustment',
            'quantity' => 'required|numeric|min:0.001',
            'unit_cost' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string|max:160',
            'notes' => 'nullable|string',
        ]);

        $delta = match ($data['type']) {
            'in' => $data['quantity'],
            'out' => -$data['quantity'],
            'adjustment' => $data['quantity'],
        };

        if ($data['type'] === 'adjustment') {
            $delta = $data['quantity'] - $item->quantity;
        }

        if ($item->quantity + $delta < 0) {
            return response()->json([
                'message' => 'Stock adjustment would make quantity negative.',
                'available' => $item->quantity,
            ], 422);
        }

        $item->quantity = round($item->quantity + $delta, 3);

        if (isset($data['unit_cost']) && $data['unit_cost'] !== null) {
            $item->unit_cost = $data['unit_cost'];
        }

        $item->save();

        StockMovement::create([
            'organization_id' => $item->organization_id,
            'inventory_item_id' => $item->id,
            'type' => $data['type'],
            'quantity' => abs($delta),
            'unit_cost' => $data['unit_cost'] ?? $item->unit_cost,
            'reason' => $data['reason'] ?? null,
            'notes' => $data['notes'] ?? null,
            'user_id' => $request->user()->id,
            'moved_at' => now(),
        ]);

        if ($item->isLowStock()) {
            \App\Models\AppNotification::create([
                'organization_id' => $item->organization_id,
                'user_id' => $request->user()->id,
                'type' => 'inventory',
                'severity' => 'WARNING',
                'title' => 'Low stock: '.$item->name,
                'message' => 'Stock is at '.$item->quantity.' '.$item->unit.', at or below the reorder level of '.$item->reorder_level.'.',
                'entity_type' => 'InventoryItem',
                'entity_id' => $item->id,
                'action_url' => '/app/inventory/'.$item->id,
            ]);
        }

        return $this->data($item->fresh());
    }

    public function movements(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'view');

        $item = $this->newQuery()->findOrFail($id);

        $movements = StockMovement::query()
            ->where('inventory_item_id', $item->id)
            ->with('user:id,name')
            ->orderByDesc('moved_at')
            ->paginate(min((int) $request->input('per_page', 15), 100));

        return response()->json([
            'data' => $movements->items(),
            'meta' => [
                'current_page' => $movements->currentPage(),
                'last_page' => $movements->lastPage(),
                'per_page' => $movements->perPage(),
                'total' => $movements->total(),
            ],
        ]);
    }
}
