<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Crop;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class CropController extends ResourceController
{
    protected string $model = Crop::class;

    protected string $permission = 'crop';

    protected array $searchable = ['name', 'category', 'scientific_name'];

    protected array $sortable = ['name', 'category', 'created_at'];

    protected string $defaultSort = 'name';

    protected array $rules = [
        'name' => 'required|string|max:120',
        'category' => 'required|string|max:64',
        'default_unit' => 'nullable|string|max:16',
        'growing_days' => 'nullable|integer|min:1|max:1000',
        'scientific_name' => 'nullable|string|max:120',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('category')) {
            $query->where('category', $request->query('category'));
        }
    }
}
