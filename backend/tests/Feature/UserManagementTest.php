<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsTenant;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use BuildsTenant;
    use RefreshDatabase;

    private array $tenant;
    private string $ownerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = $this->makeTenant('member-farm');
        $this->ownerToken = $this->loginAs($this->tenant['users']['owner']);
    }

    private function auth(?string $token = null): array
    {
        return ['Authorization' => 'Bearer '.($token ?? $this->ownerToken), 'Accept' => 'application/json'];
    }

    private function roleId(string $slug): int
    {
        return Role::query()
            ->where('organization_id', $this->tenant['organization']->id)
            ->where('slug', $slug)
            ->value('id');
    }

    public function test_owner_lists_only_their_own_members(): void
    {
        $this->makeTenant('rival-farm');

        $response = $this->getJson('/api/v1/users', $this->auth());

        $response->assertOk()->assertJsonCount(5, 'data');

        $emails = array_column($response->json('data'), 'email');
        $this->assertContains('owner@member-farm.test', $emails);
        $this->assertNotContains('owner@rival-farm.test', $emails);
    }

    public function test_worker_role_can_not_list_members(): void
    {
        $workerToken = $this->loginAs($this->tenant['users']['worker']);

        $this->getJson('/api/v1/users', $this->auth($workerToken))->assertForbidden();
    }

    public function test_owner_creates_a_member_that_can_log_in(): void
    {
        $response = $this->postJson('/api/v1/users', [
            'name' => 'New Manager',
            'email' => 'new.manager@member-farm.test',
            'password' => 'secret123',
            'role_id' => $this->roleId('manager'),
            'position' => 'Farm manager',
            'status' => 'active',
        ], $this->auth());

        $response->assertCreated()
            ->assertJsonPath('data.role.slug', 'manager')
            ->assertJsonPath('data.name', 'New Manager');

        $this->postJson('/api/v1/auth/login', [
            'email' => 'new.manager@member-farm.test',
            'password' => 'secret123',
        ])->assertOk();
    }

    public function test_role_from_another_organization_is_rejected(): void
    {
        $rival = $this->makeTenant('other-farm');
        $rivalRoleId = Role::query()
            ->where('organization_id', $rival['organization']->id)
            ->where('slug', 'manager')
            ->value('id');

        $this->postJson('/api/v1/users', [
            'name' => 'Outsider',
            'email' => 'outsider@member-farm.test',
            'password' => 'secret123',
            'role_id' => $rivalRoleId,
            'status' => 'active',
        ], $this->auth())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['role_id']);
    }

    public function test_owner_can_not_change_their_own_role_or_status(): void
    {
        $this->putJson('/api/v1/users/'.$this->tenant['users']['owner']->id, [
            'name' => 'Owner One',
            'email' => 'owner@member-farm.test',
            'role_id' => $this->roleId('worker'),
            'status' => 'suspended',
            'position' => 'Owner',
        ], $this->auth())
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['status']);
    }

    public function test_the_last_owner_can_not_be_demoted_or_suspended(): void
    {
        $this->postJson('/api/v1/users', [
            'name' => 'Second Owner',
            'email' => 'second.owner@member-farm.test',
            'password' => 'secret123',
            'role_id' => $this->roleId('owner'),
            'status' => 'active',
        ], $this->auth())->assertCreated();

        $this->postJson('/api/v1/users', [
            'name' => 'Ops Manager',
            'email' => 'ops@member-farm.test',
            'password' => 'password',
            'role_id' => $this->roleId('manager'),
            'status' => 'active',
        ], $this->auth())->assertCreated();

        $managerToken = $this->loginAs(User::where('email', 'ops@member-farm.test')->firstOrFail());

        // The manager may demote the second owner while the first owner is still active.
        $secondOwnerId = User::where('email', 'second.owner@member-farm.test')->value('id');
        $this->putJson('/api/v1/users/'.$secondOwnerId, [
            'name' => 'Second Owner',
            'email' => 'second.owner@member-farm.test',
            'role_id' => $this->roleId('manager'),
            'status' => 'active',
        ], $this->auth($managerToken))->assertOk();

        // Now the first owner is the only one left — nobody may demote them.
        $this->putJson('/api/v1/users/'.$this->tenant['users']['owner']->id, [
            'name' => 'Owner One',
            'email' => 'owner@member-farm.test',
            'role_id' => $this->roleId('manager'),
            'status' => 'active',
        ], $this->auth($managerToken))
            ->assertStatus(422)
            ->assertJson(['message' => 'An organization must always keep at least one active owner.']);
    }

    public function test_member_can_not_delete_themselves(): void
    {
        $ownerId = $this->tenant['users']['owner']->id;

        $this->deleteJson('/api/v1/users/'.$ownerId, [], $this->auth())
            ->assertStatus(422)
            ->assertJson(['message' => 'You cannot delete your own account.']);
    }

    public function test_member_deletion_is_audited(): void
    {
        $this->postJson('/api/v1/users', [
            'name' => 'Temp Worker',
            'email' => 'temp@member-farm.test',
            'password' => 'secret123',
            'role_id' => $this->roleId('worker'),
            'status' => 'active',
        ], $this->auth())->assertCreated();

        $tempId = User::where('email', 'temp@member-farm.test')->value('id');

        $this->deleteJson('/api/v1/users/'.$tempId, [], $this->auth())->assertOk();

        $this->assertDatabaseHas('audit_logs', [
            'organization_id' => $this->tenant['organization']->id,
            'resource_type' => 'User',
            'resource_id' => $tempId,
            'action' => 'deleted',
        ]);
    }

    public function test_permissions_meta_exposes_role_ids_for_the_tenant(): void
    {
        $payload = $this->getJson('/api/v1/meta/permissions', $this->auth())
            ->assertOk()
            ->json('data');

        $this->assertEquals($this->roleId('owner'), $payload['role_ids']['owner']);
        $this->assertEquals($this->roleId('manager'), $payload['role_ids']['manager']);
    }
}
