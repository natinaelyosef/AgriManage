<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class ActivityController extends ResourceController
{
    protected string $model = Activity::class;

    protected string $permission = 'activity';

    protected array $with = ['field', 'field.farm', 'cropPlan.crop', 'worker'];

    protected array $searchable = ['title', 'type', 'description'];

    protected array $sortable = ['scheduled_date', 'status', 'priority', 'type', 'created_at'];

    protected array $rules = [
        'title' => 'required|string|max:160',
        'type' => 'required|string|max:64',
        'description' => 'nullable|string',
        'status' => 'sometimes|string|max:32',
        'priority' => 'sometimes|string|in:low,medium,high,urgent',
        'scheduled_date' => 'nullable|date',
        'crop_plan_id' => 'nullable|exists:crop_plans,id',
        'field_id' => 'nullable|exists:fields,id',
        'farm_id' => 'nullable|exists:farms,id',
        'assigned_worker_id' => 'nullable|exists:workers,id',
        'assigned_user_id' => 'nullable|exists:users,id',
        'labor_hours' => 'nullable|numeric|min:0',
        'quantity' => 'nullable|numeric|min:0',
        'unit' => 'nullable|string|max:16',
        'cost' => 'nullable|numeric|min:0',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('scheduled_date')) {
            $query->whereDate('scheduled_date', $request->query('scheduled_date'));
        }

        if ($request->filled('upcoming')) {
            $query->whereDate('scheduled_date', '>=', now()->toDateString())
                ->whereNotIn('status', ['completed', 'cancelled']);
        }

        if ($request->filled('overdue')) {
            $query->whereDate('scheduled_date', '<', now()->toDateString())
                ->whereNotIn('status', ['completed', 'cancelled']);
        }

        if ($request->filled('today')) {
            $query->whereDate('scheduled_date', now()->toDateString());
        }
    }
}
