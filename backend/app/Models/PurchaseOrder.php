<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class PurchaseOrder extends Model
{
    use Auditable, BelongsToOrganization, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'po_number',
        'supplier',
        'farm_id',
        'order_date',
        'expected_date',
        'status',
        'subtotal',
        'total',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'subtotal' => 'float',
            'total' => 'float',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
