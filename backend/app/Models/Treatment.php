<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class Treatment extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'field_id',
        'farm_id',
        'crop_plan_id',
        'applied_date',
        'category',
        'product_name',
        'dose',
        'dose_unit',
        'method',
        'target',
        'pre_harvest_interval_days',
        'inventory_item_id',
        'quantity_used',
        'cost',
        'performed_by',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'dose' => 'float',
            'quantity_used' => 'float',
            'cost' => 'float',
            'pre_harvest_interval_days' => 'integer',
        ];
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function cropPlan(): BelongsTo
    {
        return $this->belongsTo(CropPlan::class);
    }

    public function inventoryItem(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function worker(): BelongsTo
    {
        return $this->belongsTo(Worker::class, 'performed_by');
    }
}
