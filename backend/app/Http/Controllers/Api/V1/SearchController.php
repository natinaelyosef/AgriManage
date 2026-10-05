<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppNotification;
use App\Models\Customer;
use App\Models\Farm;
use App\Models\Field;
use App\Models\HarvestBatch;
use App\Models\InventoryItem;
use App\Models\Worker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Global search across core entities (fuzzy LIKE + QR exact match).
 */
class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));
        $type = $request->query('type');

        if (mb_strlen($term) < 2) {
            return $this->data(['results' => [], 'term' => $term]);
        }

        $like = '%'.$term.'%';

        $sources = [
            'farm' => fn () => Farm::query()->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)->orWhere('code', 'like', $like)->orWhere('qr_code', $like);
            })->limit(5)->get(['id', 'name', 'code', 'status']),
            'field' => fn () => Field::query()->with('farm:id,name')->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)->orWhere('code', 'like', $like)->orWhere('qr_code', $like);
            })->limit(5)->get(['id', 'name', 'code', 'farm_id', 'status']),
            'worker' => fn () => Worker::query()->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)->orWhere('phone', 'like', $like);
            })->limit(5)->get(['id', 'name', 'phone', 'role', 'status']),
            'customer' => fn () => Customer::query()->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)->orWhere('phone', 'like', $like);
            })->limit(5)->get(['id', 'name', 'type', 'phone']),
            'inventory' => fn () => InventoryItem::query()->where(function ($query) use ($like) {
                $query->where('name', 'like', $like)->orWhere('sku', 'like', $like);
            })->limit(5)->get(['id', 'name', 'sku', 'quantity', 'unit']),
            'harvest' => fn () => HarvestBatch::query()->with('crop:id,name')->where(function ($query) use ($like) {
                $query->where('batch_number', 'like', $like)->orWhere('qr_code', $like);
            })->limit(5)->get(['id', 'batch_number', 'quantity', 'unit', 'harvest_date']),
        ];

        if ($type !== null && isset($sources[$type])) {
            $sources = [$type => $sources[$type]];
        }

        $results = [];

        foreach ($sources as $entity => $loader) {
            foreach ($loader() as $record) {
                $results[] = [
                    'type' => $entity,
                    'id' => $record->id,
                    'label' => $record->name ?? $record->batch_number,
                    'meta' => collect($record->getAttributes())->all(),
                    'url' => sprintf('/app/%s/%s', $entity, $record->id),
                ];
            }
        }

        return $this->data(['results' => $results, 'term' => $term]);
    }
}
