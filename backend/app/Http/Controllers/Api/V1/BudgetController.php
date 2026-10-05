<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Budget;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class BudgetController extends ResourceController
{
    protected string $model = Budget::class;

    protected string $permission = 'budget';

    protected array $searchable = ['name', 'category', 'notes'];

    protected array $sortable = ['period_start', 'period_end', 'amount', 'name', 'status', 'created_at'];

    protected array $with = ['farm'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'category' => 'required|string|max:64',
        'period_start' => 'required|date',
        'period_end' => 'required|date|after_or_equal:period_start',
        'amount' => 'required|numeric|min:0',
        'farm_id' => 'nullable|exists:farms,id',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];

    /**
     * Every budget row carries `spent` — expenses booked to the same
     * organization + category inside the budget period.
     */
    protected function newQuery(): Builder
    {
        $spent = '(select coalesce(sum(e.amount), 0) from expenses e
            where e.organization_id = budgets.organization_id
            and e.category = budgets.category
            and e.expense_date between budgets.period_start and budgets.period_end)';

        return parent::newQuery()
            ->select((new $this->model)->qualifyColumn('*'))
            ->addSelect(DB::raw($spent.' as spent'));
    }
}
