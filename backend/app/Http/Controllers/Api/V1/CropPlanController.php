<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\CropPlan;

class CropPlanController extends ResourceController
{
    protected string $model = CropPlan::class;

    protected string $permission = 'plan';

    protected array $with = ['season', 'field', 'crop'];

    protected array $searchable = ['variety', 'crop.name', 'field.name', 'season.name'];

    protected array $sortable = ['planting_date', 'expected_harvest_date', 'status', 'planned_area_hectares', 'created_at'];

    protected array $rules = [
        'season_id' => 'required|exists:seasons,id',
        'field_id' => 'required|exists:fields,id',
        'crop_id' => 'required|exists:crops,id',
        'variety' => 'nullable|string|max:120',
        'planned_area_hectares' => 'required|numeric|min:0',
        'planting_date' => 'nullable|date',
        'expected_harvest_date' => 'nullable|date',
        'expected_yield' => 'nullable|numeric|min:0',
        'yield_unit' => 'nullable|string|max:16',
        'seed_quantity' => 'nullable|numeric|min:0',
        'estimated_cost' => 'nullable|numeric|min:0',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];
}
