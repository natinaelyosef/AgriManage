<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class ExportDocument extends Model
{
    use Auditable, BelongsToOrganization, SoftDeletes;

    protected $fillable = [
        'organization_id',
        'doc_number',
        'customer_id',
        'product',
        'quantity',
        'unit',
        'unit_price',
        'total',
        'destination_country',
        'transport_mode',
        'ship_date',
        'status',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'float',
            'unit_price' => 'float',
            'total' => 'float',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
