<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Field extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'farm_id',
        'name',
        'code',
        'area_hectares',
        'soil_type',
        'irrigation_type',
        'topography',
        'latitude',
        'longitude',
        'altitude_m',
        'boundary',
        'status',
        'notes',
        'qr_code',
    ];

    protected function casts(): array
    {
        return [
            'area_hectares' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'altitude_m' => 'float',
            'boundary' => 'array',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function cropPlans()
    {
        return $this->hasMany(CropPlan::class);
    }
}
