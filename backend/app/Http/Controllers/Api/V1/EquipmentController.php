<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Equipment;

class EquipmentController extends ResourceController
{
    protected string $model = Equipment::class;

    protected string $permission = 'equipment';

    protected array $searchable = ['name', 'code', 'serial_number', 'type'];

    protected array $sortable = ['name', 'type', 'status', 'hours_meter', 'created_at'];

    protected array $with = ['farm'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'code' => 'nullable|string|max:32',
        'type' => 'required|string|max:64',
        'serial_number' => 'nullable|string|max:64',
        'manufacturer' => 'nullable|string|max:120',
        'purchase_date' => 'nullable|date',
        'farm_id' => 'nullable|exists:farms,id',
        'status' => 'sometimes|string|max:32',
        'hours_meter' => 'nullable|numeric|min:0',
        'fuel_type' => 'nullable|string|max:32',
        'notes' => 'nullable|string',
    ];
}
