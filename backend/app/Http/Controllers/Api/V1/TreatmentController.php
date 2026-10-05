<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Treatment;

class TreatmentController extends ResourceController
{
    protected string $model = Treatment::class;

    protected string $permission = 'treatment';

    protected array $searchable = ['product_name', 'target', 'category'];

    protected array $sortable = ['applied_date', 'product_name', 'category', 'cost', 'created_at'];

    protected array $with = ['field', 'inventoryItem'];

    protected array $rules = [
        'field_id' => 'required|exists:fields,id',
        'farm_id' => 'nullable|exists:farms,id',
        'crop_plan_id' => 'nullable|exists:crop_plans,id',
        'applied_date' => 'required|date',
        'category' => 'required|string|max:64',
        'product_name' => 'required|string|max:160',
        'dose' => 'nullable|numeric|min:0',
        'dose_unit' => 'nullable|string|max:16',
        'method' => 'nullable|string|max:32',
        'target' => 'nullable|string|max:160',
        'pre_harvest_interval_days' => 'nullable|integer|min:0',
        'inventory_item_id' => 'nullable|exists:inventory_items,id',
        'quantity_used' => 'nullable|numeric|min:0',
        'cost' => 'nullable|numeric|min:0',
        'performed_by' => 'nullable|exists:workers,id',
        'notes' => 'nullable|string',
    ];
}
