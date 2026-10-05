<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\BelongsToOrganization;

class PurchaseOrderItem extends Model
{
    use BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'purchase_order_id',
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

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
}
