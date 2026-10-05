<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, Auditable;

    protected $fillable = [
        'organization_id',
        'role_id',
        'name',
        'email',
        'phone',
        'position',
        'avatar_url',
        'locale',
        'timezone',
        'status',
        'last_login_at',
        'password',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function organizations(): BelongsToMany
    {
        return $this->belongsToMany(Organization::class);
    }

    public function permissions()
    {
        return $this->role?->permissions()->pluck('key')->values() ?? collect();
    }

    public function hasPermission(string $key): bool
    {
        if ($this->role === null) {
            return false;
        }

        if ($this->role->slug === 'owner') {
            return true;
        }

        if (str_ends_with($key, '.*')) {
            $prefix = substr($key, 0, -1);

            return $this->permissions()->contains(fn ($permission) => str_starts_with($permission, $prefix));
        }

        return $this->permissions()->contains($key);
    }

    public function hasAnyPermission(array $keys): bool
    {
        foreach ($keys as $key) {
            if ($this->hasPermission($key)) {
                return true;
            }
        }

        return false;
    }

    public function isAdmin(): bool
    {
        return in_array($this->role?->slug, ['owner', 'admin'], true);
    }
}
