<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\ExportDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExportDocumentController extends ResourceController
{
    protected string $model = ExportDocument::class;

    protected string $permission = 'exportdoc';

    protected array $searchable = ['doc_number', 'product', 'destination_country', 'status'];

    protected array $sortable = ['ship_date', 'total', 'destination_country', 'status', 'doc_number', 'created_at'];

    protected array $with = ['customer'];

    protected array $rules = [
        'customer_id' => 'nullable|exists:customers,id',
        'product' => 'required|string|max:160',
        'quantity' => 'required|numeric|min:0.001',
        'unit' => 'nullable|string|max:16',
        'unit_price' => 'required|numeric|min:0',
        'destination_country' => 'required|string|max:64',
        'transport_mode' => 'sometimes|string|max:16',
        'ship_date' => 'nullable|date',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->validationRules($request));
        $this->ensureTenantReferences($request, $data);

        $document = DB::transaction(function () use ($data, $request) {
            $document = ExportDocument::create([
                'organization_id' => $request->user()->organization_id,
                'doc_number' => $this->nextDocNumber(),
                'customer_id' => $data['customer_id'] ?? null,
                'product' => $data['product'],
                'quantity' => $data['quantity'],
                'unit' => $data['unit'] ?? 'quintal',
                'unit_price' => $data['unit_price'],
                'total' => round($data['quantity'] * $data['unit_price'], 2),
                'destination_country' => $data['destination_country'],
                'transport_mode' => $data['transport_mode'] ?? 'road',
                'ship_date' => $data['ship_date'] ?? null,
                'status' => $data['status'] ?? 'draft',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            return $document;
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($document->getKey()), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $document = $this->newQuery()->findOrFail($id);
        $data = $request->validate($this->updateValidationRules($request));
        $this->ensureTenantReferences($request, $data);

        $document->update([
            'customer_id' => $data['customer_id'] ?? $document->customer_id,
            'product' => $data['product'] ?? $document->product,
            'quantity' => $data['quantity'] ?? $document->quantity,
            'unit' => $data['unit'] ?? $document->unit,
            'unit_price' => $data['unit_price'] ?? $document->unit_price,
            'total' => isset($data['quantity']) || isset($data['unit_price'])
                ? round(($data['quantity'] ?? $document->quantity) * ($data['unit_price'] ?? $document->unit_price), 2)
                : $document->total,
            'destination_country' => $data['destination_country'] ?? $document->destination_country,
            'transport_mode' => $data['transport_mode'] ?? $document->transport_mode,
            'ship_date' => $data['ship_date'] ?? $document->ship_date,
            'status' => $data['status'] ?? $document->status,
            'notes' => $data['notes'] ?? $document->notes,
        ]);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($document->getKey()));
    }

    private function nextDocNumber(): string
    {
        $prefix = 'EXP-'.now()->format('Ym').'-';
        $latest = ExportDocument::withTrashed()
            ->where('doc_number', 'like', $prefix.'%')
            ->orderByDesc('doc_number')
            ->value('doc_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
