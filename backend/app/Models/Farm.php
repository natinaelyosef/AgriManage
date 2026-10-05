<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Farm extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'owner_user_id',
        'name',
        'code',
        'type',
        'country',
        'region',
        'zone',
        'woreda',
        'kebele',
        'area_hectares',
        'cultivated_hectares',
        'latitude',
        'longitude',
        'established_year',
        'status',
        'description',
        'custom_fields',
        'qr_code',
    ];

    protected function casts(): array
    {
        return [
            'area_hectares' => 'float',
            'cultivated_hectares' => 'float',
            'latitude' => 'float',
            'longitude' => 'float',
            'custom_fields' => 'array',
        ];
    }

    public function fields()
    {
        return $this->hasMany(Field::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_user_id');
    }
}
