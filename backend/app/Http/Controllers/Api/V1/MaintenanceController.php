<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\MaintenanceRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class MaintenanceController extends ResourceController
{
    protected string $model = MaintenanceRecord::class;

    protected string $permission = 'maintenance';

    protected array $searchable = ['title', 'type', 'notes'];

    protected array $sortable = ['next_due_date', 'performed_date', 'cost', 'status', 'created_at'];

    protected array $with = ['equipment'];

    protected array $rules = [
        'equipment_id' => 'required|exists:equipment,id',
        'title' => 'required|string|max:160',
        'type' => 'required|string|max:32',
        'status' => 'sometimes|string|max:32',
        'performed_date' => 'nullable|date',
        'next_due_date' => 'nullable|date',
        'cost' => 'nullable|numeric|min:0',
        'performed_by' => 'nullable|exists:workers,id',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('overdue')) {
            $query->whereNotNull('next_due_date')
                ->whereDate('next_due_date', '<', now()->toDateString())
                ->whereNotIn('status', ['completed', 'cancelled']);
        }
    }
}
