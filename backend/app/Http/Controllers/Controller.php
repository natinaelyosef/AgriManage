<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

abstract class Controller
{
    protected function data(mixed $payload, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $payload], $status);
    }

    protected function paginated($query, Request $request = null): JsonResponse
    {
        $perPage = min((int) ($request?->input('per_page') ?? 15), 100);
        $result = $query->paginate($perPage);

        return response()->json([
            'data' => $result->items(),
            'meta' => [
                'current_page' => $result->currentPage(),
                'last_page' => $result->lastPage(),
                'per_page' => $result->perPage(),
                'total' => $result->total(),
            ],
        ]);
    }
}
