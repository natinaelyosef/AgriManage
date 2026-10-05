<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Sale extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'customer_id',
        'invoice_number',
        'sale_date',
        'status',
        'payment_status',
        'subtotal',
        'tax_amount',
        'total',
        'paid_amount',
        'currency',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'sale_date' => 'date',
            'subtotal' => 'float',
            'tax_amount' => 'float',
            'total' => 'float',
            'paid_amount' => 'float',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function balanceDue(): float
    {
        return round($this->total - $this->paid_amount, 2);
    }
}
