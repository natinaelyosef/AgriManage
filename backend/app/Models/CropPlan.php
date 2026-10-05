<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class CropPlan extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'season_id',
        'field_id',
        'crop_id',
        'variety',
        'planned_area_hectares',
        'planting_date',
        'expected_harvest_date',
        'expected_yield',
        'actual_yield',
        'yield_unit',
        'seed_quantity',
        'estimated_cost',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'planned_area_hectares' => 'float',
            'expected_yield' => 'float',
            'actual_yield' => 'float',
            'seed_quantity' => 'float',
            'estimated_cost' => 'float',
            'planting_date' => 'date',
            'expected_harvest_date' => 'date',
        ];
    }

    public function season(): BelongsTo
    {
        return $this->belongsTo(Season::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class, 'farm_id');
    }

    public function activities()
    {
        return $this->hasMany(Activity::class);
    }

    public function harvestBatches()
    {
        return $this->hasMany(HarvestBatch::class);
    }
}
