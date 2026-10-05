<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    public function test_registration_creates_organization_owner_and_role_matrix(): void
    {
        $response = $this->postJson('/api/v1/auth/register', [
            'organization' => ['name' => 'New Farm Org', 'type' => 'family_farm'],
            'user' => [
                'name' => 'Aster Nigussie',
                'email' => 'aster@example.com',
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
            ],
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('organizations', ['name' => 'New Farm Org', 'type' => 'family_farm']);
        $this->assertDatabaseHas('users', ['email' => 'aster@example.com']);

        $this->assertCount(5, \App\Models\Role::all());
        $this->assertSame('owner', $response->json('data.user.role.slug'));
        $this->assertNotEmpty($response->json('data.user.permissions'));
    }

    public function test_login_returns_token_and_payload(): void
    {
        $tenant = $this->makeTenant('auth-test');

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $tenant['users']['owner']->email,
            'password' => 'password',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.user.role.slug', 'owner')
            ->assertJsonPath('data.organization.id', $tenant['organization']->id);

        $this->assertNotEmpty($response->json('data.token'));
    }

    public function test_login_rejects_wrong_password(): void
    {
        $tenant = $this->makeTenant('auth-test-2');

        $this->postJson('/api/v1/auth/login', [
            'email' => $tenant['users']['owner']->email,
            'password' => 'wrong-password',
        ])->assertStatus(422);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
