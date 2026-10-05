<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\AppNotification;
use App\Models\CropPlan;
use App\Models\Expense;
use App\Models\Farm;
use App\Models\Field;
use App\Models\HarvestBatch;
use App\Models\InventoryItem;
use App\Models\IrrigationEvent;
use App\Models\MaintenanceRecord;
use App\Models\Payment;
use App\Models\Sale;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $organizationId = $request->user()->organization_id;
        $from = $request->query('from', now()->startOfYear()->toDateString());
        $to = $request->query('to', now()->toDateString());
        $toBound = \Illuminate\Support\Carbon::parse($to)->endOfDay()->toDateTimeString();

        $revenue = Sale::query()->whereBetween('sale_date', [$from, $toBound])->sum('total');
        $expenses = Expense::query()->whereBetween('expense_date', [$from, $toBound])->sum('amount');

        $openSales = Sale::query()->where('payment_status', '!=', 'paid');
        $receivables = (clone $openSales)->sum('total') - (clone $openSales)->sum('paid_amount');

        $lowStock = InventoryItem::query()
            ->where('reorder_level', '>', 0)
            ->whereColumn('quantity', '<=', 'reorder_level')
            ->get(['id', 'name', 'quantity', 'unit', 'reorder_level']);

        return $this->data([
            'kpis' => [
                'farms' => Farm::query()->count(),
                'fields' => Field::query()->count(),
                'total_hectares' => round((float) Farm::query()->sum('area_hectares'), 2),
                'cultivated_hectares' => round((float) Farm::query()->sum('cultivated_hectares'), 2),
                'active_plans' => CropPlan::query()->whereIn('status', ['planned', 'growing', 'ready'])->count(),
                'workers' => Worker::query()->where('status', 'active')->count(),
                'revenue' => round((float) $revenue, 2),
                'expenses' => round((float) $expenses, 2),
                'profit' => round((float) $revenue - (float) $expenses, 2),
                'receivables' => round((float) $receivables, 2),
                'inventory_value' => round((float) InventoryItem::query()->sum(DB::raw('quantity * unit_cost')), 2),
                'pending_verifications' => Payment::query()->where('status', 'pending')->count(),
                'low_stock_count' => $lowStock->count(),
                'overdue_activities' => Activity::query()
                    ->whereDate('scheduled_date', '<', now()->toDateString())
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->count(),
                'water_usage_m3' => round((float) IrrigationEvent::query()
                    ->whereBetween('irrigation_date', [$from, $toBound])
                    ->sum('volume_m3'), 2),
                'overdue_maintenance' => MaintenanceRecord::query()
                    ->whereNotNull('next_due_date')
                    ->whereDate('next_due_date', '<', now()->toDateString())
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->count(),
            ],
            'today' => Activity::query()
                ->whereDate('scheduled_date', now()->toDateString())
                ->whereNotIn('status', ['cancelled'])
                ->with(['field.farm', 'worker'])
                ->orderBy('priority', 'desc')
                ->get(),
            'upcoming_harvests' => CropPlan::query()
                ->whereIn('status', ['planned', 'growing', 'ready'])
                ->whereNotNull('expected_harvest_date')
                ->orderBy('expected_harvest_date')
                ->limit(5)
                ->with(['crop', 'field.farm'])
                ->get(),
            'recent_harvests' => HarvestBatch::query()
                ->orderByDesc('harvest_date')
                ->limit(5)
                ->with(['crop', 'field'])
                ->get(),
            'low_stock' => $lowStock,
            'trend' => $this->monthlyTrend($organizationId, $from, $to),
            'alerts' => AppNotification::query()
                ->where('organization_id', $organizationId)
                ->orderByDesc('created_at')
                ->limit(6)
                ->get(['id', 'severity', 'title', 'message', 'action_url', 'read_at', 'created_at']),
        ]);
    }

    private function monthlyTrend(int $organizationId, string $from, string $to): array
    {
        $months = [];
        $toBound = \Illuminate\Support\Carbon::parse($to)->endOfDay()->toDateTimeString();

        $revenueByMonth = Sale::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('sale_date', [$from, $toBound])
            ->selectRaw($this->monthExpression('sale_date').' as month, SUM(total) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        $expenseByMonth = Expense::query()
            ->where('organization_id', $organizationId)
            ->whereBetween('expense_date', [$from, $toBound])
            ->selectRaw($this->monthExpression('expense_date').' as month, SUM(amount) as total')
            ->groupBy('month')
            ->pluck('total', 'month');

        foreach ($revenueByMonth as $month => $total) {
            $months[$month] = ['month' => $month, 'revenue' => (float) $total, 'expenses' => 0.0];
        }

        foreach ($expenseByMonth as $month => $total) {
            $months[$month] ??= ['month' => $month, 'revenue' => 0.0, 'expenses' => 0.0];
            $months[$month]['expenses'] = (float) $total;
        }

        ksort($months);

        return collect($months)
            ->map(fn (array $row) => $row + ['profit' => round($row['revenue'] - $row['expenses'], 2)])
            ->values()
            ->all();
    }

    /**
     * Driver-aware "YYYY-MM" expression so trend queries run on MySQL in
     * production and SQLite/Postgres anywhere else (tests, alternative deploys).
     */
    private function monthExpression(string $column): string
    {
        return match (DB::getDriverName()) {
            'mysql' => "DATE_FORMAT({$column}, '%Y-%m')",
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "substr({$column}, 1, 7)",
        };
    }
}
