<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class Equipment extends Model
{
    use Auditable, BelongsToOrganization;

    protected $table = 'equipment';

    protected $fillable = [
        'organization_id',
        'farm_id',
        'name',
        'code',
        'type',
        'serial_number',
        'manufacturer',
        'purchase_date',
        'status',
        'hours_meter',
        'fuel_type',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'hours_meter' => 'float',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function maintenanceRecords(): HasMany
    {
        return $this->hasMany(MaintenanceRecord::class);
    }
}
