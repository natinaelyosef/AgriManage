<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as LaravelAuthenticate;

/**
 * API consumers are SPAs — never redirect them to a named web login route.
 */
class Authenticate extends LaravelAuthenticate
{
    protected function redirectTo($request): ?string
    {
        if ($request->is('api/*')) {
            return null;
        }

        return parent::redirectTo($request);
    }
}
