<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Field;
use Illuminate\Http\Request;

class FieldController extends ResourceController
{
    protected string $model = Field::class;

    protected string $permission = 'field';

    protected array $with = ['farm'];

    protected array $searchable = ['name', 'code', 'soil_type', 'farm.name'];

    protected array $sortable = ['name', 'area_hectares', 'status', 'created_at'];

    protected array $rules = [
        'farm_id' => 'required|exists:farms,id',
        'name' => 'required|string|max:120',
        'code' => 'nullable|string|max:32',
        'area_hectares' => 'required|numeric|min:0',
        'soil_type' => 'nullable|string|max:64',
        'irrigation_type' => 'nullable|string|max:64',
        'topography' => 'nullable|string|max:32',
        'latitude' => 'nullable|numeric|between:-90,90',
        'longitude' => 'nullable|numeric|between:-180,180',
        'altitude_m' => 'nullable|numeric',
        'boundary' => 'nullable|array',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];
}
