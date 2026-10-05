<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Contract;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ContractController extends ResourceController
{
    protected string $model = Contract::class;

    protected string $permission = 'contract';

    protected array $searchable = ['title', 'counterparty', 'document_number', 'notes'];

    protected array $sortable = ['start_date', 'end_date', 'value', 'status', 'type', 'created_at'];

    protected array $with = ['farm'];

    protected array $rules = [
        'farm_id' => 'nullable|exists:farms,id',
        'title' => 'required|string|max:160',
        'type' => 'sometimes|string|max:32',
        'counterparty' => 'required|string|max:160',
        'counterparty_phone' => 'nullable|string|max:32',
        'start_date' => 'required|date',
        'end_date' => 'nullable|date|after_or_equal:start_date',
        'value' => 'required|numeric|min:0',
        'currency' => 'nullable|string|max:8',
        'payment_terms' => 'nullable|string|max:160',
        'status' => 'sometimes|string|max:32',
        'document_number' => 'nullable|string|max:64',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('active')) {
            $query->where('status', 'active')
                ->whereDate('start_date', '<=', now()->toDateString())
                ->where(function (Builder $builder) {
                    $builder->whereNull('end_date')
                        ->orWhereDate('end_date', '>=', now()->toDateString());
                });
        }
    }
}
