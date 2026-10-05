<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Concerns\Auditable;
use App\Models\Concerns\BelongsToOrganization;

class Contract extends Model
{
    use Auditable, BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'farm_id',
        'title',
        'type',
        'counterparty',
        'counterparty_phone',
        'start_date',
        'end_date',
        'value',
        'currency',
        'payment_terms',
        'status',
        'document_number',
        'notes',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'value' => 'float',
        ];
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
