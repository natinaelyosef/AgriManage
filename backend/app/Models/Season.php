<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Season extends Model
{
    use \App\Models\Concerns\Auditable;
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'code',
        'year',
        'start_date',
        'end_date',
        'status',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'year' => 'integer',
        ];
    }

    public function cropPlans()
    {
        return $this->hasMany(CropPlan::class);
    }
}
