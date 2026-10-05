<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SaleController extends ResourceController
{
    protected string $model = Sale::class;

    protected string $permission = 'sale';

    protected array $with = ['customer', 'items', 'payments'];

    protected array $searchable = ['invoice_number', 'customer.name', 'status', 'payment_status'];

    protected array $sortable = ['sale_date', 'total', 'status', 'payment_status', 'invoice_number', 'created_at'];

    protected array $rules = [
        'customer_id' => 'nullable|exists:customers,id',
        'sale_date' => 'required|date',
        'status' => 'sometimes|string|max:32',
        'tax_amount' => 'nullable|numeric|min:0',
        'currency' => 'nullable|string|max:8',
        'notes' => 'nullable|string',
        'items' => 'required|array|min:1',
        'items.*.description' => 'required|string|max:255',
        'items.*.quantity' => 'required|numeric|min:0.001',
        'items.*.unit' => 'nullable|string|max:16',
        'items.*.unit_price' => 'required|numeric|min:0',
        'items.*.harvest_batch_id' => 'nullable|exists:harvest_batches,id',
    ];

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);

        $sale = DB::transaction(function () use ($data, $request) {
            $subtotal = collect($data['items'])->sum(
                fn ($item) => round($item['quantity'] * $item['unit_price'], 2)
            );

            $sale = Sale::create([
                'organization_id' => $request->user()->organization_id,
                'customer_id' => $data['customer_id'] ?? null,
                'invoice_number' => $this->nextInvoiceNumber(),
                'sale_date' => $data['sale_date'],
                'status' => $data['status'] ?? 'confirmed',
                'payment_status' => 'unpaid',
                'subtotal' => $subtotal,
                'tax_amount' => $data['tax_amount'] ?? 0,
                'total' => round($subtotal + ($data['tax_amount'] ?? 0), 2),
                'paid_amount' => 0,
                'currency' => $data['currency'] ?? 'ETB',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            foreach ($data['items'] as $item) {
                SaleItem::create([
                    'organization_id' => $sale->organization_id,
                    'sale_id' => $sale->id,
                    'harvest_batch_id' => $item['harvest_batch_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? 'quintal',
                    'unit_price' => $item['unit_price'],
                    'total' => round($item['quantity'] * $item['unit_price'], 2),
                ]);
            }

            return $sale;
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($sale->getKey()), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $sale = $this->newQuery()->findOrFail($id);

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);

        DB::transaction(function () use ($sale, $data) {
            $sale->update([
                'customer_id' => $data['customer_id'] ?? null,
                'sale_date' => $data['sale_date'],
                'status' => $data['status'] ?? $sale->status,
                'tax_amount' => $data['tax_amount'] ?? 0,
                'currency' => $data['currency'] ?? $sale->currency,
                'notes' => $data['notes'] ?? null,
            ]);

            $sale->items()->delete();

            $subtotal = 0;

            foreach ($data['items'] as $item) {
                $total = round($item['quantity'] * $item['unit_price'], 2);
                $subtotal += $total;

                SaleItem::create([
                    'organization_id' => $sale->organization_id,
                    'sale_id' => $sale->id,
                    'harvest_batch_id' => $item['harvest_batch_id'] ?? null,
                    'description' => $item['description'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? 'quintal',
                    'unit_price' => $item['unit_price'],
                    'total' => $total,
                ]);
            }

            $sale->subtotal = round($subtotal, 2);
            $sale->total = round($subtotal + $sale->tax_amount, 2);
            $sale->payment_status = $sale->paid_amount >= $sale->total
                ? 'paid'
                : ($sale->paid_amount > 0 ? 'partial' : 'unpaid');
            $sale->save();
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($sale->getKey()));
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->query('payment_status'));
        }

        if ($request->filled('overdue')) {
            $query->where('payment_status', '!=', 'paid')
                ->whereDate('sale_date', '<=', now()->subDays(30)->toDateString());
        }

        if ($request->filled('from')) {
            $query->whereDate('sale_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('sale_date', '<=', $request->query('to'));
        }
    }

    private function nextInvoiceNumber(): string
    {
        $prefix = 'INV-'.now()->format('Ym').'-';
        $latest = Sale::withTrashed()
            ->where('invoice_number', 'like', $prefix.'%')
            ->orderByDesc('invoice_number')
            ->value('invoice_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
