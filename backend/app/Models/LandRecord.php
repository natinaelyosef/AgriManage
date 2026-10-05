<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class LandRecord extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'farm_id',
        'parcel_name',
        'holder_name',
        'tenure_type',
        'document_number',
        'issue_date',
        'expiry_date',
        'area_hectares',
        'region',
        'zone',
        'woreda',
        'kebele',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'area_hectares' => 'float',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }
}
