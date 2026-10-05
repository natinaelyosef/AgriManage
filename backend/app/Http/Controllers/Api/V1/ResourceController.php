<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Generic tenant-scoped CRUD. Every subclass declares its model, validation
 * rules and searchable / sortable columns — business logic lives in the models
 * and services, not in copy-pasted controllers.
 *
 * @template TModel of Model
 */
abstract class ResourceController extends Controller
{
    /** @var class-string<TModel> */
    protected string $model;

    /** @var array<string, string> */
    protected array $rules = [];

    protected string $permission = '';

    /** @var array<int, string> */
    protected array $searchable = [];

    /** @var array<int, string> */
    protected array $sortable = ['created_at'];

    /** @var array<int, string> */
    protected array $with = [];

    protected string $defaultSort = '-created_at';

    public function index(Request $request): JsonResponse
    {
        $this->authorize($request, 'view');

        $query = $this->newQuery();

        $this->applySearch($query, $request);
        $this->applyFilters($query, $request);
        $this->applySort($query, $request);

        return $this->paginated($query, $request);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize($request, 'create');

        $data = $request->validate($this->validationRules($request));
        $this->ensureTenantReferences($request, $data);
        $model = $this->newQuery()->make($data);
        $model->save();

        return $this->data($this->newQuery()->with($this->with)->findOrFail($model->getKey()), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'view');

        return $this->data($this->newQuery()->with($this->with)->findOrFail($id));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'edit');

        $model = $this->newQuery()->findOrFail($id);
        $data = $request->validate($this->updateValidationRules($request));
        $this->ensureTenantReferences($request, $data);
        $model->update($data);

        return $this->data($this->newQuery()->with($this->with)->findOrFail($model->getKey()));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->authorize($request, 'delete');

        $model = $this->newQuery()->findOrFail($id);
        $model->delete();

        return $this->data(['deleted' => true, 'id' => $id]);
    }

    /**
     * Server-side permission gate — hidden buttons are never the security boundary.
     */
    protected function authorize(Request $request, string $action): void
    {
        $key = $this->permission !== '' ? $this->permission.'.'.$action : $action;
        $user = $request->user();

        if ($user === null || ! $user->hasPermission($key)) {
            abort(403, 'Missing permission: '.$key);
        }
    }

    /**
     * Every `exists:table,id` rule must resolve to a row owned by the caller's
     * organization — raw `exists` rules ignore tenancy, so tenant A could
     * otherwise attach tenant B's farm/field/sale to its records.
     */
    protected function ensureTenantReferences(Request $request, array $data): void
    {
        $organizationId = $request->user()?->organization_id;

        if ($organizationId === null) {
            return;
        }

        foreach ($this->rules as $field => $rule) {
            $ruleString = is_array($rule) ? implode('|', $rule) : $rule;

            if (! preg_match('/exists:([a-z_]+),id/', $ruleString, $matches)) {
                continue;
            }

            $table = $matches[1];
            $values = str_contains($field, '*')
                ? array_values(array_filter((array) data_get($data, $field), fn ($value) => $value !== null))
                : (($data[$field] ?? null) !== null ? [$data[$field]] : []);

            if ($values === []) {
                continue;
            }

            $modelClass = 'App\\Models\\'.Str::studly(Str::singular($table));
            $allowsGlobal = class_exists($modelClass) && $modelClass::allowsGlobalRecords();

            foreach ($values as $value) {
                $belongs = DB::table($table)
                    ->where('id', $value)
                    ->where(function ($query) use ($organizationId, $allowsGlobal) {
                        $query->where('organization_id', $organizationId);

                        if ($allowsGlobal) {
                            $query->orWhereNull('organization_id');
                        }
                    })
                    ->exists();

                if (! $belongs) {
                    throw ValidationException::withMessages([
                        $field => ['The selected '.str_replace('_', ' ', $field).' is invalid.'],
                    ]);
                }
            }
        }
    }

    /**
     * @return Builder<TModel>
     */
    protected function newQuery(): Builder
    {
        return $this->model::query()->with($this->with);
    }

    /**
     * @return array<string, string|array<int, string>>
     */
    protected function validationRules(Request $request): array
    {
        return $this->rules;
    }

    /**
     * @return array<string, string|array<int, string>>
     */
    protected function updateValidationRules(Request $request): array
    {
        return $this->updateRules();
    }

    /**
     * @return array<string, string>
     */
    protected function updateRules(): array
    {
        $rules = [];

        foreach ($this->rules as $field => $rule) {
            $rules[$field] = str_replace(['sometimes', 'nullable'], [], $rule);
            $rules[$field] = 'sometimes|'.$rules[$field];
        }

        return $rules;
    }

    protected function applySearch(Builder $query, Request $request): void
    {
        $term = trim((string) $request->query('q', ''));

        if ($term === '' || $this->searchable === []) {
            return;
        }

        $like = '%'.$term.'%';

        $query->where(function (Builder $builder) use ($like) {
            foreach ($this->searchable as $index => $column) {
                $prefix = $index === 0 ? 'where' : 'orWhere';

                if (str_contains($column, '.')) {
                    [$relation, $relationColumn] = explode('.', $column, 2);
                    $builder->{$prefix.'Has'}(
                        $relation,
                        fn (Builder $relationQuery) => $relationQuery->where($relationColumn, 'like', $like)
                    );

                    continue;
                }

                $builder->{$prefix}($column, 'like', $like);
            }
        });
    }

    /**
     * Query-string keys that are never column names (date ranges, flags,
     * pagination) — subclasses add their own handling for these.
     */
    protected const NON_FILTER_KEYS = [
        'q', 'sort', 'per_page', 'page', 'include', 'from', 'to',
        'upcoming', 'overdue', 'today', 'low_stock', 'unread', 'severity',
        'expired', 'active',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        foreach ($request->query() as $key => $value) {
            if (in_array($key, self::NON_FILTER_KEYS, true) || is_array($value) || $value === '') {
                continue;
            }

            $query->where($key, $value);
        }
    }

    protected function applySort(Builder $query, Request $request): void
    {
        $sort = (string) $request->query('sort', $this->defaultSort);
        $descending = str_starts_with($sort, '-');
        $column = ltrim($sort, '-');

        if (! in_array($column, $this->sortable, true)) {
            $column = explode(',', $this->defaultSort)[0];
            $column = ltrim($column, '-');
            $descending = str_starts_with($this->defaultSort, '-');
        }

        $query->orderBy($column, $descending ? 'desc' : 'asc');
    }
}
