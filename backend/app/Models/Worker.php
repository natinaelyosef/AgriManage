<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Worker extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'farm_id',
        'name',
        'phone',
        'email',
        'role',
        'employment_type',
        'daily_rate',
        'currency',
        'hire_date',
        'status',
        'gender',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'daily_rate' => 'float',
            'hire_date' => 'date',
        ];
    }

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }
}
