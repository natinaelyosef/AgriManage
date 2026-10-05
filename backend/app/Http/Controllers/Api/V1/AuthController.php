<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Organization;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'organization.name' => ['required', 'string', 'max:120'],
            'organization.type' => ['required', 'string', 'max:64'],
            'organization.region' => ['nullable', 'string', 'max:64'],
            'organization.phone' => ['nullable', 'string', 'max:32'],
            'user.name' => ['required', 'string', 'max:120'],
            'user.email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'user.password' => ['required', 'string', 'min:8', 'confirmed'],
            'user.phone' => ['nullable', 'string', 'max:32'],
        ]);

        $result = DB::transaction(function () use ($data) {
            $organization = Organization::create([
                'name' => $data['organization']['name'],
                'slug' => Str::slug($data['organization']['name']).'-'.Str::lower(Str::random(5)),
                'type' => $data['organization']['type'],
                'region' => $data['organization']['region'] ?? null,
                'phone' => $data['organization']['phone'] ?? null,
                'email' => $data['user']['email'],
                'plan' => 'free',
            ]);

            $roles = $this->makeRoles($organization);

            $user = User::create([
                'organization_id' => $organization->id,
                'role_id' => $roles['owner']->id,
                'name' => $data['user']['name'],
                'email' => $data['user']['email'],
                'phone' => $data['user']['phone'] ?? null,
                'password' => $data['user']['password'],
                'position' => 'Owner',
            ]);

            return [$organization, $user];
        });

        [$organization, $user] = $result;

        $token = $user->createToken('api')->plainTextToken;

        return $this->data([
            'token' => $token,
            'user' => $this->userPayload($user->fresh()),
            'organization' => $organization,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $credentials['email'])->first();

        if ($user === null || ! Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['This account has been suspended.'],
            ]);
        }

        if ($user->organization_id === null) {
            throw ValidationException::withMessages([
                'email' => ['This account is not linked to an organization.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('api')->plainTextToken;

        return $this->data([
            'token' => $token,
            'user' => $this->userPayload($user->fresh()),
            'organization' => $user->organization,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return $this->data(['logged_out' => true]);
    }

    public function me(Request $request): JsonResponse
    {
        return $this->data($this->userPayload($request->user()));
    }

    protected function userPayload(User $user): array
    {
        $user->loadMissing(['role', 'organization']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'position' => $user->position,
            'locale' => $user->locale,
            'avatar_url' => $user->avatar_url,
            'last_login_at' => $user->last_login_at,
            'role' => $user->role ? [
                'id' => $user->role->id,
                'name' => $user->role->name,
                'slug' => $user->role->slug,
            ] : null,
            'permissions' => $user->role?->slug === 'owner'
                ? PermissionCatalog::flat()
                : $user->permissions()->values(),
            'organization' => $user->organization,
        ];
    }

    /**
     * @return array<string, Role>
     */
    protected function makeRoles(Organization $organization): array
    {
        $permissions = Permission::query()->get()->keyBy('key');
        $roles = [];

        foreach (PermissionCatalog::roleNames() as $slug => $name) {
            $role = Role::create([
                'organization_id' => $organization->id,
                'name' => $name,
                'slug' => $slug,
                'is_system' => true,
                'description' => match ($slug) {
                    'owner' => 'Full access to every module and setting.',
                    'manager' => 'Runs day-to-day farm operations and approvals.',
                    'agronomist' => 'Crop planning, scouting and field advice.',
                    'accountant' => 'Expenses, sales, payments and reporting.',
                    'worker' => 'Field tasks and simple data capture.',
                },
            ]);

            $keys = PermissionCatalog::roleMap()[$slug] ?? [];
            $ids = $permissions->filter(fn ($permission, $key) => in_array($key, $keys, true))->keys()->all();

            $role->permissions()->sync($ids);
            $roles[$slug] = $role;
        }

        return $roles;
    }
}
