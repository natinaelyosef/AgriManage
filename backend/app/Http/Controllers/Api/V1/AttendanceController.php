<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\AttendanceRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AttendanceController extends ResourceController
{
    protected string $model = AttendanceRecord::class;

    protected string $permission = 'attendance';

    protected array $searchable = ['status', 'notes'];

    protected array $sortable = ['work_date', 'hours', 'status', 'created_at'];

    protected array $with = ['worker'];

    protected array $rules = [
        'worker_id' => 'required|exists:workers,id',
        'work_date' => 'required|date',
        'status' => 'sometimes|string|max:32',
        'hours' => 'nullable|numeric|min:0|max:24',
        'notes' => 'nullable|string',
    ];

    protected function validationRules(Request $request): array
    {
        return $this->withUniquePair($request, $this->rules, null);
    }

    protected function updateValidationRules(Request $request): array
    {
        return $this->withUniquePair($request, $this->updateRules(), $request->route('id'));
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('from')) {
            $query->whereDate('work_date', '>=', $request->query('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('work_date', '<=', $request->query('to'));
        }
    }

    /**
     * One row per worker per day: the unique rule lives on worker_id with the
     * requested work_date as an extra scope (composite unique pair).
     */
    private function withUniquePair(Request $request, array $rules, $ignoreId): array
    {
        $workerRules = is_array($rules['worker_id'])
            ? $rules['worker_id']
            : explode('|', $rules['worker_id']);
        $workerRules = array_filter($workerRules, fn ($rule) => $rule !== 'nullable');

        if ($ignoreId !== null) {
            array_unshift($workerRules, 'sometimes');
        }

        $workerRules[] = Rule::unique('attendance_records', 'worker_id')
            ->where('organization_id', $request->user()?->organization_id)
            ->where('work_date', $request->input('work_date'))
            ->ignore($ignoreId);

        $rules['worker_id'] = array_values($workerRules);

        return $rules;
    }
}
