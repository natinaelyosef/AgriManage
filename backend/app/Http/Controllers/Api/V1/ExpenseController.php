<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Expense;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends ResourceController
{
    protected string $model = Expense::class;

    protected string $permission = 'expense';

    protected array $with = ['farm', 'field', 'cropPlan.crop'];

    protected array $searchable = ['title', 'category', 'description', 'supplier_name'];

    protected array $sortable = ['expense_date', 'amount', 'category', 'status', 'created_at'];

    protected array $rules = [
        'title' => 'required|string|max:160',
        'category' => 'required|string|max:64',
        'description' => 'nullable|string',
        'amount' => 'required|numeric|min:0',
        'currency' => 'nullable|string|max:8',
        'expense_date' => 'required|date',
        'payment_method' => 'sometimes|string|max:32',
        'status' => 'sometimes|string|max:32',
        'farm_id' => 'nullable|exists:farms,id',
        'field_id' => 'nullable|exists:fields,id',
        'crop_plan_id' => 'nullable|exists:crop_plans,id',
        'supplier_name' => 'nullable|string|max:160',
        'receipt_url' => 'nullable|string|max:255',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('from')) {
            $query->whereDate('expense_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('expense_date', '<=', $request->query('to'));
        }

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);
        $data['created_by'] = $request->user()->id;

        $model = $this->newQuery()->make($data);
        $model->save();

        return $this->data($this->newQuery()->with($this->with)->findOrFail($model->getKey()), 201);
    }
}
