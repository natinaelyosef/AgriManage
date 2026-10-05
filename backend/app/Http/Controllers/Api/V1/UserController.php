<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class UserController extends ResourceController
{
    protected string $model = User::class;

    protected string $permission = 'user';

    protected array $searchable = ['name', 'email', 'position'];

    protected array $sortable = ['name', 'email', 'status', 'last_login_at', 'created_at'];

    protected array $with = ['role'];

    protected array $rules = [
        'name' => 'required|string|max:120',
        'email' => 'required|email|max:190|unique:users,email',
        'password' => 'required|string|min:8',
        'role_id' => 'required|integer|exists:roles,id',
        'position' => 'nullable|string|max:64',
        'phone' => 'nullable|string|max:32',
        'status' => 'required|in:active,suspended',
    ];

    /**
     * User rows are tenant-scoped explicitly here (the User model carries no
     * organization global scope so authentication flows stay unscoped).
     */
    protected function newQuery(): Builder
    {
        $query = User::query()->with($this->with);

        $organizationId = auth('sanctum')->user()?->organization_id;

        if ($organizationId !== null) {
            $query->where('organization_id', $organizationId);
        }

        return $query;
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->rules);
        $this->ensureRoleInOrganization($request, (int) $data['role_id']);

        $data['organization_id'] = $request->user()->organization_id;
        $user = User::create($data);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($user->getKey()), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $user = $this->newQuery()->findOrFail($id);

        $rules = $this->updateRules();
        $rules['email'] = ['required', 'email', 'max:190', Rule::unique('users', 'email')->ignore($user->id)];
        $rules['password'] = ['sometimes', 'nullable', 'string', 'min:8'];
        $rules['role_id'] = ['sometimes', 'integer', 'exists:roles,id'];
        $rules['phone'] = ['sometimes', 'nullable', 'string', 'max:32'];
        $rules['position'] = ['sometimes', 'nullable', 'string', 'max:64'];

        $data = $request->validate($rules);

        $roleChanged = isset($data['role_id']) && (int) $data['role_id'] !== $user->role_id;
        $statusChanged = isset($data['status']) && $data['status'] !== $user->status;

        if ($user->id === $request->user()->id && ($roleChanged || $statusChanged)) {
            throw ValidationException::withMessages([
                'status' => ['You cannot change your own role or status.'],
            ]);
        }

        if (isset($data['role_id'])) {
            $this->ensureRoleInOrganization($request, (int) $data['role_id']);
        }

        if ($user->role?->slug === 'owner' && ($roleChanged || ($statusChanged && $data['status'] === 'suspended'))) {
            $this->ensureNotLastOwner($user);
        }

        if (($data['password'] ?? null) === null || $data['password'] === '') {
            unset($data['password']);
        }

        $user->fill($data);
        $user->save();

        return $this->data($this->newQuery()->with($this->with)->findOrFail($user->getKey()));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'delete');

        $user = $this->newQuery()->findOrFail($id);

        if ($user->id === $request->user()->id) {
            abort(422, 'You cannot delete your own account.');
        }

        if ($user->role?->slug === 'owner') {
            $this->ensureNotLastOwner($user);
        }

        $user->delete();

        return $this->data(['deleted' => true, 'id' => $user->id]);
    }

    private function ensureRoleInOrganization(Request $request, int $roleId): void
    {
        $belongs = Role::query()
            ->whereKey($roleId)
            ->where('organization_id', $request->user()->organization_id)
            ->exists();

        if (! $belongs) {
            throw ValidationException::withMessages([
                'role_id' => ['The selected role is invalid.'],
            ]);
        }
    }

    private function ensureNotLastOwner(User $target): void
    {
        $remainingOwners = User::query()
            ->where('organization_id', $target->organization_id)
            ->where('status', 'active')
            ->where('id', '!=', $target->id)
            ->whereHas('role', fn ($query) => $query->where('slug', 'owner'))
            ->count();

        if ($remainingOwners === 0) {
            abort(422, 'An organization must always keep at least one active owner.');
        }
    }
}
