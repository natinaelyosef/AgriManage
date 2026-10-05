<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use \App\Models\Concerns\BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'inventory_item_id',
        'type',
        'quantity',
        'unit_cost',
        'reference_type',
        'reference_id',
        'reason',
        'user_id',
        'moved_at',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_cost' => 'float',
            'moved_at' => 'datetime',
        ];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
