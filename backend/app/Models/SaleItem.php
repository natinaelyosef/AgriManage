<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    use \App\Models\Concerns\BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'sale_id',
        'harvest_batch_id',
        'description',
        'quantity',
        'unit',
        'unit_price',
        'total',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_price' => 'float',
            'total' => 'float',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function harvestBatch(): BelongsTo
    {
        return $this->belongsTo(HarvestBatch::class);
    }
}
