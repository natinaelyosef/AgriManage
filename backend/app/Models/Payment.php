<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Manual payments are never auto-verified: they enter as `pending` and only
 * become `verified` after a user with finance.payment.verify permission reviews
 * the reference/receipt.
 */
class Payment extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;

    protected $fillable = [
        'organization_id',
        'sale_id',
        'expense_id',
        'direction',
        'amount',
        'currency',
        'method',
        'reference',
        'receipt_url',
        'paid_at',
        'status',
        'verified_by',
        'verified_at',
        'rejection_reason',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'paid_at' => 'datetime',
            'verified_at' => 'datetime',
        ];
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function expense(): BelongsTo
    {
        return $this->belongsTo(Expense::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
