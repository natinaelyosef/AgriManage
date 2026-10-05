<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends ResourceController
{
    protected string $model = PurchaseOrder::class;

    protected string $permission = 'purchaseorder';

    protected array $with = ['items', 'farm'];

    protected array $searchable = ['po_number', 'supplier', 'status'];

    protected array $sortable = ['order_date', 'total', 'status', 'po_number', 'created_at'];

    protected array $rules = [
        'supplier' => 'required|string|max:160',
        'farm_id' => 'nullable|exists:farms,id',
        'order_date' => 'required|date',
        'expected_date' => 'nullable|date|after_or_equal:order_date',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
        'items' => 'required|array|min:1',
        'items.*.description' => 'required|string|max:255',
        'items.*.quantity' => 'required|numeric|min:0.001',
        'items.*.unit' => 'nullable|string|max:16',
        'items.*.unit_price' => 'required|numeric|min:0',
    ];

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->validationRules($request));
        $this->ensureTenantReferences($request, $data);

        $order = DB::transaction(function () use ($data, $request) {
            $subtotal = round(collect($data['items'])->sum(
                fn ($item) => $item['quantity'] * $item['unit_price']
            ), 2);

            $order = PurchaseOrder::create([
                'organization_id' => $request->user()->organization_id,
                'po_number' => $this->nextPoNumber(),
                'supplier' => $data['supplier'],
                'farm_id' => $data['farm_id'] ?? null,
                'order_date' => $data['order_date'],
                'expected_date' => $data['expected_date'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'subtotal' => $subtotal,
                'total' => $subtotal,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $this->syncItems($order, $data['items']);

            return $order;
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($order->getKey()), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $order = $this->newQuery()->findOrFail($id);

        $data = $request->validate($this->updateValidationRules($request));
        $this->ensureTenantReferences($request, $data);

        DB::transaction(function () use ($order, $data) {
            $order->update([
                'supplier' => $data['supplier'] ?? $order->supplier,
                'farm_id' => $data['farm_id'] ?? $order->farm_id,
                'order_date' => $data['order_date'] ?? $order->order_date,
                'expected_date' => $data['expected_date'] ?? $order->expected_date,
                'status' => $data['status'] ?? $order->status,
                'notes' => $data['notes'] ?? $order->notes,
            ]);

            if (isset($data['items'])) {
                $order->items()->delete();
                $this->syncItems($order, $data['items']);
            }
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($order->getKey()));
    }

    private function syncItems(PurchaseOrder $order, array $items): void
    {
        $subtotal = 0;

        foreach ($items as $item) {
            $total = round($item['quantity'] * $item['unit_price'], 2);
            $subtotal += $total;

            PurchaseOrderItem::create([
                'organization_id' => $order->organization_id,
                'purchase_order_id' => $order->id,
                'description' => $item['description'],
                'quantity' => $item['quantity'],
                'unit' => $item['unit'] ?? 'unit',
                'unit_price' => $item['unit_price'],
                'total' => $total,
            ]);
        }

        $order->update([
            'subtotal' => round($subtotal, 2),
            'total' => round($subtotal, 2),
        ]);
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('from')) {
            $query->whereDate('order_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('order_date', '<=', $request->query('to'));
        }
    }

    private function nextPoNumber(): string
    {
        $prefix = 'PO-'.now()->format('Ym').'-';
        $latest = PurchaseOrder::withTrashed()
            ->where('po_number', 'like', $prefix.'%')
            ->orderByDesc('po_number')
            ->value('po_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
