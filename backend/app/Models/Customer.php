<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'type',
        'phone',
        'email',
        'address',
        'region',
        'tin_number',
        'credit_limit',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'credit_limit' => 'float',
        ];
    }
}
