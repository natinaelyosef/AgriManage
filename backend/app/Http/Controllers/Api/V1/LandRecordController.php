<?php

namespace App\Http\Controllers\Api\V1;

use App\Models\LandRecord;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class LandRecordController extends ResourceController
{
    protected string $model = LandRecord::class;

    protected string $permission = 'landrecord';

    protected array $searchable = ['parcel_name', 'holder_name', 'document_number', 'woreda'];

    protected array $sortable = ['parcel_name', 'area_hectares', 'issue_date', 'expiry_date', 'status', 'created_at'];

    protected array $with = ['farm'];

    protected array $rules = [
        'farm_id' => 'nullable|exists:farms,id',
        'parcel_name' => 'required|string|max:120',
        'holder_name' => 'required|string|max:120',
        'tenure_type' => 'sometimes|string|max:32',
        'document_number' => 'nullable|string|max:64',
        'issue_date' => 'nullable|date',
        'expiry_date' => 'nullable|date',
        'area_hectares' => 'required|numeric|min:0',
        'region' => 'nullable|string|max:64',
        'zone' => 'nullable|string|max:64',
        'woreda' => 'nullable|string|max:64',
        'kebele' => 'nullable|string|max:64',
        'status' => 'sometimes|string|max:32',
        'notes' => 'nullable|string',
    ];

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->filled('expired')) {
            $query->whereNotNull('expiry_date')
                ->whereDate('expiry_date', '<', now()->toDateString())
                ->where('status', '!=', 'expired');
        }
    }
}
