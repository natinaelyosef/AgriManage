<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Worker;

class WorkerController extends ResourceController
{
    protected string $model = Worker::class;

    protected string $permission = 'worker';

    protected array $with = ['farm'];

    protected array $searchable = ['name', 'phone', 'role'];

    protected array $sortable = ['name', 'employment_type', 'daily_rate', 'status', 'hire_date', 'created_at'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'phone' => 'nullable|string|max:32',
        'email' => 'nullable|email|max:190',
        'role' => 'nullable|string|max:64',
        'employment_type' => 'sometimes|string|in:permanent,seasonal,daily,contract',
        'daily_rate' => 'nullable|numeric|min:0',
        'hire_date' => 'nullable|date',
        'status' => 'sometimes|string|max:32',
        'gender' => 'nullable|string|max:16',
        'farm_id' => 'nullable|exists:farms,id',
        'notes' => 'nullable|string',
    ];
}
