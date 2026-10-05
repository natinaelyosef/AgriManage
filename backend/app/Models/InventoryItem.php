<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'sku',
        'category',
        'unit',
        'quantity',
        'unit_cost',
        'reorder_level',
        'warehouse',
        'supplier_name',
        'expiry_date',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_cost' => 'float',
            'reorder_level' => 'float',
            'expiry_date' => 'date',
        ];
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isLowStock(): bool
    {
        return $this->reorder_level > 0 && $this->quantity <= $this->reorder_level;
    }

    public function stockValue(): float
    {
        return round($this->quantity * $this->unit_cost, 2);
    }
}
