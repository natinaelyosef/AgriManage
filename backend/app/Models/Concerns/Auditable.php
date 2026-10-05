<?php

namespace App\Models\Concerns;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Writes an immutable audit trail entry for every create / update / delete.
 * Financial and approval records are never hard-deleted by the application;
 * when they are, the audit entry preserves the payload.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        static::created(function (Model $model) {
            static::writeAudit('created', $model, null, $model->getAttributes());
        });

        static::updated(function (Model $model) {
            $changes = $model->getChanges();
            unset($changes['updated_at']);

            if ($changes === []) {
                return;
            }

            $original = array_intersect_key($model->getOriginal(), $changes);
            static::writeAudit('updated', $model, $original, $changes);
        });

        static::deleted(function (Model $model) {
            $forceDeleted = method_exists($model, 'isForceDeleting') && $model->isForceDeleting();
            static::writeAudit($forceDeleted ? 'force_deleted' : 'deleted', $model, $model->getOriginal(), null);
        });
    }

    protected static function writeAudit(string $action, Model $model, ?array $before, ?array $after): void
    {
        $user = auth('sanctum')->user() ?? auth()->user();

        AuditLog::withoutEvents(function () use ($action, $model, $before, $after, $user) {
            AuditLog::query()->create([
                'organization_id' => $model->getAttribute('organization_id') ?? $user?->organization_id,
                'user_id' => $user?->id,
                'actor_name' => $user?->name,
                'action' => $action,
                'resource_type' => class_basename($model),
                'resource_id' => $model->getKey(),
                'before' => static::sanitizeAuditPayload($before),
                'after' => static::sanitizeAuditPayload($after),
                'ip_address' => request()?->ip(),
                'user_agent' => (string) request()?->userAgent(),
            ]);
        });
    }

    protected static function sanitizeAuditPayload(?array $payload): ?array
    {
        if ($payload === null) {
            return null;
        }

        unset($payload['password'], $payload['remember_token']);

        return $payload;
    }
}
