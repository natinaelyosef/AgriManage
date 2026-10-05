<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Activity extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'crop_plan_id',
        'field_id',
        'farm_id',
        'type',
        'title',
        'description',
        'status',
        'priority',
        'scheduled_date',
        'started_at',
        'completed_at',
        'assigned_worker_id',
        'assigned_user_id',
        'labor_hours',
        'quantity',
        'unit',
        'cost',
        'weather_note',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_date' => 'date',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'labor_hours' => 'float',
            'quantity' => 'float',
            'cost' => 'float',
        ];
    }

    public function cropPlan(): BelongsTo
    {
        return $this->belongsTo(CropPlan::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'assigned_worker_id');
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }
}
