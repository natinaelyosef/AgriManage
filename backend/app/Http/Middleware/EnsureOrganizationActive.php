<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOrganizationActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null && $user->status !== 'active') {
            return response()->json(['message' => 'This account has been suspended.'], 403);
        }

        if ($user !== null && $user->organization_id !== null) {
            $organization = $user->organization;

            if ($organization !== null && $organization->status !== 'active') {
                return response()->json(['message' => 'This organization is not active.'], 403);
            }
        }

        return $next($request);
    }
}
