<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'type',
        'plan',
        'country',
        'region',
        'zone',
        'woreda',
        'kebele',
        'phone',
        'email',
        'locale',
        'timezone',
        'currency',
        'area_unit',
        'calendar',
        'settings',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'settings' => 'array',
        ];
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function roles(): HasMany
    {
        return $this->hasMany(Role::class);
    }
}
