<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\HarvestBatch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class HarvestController extends ResourceController
{
    protected string $model = HarvestBatch::class;

    protected string $permission = 'harvest';

    protected array $with = ['field', 'field.farm', 'crop', 'cropPlan'];

    protected array $searchable = ['batch_number', 'field.name', 'crop.name', 'grade'];

    protected array $sortable = ['harvest_date', 'quantity', 'status', 'quality_status', 'batch_number', 'created_at'];

    protected array $rules = [
        'harvest_date' => 'required|date',
        'quantity' => 'required|numeric|min:0',
        'unit' => 'nullable|string|max:16',
        'crop_plan_id' => 'nullable|exists:crop_plans,id',
        'field_id' => 'nullable|exists:fields,id',
        'farm_id' => 'nullable|exists:farms,id',
        'crop_id' => 'nullable|exists:crops,id',
        'moisture_percent' => 'nullable|numeric|min:0|max:100',
        'grade' => 'nullable|string|max:16',
        'quality_status' => 'sometimes|string|max:32',
        'status' => 'sometimes|string|max:32',
        'location' => 'nullable|string|max:120',
        'unit_price' => 'nullable|numeric|min:0',
        'notes' => 'nullable|string',
    ];

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);
        $data['batch_number'] = $this->nextBatchNumber();
        $data['qr_code'] = 'AG-'.strtoupper(Str::random(10));
        $data['recorded_by'] = $request->user()->id;

        $model = $this->newQuery()->make($data);
        $model->save();

        $this->syncCropPlanYield($model->crop_plan_id);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($model->getKey()), 201);
    }

    /**
     * Harvest yield feeds the crop plan's actual yield so profitability math
     * stays consistent across modules.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $batch = $this->newQuery()->findOrFail($id);
        $previousPlan = $batch->crop_plan_id;

        $data = $request->validate($this->rules);
        $this->ensureTenantReferences($request, $data);
        $batch->update($data);
        $batch->refresh();

        $this->syncCropPlanYield($previousPlan);

        if ($batch->crop_plan_id !== $previousPlan) {
            $this->syncCropPlanYield($batch->crop_plan_id);
        }

        return $this->data($this->newQuery()->with($this->with)->findOrFail($batch->getKey()));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'delete');

        $batch = $this->newQuery()->findOrFail($id);
        $planId = $batch->crop_plan_id;

        $batch->delete();

        $this->syncCropPlanYield($planId);

        return $this->data(['deleted' => true, 'id' => $id]);
    }

    /**
     * Recalculates the plan yield from live (non-deleted) batches.
     */
    private function syncCropPlanYield(?int $planId): void
    {
        if ($planId === null) {
            return;
        }

        $plan = \App\Models\CropPlan::query()->find($planId);

        if ($plan === null) {
            return;
        }

        $total = HarvestBatch::query()
            ->where('crop_plan_id', $planId)
            ->sum('quantity');

        $plan->actual_yield = round((float) $total, 3);
        $plan->save();
    }

    private function nextBatchNumber(): string
    {
        $prefix = 'HB-'.now()->format('ymd').'-';
        $latest = HarvestBatch::withTrashed()
            ->where('batch_number', 'like', $prefix.'%')
            ->orderByDesc('batch_number')
            ->value('batch_number');

        $sequence = $latest === null ? 1 : ((int) substr($latest, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }
}
