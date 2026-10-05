<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Enforces `module.resource.action` permissions server side.
 * Hidden buttons are never the security boundary.
 */
class EnsurePermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if ($user->organization_id === null) {
            return response()->json(['message' => 'No organization is linked to this account.'], 403);
        }

        foreach ($permissions as $permission) {
            if ($user->hasPermission($permission)) {
                return $next($request);
            }
        }

        return response()->json([
            'message' => 'This action is not permitted for your role.',
            'required' => $permissions,
        ], 403);
    }
}
