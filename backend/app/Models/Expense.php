<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Expense extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'category',
        'title',
        'description',
        'amount',
        'currency',
        'expense_date',
        'payment_method',
        'status',
        'farm_id',
        'field_id',
        'crop_plan_id',
        'supplier_name',
        'receipt_url',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'float',
            'expense_date' => 'date',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function field(): BelongsTo
    {
        return $this->belongsTo(Field::class);
    }

    public function cropPlan(): BelongsTo
    {
        return $this->belongsTo(CropPlan::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
