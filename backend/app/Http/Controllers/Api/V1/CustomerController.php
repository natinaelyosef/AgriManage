<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\Customer;

class CustomerController extends ResourceController
{
    protected string $model = Customer::class;

    protected string $permission = 'customer';

    protected array $searchable = ['name', 'phone', 'email', 'region'];

    protected array $sortable = ['name', 'type', 'status', 'created_at'];

    protected array $rules = [
        'name' => 'required|string|max:160',
        'type' => 'sometimes|string|max:64',
        'phone' => 'nullable|string|max:32',
        'email' => 'nullable|email|max:190',
        'address' => 'nullable|string|max:255',
        'region' => 'nullable|string|max:64',
        'tin_number' => 'nullable|string|max:32',
        'credit_limit' => 'nullable|numeric|min:0',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];
}
