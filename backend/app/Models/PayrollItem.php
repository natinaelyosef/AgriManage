<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToOrganization;

class PayrollItem extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'payroll_run_id',
        'worker_id',
        'days_worked',
        'base_rate',
        'gross',
        'deductions',
        'net',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'days_worked' => 'float',
            'base_rate' => 'float',
            'gross' => 'float',
            'deductions' => 'float',
            'net' => 'float',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(PayrollRun::class, 'payroll_run_id');
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class);
    }
}
