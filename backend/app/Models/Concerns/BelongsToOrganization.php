<?php

namespace App\Models\Concerns;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * Applies tenant (organization) isolation to every record that belongs to an
 * organization. The tenant id is ALWAYS resolved from the authenticated user —
 * never from the request payload.
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        static::addGlobalScope('organization', function (Builder $builder) {
            $organizationId = Auth::guard('sanctum')->user()?->organization_id
                ?? Auth::user()?->organization_id;

            if ($organizationId === null) {
                return;
            }

            $model = $builder->getModel();
            $table = $model->getTable();

            if ($model::allowsGlobalRecords()) {
                $builder->where(function (Builder $query) use ($organizationId, $table) {
                    $query->where($table.'.organization_id', $organizationId)
                        ->orWhereNull($table.'.organization_id');
                });
            } else {
                $builder->where($table.'.organization_id', $organizationId);
            }
        });

        static::creating(function (Model $model) {
            if ($model->getAttribute('organization_id') === null) {
                $model->setAttribute(
                    'organization_id',
                    Auth::guard('sanctum')->user()?->organization_id ?? Auth::user()?->organization_id
                );
            }
        });
    }

    public static function allowsGlobalRecords(): bool
    {
        return false;
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
