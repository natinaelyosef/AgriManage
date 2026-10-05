<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class PayrollRun extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'period_start',
        'period_end',
        'status',
        'total',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'float',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PayrollItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * One payroll line per active worker with attendance inside the period.
     * Days: present/late = 1, half_day = 0.5, otherwise 0.
     */
    public function generateItems(): void
    {
        $weights = ['present' => 1, 'late' => 1, 'half_day' => 0.5];

        $days = AttendanceRecord::query()
            ->where('organization_id', $this->organization_id)
            ->whereBetween('work_date', [$this->period_start, $this->period_end])
            ->get()
            ->groupBy('worker_id')
            ->map(fn ($records) => round((float) $records->sum(
                fn ($record) => $weights[$record->status] ?? 0
            ), 2));

        if ($days->isEmpty()) {
            return;
        }

        $workers = DB::table('workers')
            ->where('organization_id', $this->organization_id)
            ->where('status', 'active')
            ->whereIn('id', $days->keys())
            ->get(['id', 'name', 'daily_rate']);

        $total = 0;

        foreach ($workers as $worker) {
            $daysWorked = $days[$worker->id] ?? 0;

            if ($daysWorked <= 0) {
                continue;
            }

            $gross = round($daysWorked * (float) $worker->daily_rate, 2);
            $total += $gross;

            PayrollItem::create([
                'organization_id' => $this->organization_id,
                'payroll_run_id' => $this->id,
                'worker_id' => $worker->id,
                'days_worked' => $daysWorked,
                'base_rate' => $worker->daily_rate,
                'gross' => $gross,
                'deductions' => 0,
                'net' => $gross,
            ]);
        }

        $this->update(['total' => round($total, 2)]);
    }
}
