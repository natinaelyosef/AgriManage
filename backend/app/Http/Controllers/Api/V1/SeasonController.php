<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Season;

class SeasonController extends ResourceController
{
    protected string $model = Season::class;

    protected string $permission = 'season';

    protected array $searchable = ['name', 'code'];

    protected array $sortable = ['name', 'year', 'start_date', 'status', 'created_at'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'code' => 'nullable|string|max:32',
        'year' => 'required|integer|min:2000|max:2100',
        'start_date' => 'required|date',
        'end_date' => 'required|date|after_or_equal:start_date',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];
}
