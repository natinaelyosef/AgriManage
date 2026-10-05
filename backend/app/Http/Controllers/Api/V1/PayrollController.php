<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\PayrollRun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends ResourceController
{
    protected string $model = PayrollRun::class;

    protected string $permission = 'payroll';

    protected array $searchable = ['status', 'notes'];

    protected array $sortable = ['period_end', 'period_start', 'total', 'status', 'created_at'];

    protected array $with = ['items.worker'];

    protected array $rules = [
        'period_start' => 'required|date',
        'period_end' => 'required|date|after_or_equal:period_start',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->validationRules($request));
        $this->ensureTenantReferences($request, $data);

        $run = DB::transaction(function () use ($data, $request) {
            $run = PayrollRun::create([
                'organization_id' => $request->user()->organization_id,
                'period_start' => $data['period_start'],
                'period_end' => $data['period_end'],
                'status' => $data['status'] ?? 'draft',
                'total' => 0,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
            ]);

            $run->generateItems();

            return $run;
        });

        return $this->data($this->newQuery()->with($this->with)->findOrFail($run->getKey()), 201);
    }
}
