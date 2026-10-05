<?php

namespace Tests\Concerns;

use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;

trait BuildsTenant
{
    /**
     * Creates an organization with the full role/permission matrix and one user
     * per role. Emails are namespaced so multiple tenants can coexist in tests.
     *
     * @return array{organization: Organization, users: array<string, User>}
     */
    protected function makeTenant(string $slug): array
    {
        $organization = Organization::create([
            'name' => ucfirst(str_replace('-', ' ', $slug)),
            'slug' => $slug,
            'type' => 'commercial_farm',
            'region' => 'Oromia',
        ]);

        foreach (PermissionCatalog::all() as $module => $keys) {
            foreach ($keys as $key) {
                Permission::firstOrCreate(
                    ['key' => $key],
                    ['name' => ucwords(str_replace('.', ' ', $key)), 'module' => $module]
                );
            }
        }

        $permissions = Permission::pluck('id', 'key');
        $users = [];

        foreach (PermissionCatalog::roleNames() as $slugKey => $name) {
            $role = Role::create([
                'organization_id' => $organization->id,
                'name' => $name,
                'slug' => $slugKey,
                'is_system' => true,
            ]);

            $keys = PermissionCatalog::roleMap()[$slugKey] ?? [];
            $role->permissions()->sync(
                $permissions->filter(fn ($id, $key) => in_array($key, $keys, true))->values()->all()
            );

            $users[$slugKey] = User::create([
                'organization_id' => $organization->id,
                'role_id' => $role->id,
                'name' => $name.' '.ucfirst($slug),
                'email' => $slugKey.'@'.$slug.'.test',
                'password' => 'password',
            ]);
        }

        return ['organization' => $organization, 'users' => $users];
    }

    protected function loginAs(User $user): string
    {
        $response = $this->postJson('/api/v1/auth/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $response->assertOk();

        return $response->json('data.token');
    }
}
