<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class HarvestBatch extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'batch_number',
        'crop_plan_id',
        'field_id',
        'farm_id',
        'crop_id',
        'harvest_date',
        'quantity',
        'unit',
        'moisture_percent',
        'grade',
        'quality_status',
        'status',
        'location',
        'unit_price',
        'recorded_by',
        'notes',
        'qr_code',
    ];

    protected function casts(): array
    {
        return [
            'harvest_date' => 'date',
            'quantity' => 'float',
            'moisture_percent' => 'float',
            'unit_price' => 'float',
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

    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
