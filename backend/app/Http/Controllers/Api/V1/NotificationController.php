<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AppNotification::query()
            ->where('organization_id', $request->user()->organization_id)
            ->orderByDesc('created_at');

        if ($request->filled('unread')) {
            $query->whereNull('read_at');
        }

        if ($request->filled('severity')) {
            $query->where('severity', $request->query('severity'));
        }

        $notifications = $query->paginate(min((int) $request->input('per_page', 20), 100));

        return response()->json([
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'unread' => AppNotification::query()
                    ->where('organization_id', $request->user()->organization_id)
                    ->whereNull('read_at')
                    ->count(),
            ],
        ]);
    }

    public function read(Request $request, int $id): JsonResponse
    {
        AppNotification::query()
            ->where('organization_id', $request->user()->organization_id)
            ->where('id', $id)
            ->update(['read_at' => now()]);

        return $this->data(['read' => true, 'id' => $id]);
    }

    public function readAll(Request $request): JsonResponse
    {
        $updated = AppNotification::query()
            ->where('organization_id', $request->user()->organization_id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->data(['read' => true, 'updated' => $updated]);
    }
}
