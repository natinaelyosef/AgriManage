<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Crop extends Model
{
    use \App\Models\Concerns\BelongsToOrganization;
    use SoftDeletes;

    protected $fillable = [
        'organization_id',
        'name',
        'category',
        'default_unit',
        'growing_days',
        'scientific_name',
        'is_global',
    ];

    protected function casts(): array
    {
        return [
            'is_global' => 'boolean',
        ];
    }

    public static function allowsGlobalRecords(): bool
    {
        return true;
    }
}
