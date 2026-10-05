<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * The API is stateless: Sanctum caches the resolved user on the guard for
     * the lifetime of the application container. Flushing the guards before
     * every request makes each test request resolve its own Bearer token,
     * exactly like a real HTTP request does.
     */
    public function call($method, $uri, $parameters = [], $cookies = [], $files = [], $server = [], $content = null)
    {
        $this->app['auth']->forgetGuards();

        return parent::call($method, $uri, $parameters, $cookies, $files, $server, $content);
    }
}
