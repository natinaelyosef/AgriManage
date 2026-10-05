<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\IrrigationEvent;

class IrrigationController extends ResourceController
{
    protected string $model = IrrigationEvent::class;

    protected string $permission = 'irrigation';

    protected array $searchable = ['method', 'source', 'notes'];

    protected array $sortable = ['irrigation_date', 'volume_m3', 'duration_minutes', 'cost', 'created_at'];

    protected array $with = ['field'];

    protected array $rules = [
        'field_id' => 'required|exists:fields,id',
        'farm_id' => 'nullable|exists:farms,id',
        'irrigation_date' => 'required|date',
        'method' => 'required|string|max:32',
        'source' => 'nullable|string|max:32',
        'duration_minutes' => 'nullable|integer|min:0',
        'volume_m3' => 'nullable|numeric|min:0',
        'cost' => 'nullable|numeric|min:0',
        'performed_by' => 'nullable|exists:workers,id',
        'notes' => 'nullable|string',
    ];
}
