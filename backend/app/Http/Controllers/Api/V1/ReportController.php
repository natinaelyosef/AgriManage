<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Budget;
use App\Models\Contract;
use App\Models\CropPlan;
use App\Models\Expense;
use App\Models\Field;
use App\Models\HarvestBatch;
use App\Models\Sale;
use App\Models\Season;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReportController extends Controller
{
    /**
     * Cross-module profitability report: group_by = farm | field | crop | season.
     */
    public function profitability(Request $request): JsonResponse
    {
        $groupBy = in_array($request->query('group_by'), ['farm', 'field', 'crop', 'season'], true)
            ? $request->query('group_by')
            : 'crop';

        $from = $request->query('from', now()->startOfYear()->toDateString());
        $to = $request->query('to', now()->toDateString());
        $toBound = Carbon::parse($to)->endOfDay()->toDateTimeString();

        $buckets = [];

        $bucket = function (string $label) use (&$buckets): array {
            return $buckets[$label] ??= [
                'label' => $label,
                'quantity' => 0.0,
                'revenue' => 0.0,
                'expenses' => 0.0,
                'batches' => 0,
                'transactions' => 0,
            ];
        };

        HarvestBatch::query()
            ->with(['field.farm', 'crop', 'cropPlan.season'])
            ->whereBetween('harvest_date', [$from, $toBound])
            ->get()
            ->each(function (HarvestBatch $harvest) use ($groupBy, &$buckets, $bucket) {
                $label = $this->labelFor($groupBy, [
                    'farm' => $harvest->field?->farm?->name,
                    'field' => $harvest->field?->name,
                    'crop' => $harvest->crop?->name,
                    'season' => $harvest->cropPlan?->season?->name,
                ]);

                $buckets[$label] = $bucket($label);
                $buckets[$label]['quantity'] += (float) $harvest->quantity;
                $buckets[$label]['batches'] += 1;
            });

        Sale::query()
            ->with(['items.harvestBatch.field.farm', 'items.harvestBatch.crop', 'items.harvestBatch.cropPlan.season'])
            ->whereBetween('sale_date', [$from, $toBound])
            ->get()
            ->each(function (Sale $sale) use ($groupBy, &$buckets, $bucket) {
                $harvest = $sale->items->first()?->harvestBatch;

                $label = $this->labelFor($groupBy, [
                    'farm' => $harvest?->field?->farm?->name,
                    'field' => $harvest?->field?->name,
                    'crop' => $harvest?->crop?->name,
                    'season' => $harvest?->cropPlan?->season?->name,
                ]);

                $buckets[$label] = $bucket($label);
                $buckets[$label]['revenue'] += (float) $sale->total;
                $buckets[$label]['transactions'] += 1;
            });

        Expense::query()
            ->with(['farm', 'field', 'cropPlan.crop', 'cropPlan.season'])
            ->whereBetween('expense_date', [$from, $toBound])
            ->get()
            ->each(function (Expense $expense) use ($groupBy, &$buckets, $bucket) {
                $label = $this->labelFor($groupBy, [
                    'farm' => $expense->farm?->name,
                    'field' => $expense->field?->name,
                    'crop' => $expense->cropPlan?->crop?->name,
                    'season' => $expense->cropPlan?->season?->name,
                ]);

                $buckets[$label] = $bucket($label);
                $buckets[$label]['expenses'] += (float) $expense->amount;
            });

        $rows = collect($buckets)
            ->map(fn (array $row) => $row + ['profit' => round($row['revenue'] - $row['expenses'], 2)])
            ->sortByDesc('profit')
            ->values();

        return $this->data([
            'group_by' => $groupBy,
            'from' => $from,
            'to' => $to,
            'rows' => $rows,
            'totals' => [
                'revenue' => round((float) $rows->sum('revenue'), 2),
                'expenses' => round((float) $rows->sum('expenses'), 2),
                'profit' => round((float) $rows->sum('profit'), 2),
                'quantity' => round((float) $rows->sum('quantity'), 3),
            ],
        ]);
    }

    public function cashSummary(Request $request): JsonResponse
    {
        $from = $request->query('from', now()->startOfYear()->toDateString());
        $to = $request->query('to', now()->toDateString());
        $toBound = Carbon::parse($to)->endOfDay()->toDateTimeString();

        $spent = (float) Expense::query()->whereBetween('expense_date', [$from, $toBound])->sum('amount');
        $invoiced = (float) Sale::query()->whereBetween('sale_date', [$from, $toBound])->sum('total');
        $received = (float) Sale::query()->whereBetween('sale_date', [$from, $toBound])->sum('paid_amount');

        return $this->data([
            'from' => $from,
            'to' => $to,
            'invoiced' => round($invoiced, 2),
            'received' => round($received, 2),
            'outstanding' => round($invoiced - $received, 2),
            'spent' => round($spent, 2),
            'net' => round($received - $spent, 2),
        ]);
    }

    public function analytics(): JsonResponse
    {
        return $this->data([
            'trends' => $this->trendBuckets(),
            'forecast' => $this->yieldForecast(),
            'cashflow' => $this->cashOutlook(),
            'field_map' => $this->fieldMap(),
        ]);
    }

    private function trendBuckets(): array
    {
        $from = now()->subMonths(11)->startOfMonth()->toDateString();
        $to = now()->toDateString();
        $toBound = Carbon::parse($to)->endOfDay()->toDateTimeString();

        $buckets = [];
        foreach (range(11, 0) as $offset) {
            $month = now()->subMonths($offset);
            $buckets[$month->format('Y-m')] = [
                'month' => $month->format('Y-m'),
                'label' => $month->format('M y'),
                'revenue' => 0.0,
                'expenses' => 0.0,
            ];
        }

        Sale::query()
            ->whereBetween('sale_date', [$from, $toBound])
            ->get()
            ->each(function (Sale $sale) use (&$buckets) {
                $key = Carbon::parse($sale->sale_date)->format('Y-m');
                if (isset($buckets[$key])) {
                    $buckets[$key]['revenue'] += (float) $sale->total;
                }
            });

        Expense::query()
            ->whereBetween('expense_date', [$from, $toBound])
            ->get()
            ->each(function (Expense $expense) use (&$buckets) {
                $key = Carbon::parse($expense->expense_date)->format('Y-m');
                if (isset($buckets[$key])) {
                    $buckets[$key]['expenses'] += (float) $expense->amount;
                }
            });

        $rows = collect($buckets)
            ->map(fn (array $row) => [
                'month' => $row['month'],
                'label' => $row['label'],
                'revenue' => round($row['revenue'], 2),
                'expenses' => round($row['expenses'], 2),
                'profit' => round($row['revenue'] - $row['expenses'], 2),
            ])
            ->values();

        return [
            'from' => $from,
            'to' => $to,
            'months' => $rows,
            'totals' => [
                'revenue' => round((float) $rows->sum('revenue'), 2),
                'expenses' => round((float) $rows->sum('expenses'), 2),
                'profit' => round((float) $rows->sum('profit'), 2),
            ],
        ];
    }

    private function yieldForecast(): array
    {
        $cutoff = now()->subYears(2)->toDateString();

        $batches = HarvestBatch::query()
            ->with(['field', 'crop'])
            ->where('harvest_date', '>=', $cutoff)
            ->get();

        $fieldAreas = Field::query()
            ->whereIn('id', $batches->pluck('field_id')->filter()->unique())
            ->pluck('area_hectares', 'id');

        $history = $batches->groupBy(fn (HarvestBatch $batch) => (string) $batch->crop_id);

        $plans = CropPlan::query()
            ->with(['crop', 'season'])
            ->whereIn('status', ['planned', 'growing', 'active'])
            ->get();

        $planByCrop = $plans->groupBy(fn (CropPlan $plan) => (string) $plan->crop_id);

        $rows = $history->keys()
            ->union($planByCrop->keys())
            ->map(function ($cropKey) use ($history, $planByCrop, $fieldAreas) {
                $cropBatches = $history->get($cropKey, collect());
                $cropPlans = $planByCrop->get($cropKey, collect());

                $quantity = (float) $cropBatches->sum('quantity');
                $area = $cropBatches
                    ->pluck('field_id')
                    ->filter()
                    ->unique()
                    ->sum(fn ($fieldId) => (float) ($fieldAreas[$fieldId] ?? 0));

                $historicalYield = $area > 0 ? $quantity / $area : null;
                $plannedArea = (float) $cropPlans->sum('planned_area_hectares');
                $forecast = $historicalYield !== null && $plannedArea > 0
                    ? round($historicalYield * $plannedArea, 2)
                    : null;

                $crop = $cropBatches->first()?->crop ?? $cropPlans->first()?->crop;

                return [
                    'crop' => $crop?->name ?? 'Unassigned',
                    'historical_quantity' => round($quantity, 3),
                    'batches' => $cropBatches->count(),
                    'historical_yield_per_ha' => $historicalYield !== null ? round($historicalYield, 3) : null,
                    'planned_area_hectares' => round($plannedArea, 3),
                    'plans' => $cropPlans->count(),
                    'forecast_quantity' => $forecast,
                    'yield_unit' => $cropPlans->first()?->yield_unit
                        ?? $cropBatches->first()?->unit
                        ?? 'quintal',
                ];
            })
            ->filter(fn (array $row) => $row['batches'] > 0 || $row['plans'] > 0)
            ->sortBy([
                fn (array $a, array $b) => ($b['forecast_quantity'] ?? -1) <=> ($a['forecast_quantity'] ?? -1),
                fn (array $a, array $b) => $a['crop'] <=> $b['crop'],
            ])
            ->values();

        return [
            'cutoff' => $cutoff,
            'season' => Season::query()->where('status', 'active')->value('name'),
            'rows' => $rows,
            'totals' => [
                'historical_quantity' => round((float) $rows->sum('historical_quantity'), 3),
                'planned_area_hectares' => round((float) $rows->sum('planned_area_hectares'), 3),
                'forecast_quantity' => round((float) $rows->sum('forecast_quantity'), 2),
            ],
        ];
    }

    private function cashOutlook(): array
    {
        $monthsAhead = 6;
        $today = now();

        $receivables = max(
            (float) Sale::query()->sum('total') - (float) Sale::query()->sum('paid_amount'),
            0
        );
        $openingBalance = (float) Sale::query()->sum('paid_amount') - (float) Expense::query()->sum('amount');
        $baseline = (float) Expense::query()
            ->where('expense_date', '>=', $today->copy()->subMonths(12)->startOfMonth()->toDateString())
            ->sum('amount') / 12;

        $contracts = Contract::query()
            ->where('status', 'active')
            ->where('start_date', '<=', $today->copy()->endOfDay()->toDateTimeString())
            ->where(fn ($query) => $query->whereNull('end_date')->orWhere('end_date', '>=', $today->toDateString()))
            ->get()
            ->map(function (Contract $contract) use ($monthsAhead) {
                $currentStart = now()->startOfMonth();
                $remainingMonths = $contract->end_date
                    ? max(1, $currentStart->diffInMonths(Carbon::parse($contract->end_date)->startOfMonth()) + 1)
                    : $monthsAhead;
                $remainingMonths = min($remainingMonths, $monthsAhead);

                return [
                    'value' => (float) $contract->value,
                    'remaining' => $remainingMonths,
                    'installment' => $remainingMonths > 0 ? (float) $contract->value / $remainingMonths : 0.0,
                ];
            });

        $budgets = Budget::query()
            ->where('status', 'active')
            ->get()
            ->map(function (Budget $budget) {
                $totalMonths = max(
                    1,
                    Carbon::parse($budget->period_start)->startOfMonth()
                        ->diffInMonths(Carbon::parse($budget->period_end)->startOfMonth()) + 1
                );

                return [
                    'start' => Carbon::parse($budget->period_start),
                    'end' => Carbon::parse($budget->period_end),
                    'monthly' => (float) $budget->amount / $totalMonths,
                ];
            });

        $windowStart = $today->copy()->startOfMonth();
        $cumulative = $openingBalance;
        $totals = ['inflow' => 0.0, 'outflow' => 0.0, 'net' => 0.0];

        $rows = collect(range(0, $monthsAhead - 1))
            ->map(function (int $index) use ($contracts, $budgets, $receivables, $baseline, $windowStart, &$cumulative, &$totals) {
                $month = $windowStart->copy()->addMonthsNoOverflow($index);
                $monthEnd = $month->copy()->endOfMonth();

                $contractInflow = $contracts
                    ->filter(fn (array $contract) => $index < $contract['remaining'])
                    ->sum('installment');

                $arInflow = $index === 0 ? $receivables : 0.0;
                $inflow = round($contractInflow + $arInflow, 2);

                $budgeted = $budgets
                    ->filter(fn (array $budget) => ! $budget['end']->lt($month) && ! $budget['start']->gt($monthEnd))
                    ->sum('monthly');
                $outflow = round($budgeted + $baseline, 2);

                $net = round($inflow - $outflow, 2);
                $cumulative = round($cumulative + $net, 2);

                $totals['inflow'] += $inflow;
                $totals['outflow'] += $outflow;
                $totals['net'] += $net;

                return [
                    'month' => $month->format('Y-m'),
                    'label' => $month->format('M y'),
                    'inflow' => [
                        'contracts' => round($contractInflow, 2),
                        'accounts_receivable' => round($arInflow, 2),
                        'total' => $inflow,
                    ],
                    'outflow' => [
                        'budgeted' => round($budgeted, 2),
                        'baseline' => round($baseline, 2),
                        'total' => $outflow,
                    ],
                    'net' => $net,
                    'cumulative' => $cumulative,
                ];
            });

        return [
            'opening_balance' => round($openingBalance, 2),
            'receivables' => round($receivables, 2),
            'baseline_monthly_expense' => round($baseline, 2),
            'months' => $rows,
            'totals' => [
                'inflow' => round($totals['inflow'], 2),
                'outflow' => round($totals['outflow'], 2),
                'net' => round($totals['net'], 2),
            ],
        ];
    }

    private function fieldMap(): array
    {
        $plansByField = CropPlan::query()
            ->with('crop')
            ->whereIn('status', ['planned', 'growing', 'ready', 'active', 'harvested'])
            ->orderByDesc('planting_date')
            ->get()
            ->groupBy('field_id');

        $fields = Field::query()
            ->with('farm')
            ->get()
            ->map(function (Field $field) use ($plansByField) {
                $plan = $plansByField->get($field->id)?->first();
                $boundary = $field->boundary;
                if (is_string($boundary)) {
                    $boundary = json_decode($boundary, true);
                }

                return [
                    'id' => $field->id,
                    'name' => $field->name,
                    'code' => $field->code,
                    'farm' => $field->farm?->name,
                    'area_hectares' => (float) $field->area_hectares,
                    'status' => $field->status,
                    'latitude' => $field->latitude !== null ? (float) $field->latitude : null,
                    'longitude' => $field->longitude !== null ? (float) $field->longitude : null,
                    'crop' => $plan?->crop?->name,
                    'plan_status' => $plan?->status,
                    'boundary' => is_array($boundary) ? $boundary : null,
                ];
            })
            ->values();

        $mapped = $fields
            ->filter(fn (array $field) => $field['latitude'] !== null && $field['longitude'] !== null);

        return [
            'bounds' => $mapped->isEmpty() ? null : [
                'min_latitude' => $mapped->min('latitude'),
                'max_latitude' => $mapped->max('latitude'),
                'min_longitude' => $mapped->min('longitude'),
                'max_longitude' => $mapped->max('longitude'),
            ],
            'fields' => $fields,
            'totals' => [
                'fields' => $fields->count(),
                'area_hectares' => round((float) $fields->sum('area_hectares'), 3),
            ],
        ];
    }

    public function audit(Request $request): JsonResponse
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->query('action'));
        }

        if ($request->filled('resource_type')) {
            $query->where('resource_type', $request->query('resource_type'));
        }

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        $logs = $query->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json([
            'data' => $logs->items(),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }

    /**
     * @param array<string, string|null> $candidates
     */
    private function labelFor(string $groupBy, array $candidates): string
    {
        return $candidates[$groupBy] ?? 'Unassigned';
    }
}
