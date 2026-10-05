<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Farm;
use Illuminate\Http\Request;

class FarmController extends ResourceController
{
    protected string $model = Farm::class;

    protected string $permission = 'farm';

    protected array $with = ['fields', 'owner'];

    protected array $searchable = ['name', 'code', 'region', 'woreda', 'kebele'];

    protected array $sortable = ['name', 'area_hectares', 'cultivated_hectares', 'status', 'region', 'created_at'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'code' => 'nullable|string|max:32',
        'type' => 'required|string|max:64',
        'country' => 'nullable|string|max:64',
        'region' => 'nullable|string|max:64',
        'zone' => 'nullable|string|max:64',
        'woreda' => 'nullable|string|max:64',
        'kebele' => 'nullable|string|max:64',
        'area_hectares' => 'required|numeric|min:0',
        'cultivated_hectares' => 'nullable|numeric|min:0',
        'latitude' => 'nullable|numeric|between:-90,90',
        'longitude' => 'nullable|numeric|between:-180,180',
        'established_year' => 'nullable|integer|min:1900|max:2100',
        'status' => 'sometimes|string|max:32',
        'description' => 'nullable|string',
        'owner_user_id' => 'nullable|integer',
    ];
}
