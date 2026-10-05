<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Crop;
use App\Models\Permission;
use App\Models\Role;
use App\Support\PermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Static / reference data the frontend needs for forms and lookups.
 */
class MetaController extends Controller
{
    public function permissions(Request $request): JsonResponse
    {
        $grouped = PermissionCatalog::all();
        $stored = Permission::query()->get(['key', 'name', 'module'])->keyBy('key');

        $payload = [];

        foreach ($grouped as $group => $keys) {
            $payload[$group] = array_map(fn ($key) => [
                'key' => $key,
                'name' => $stored[$key]->name ?? str($key)->replace('.', ' ')->title()->value(),
                'module' => $stored[$key]->module ?? 'general',
            ], $keys);
        }

        return $this->data([
            'catalog' => $payload,
            'roles' => PermissionCatalog::roleNames(),
            'role_permissions' => PermissionCatalog::roleMap(),
            'role_ids' => $request->user()?->organization_id
                ? Role::query()
                    ->where('organization_id', $request->user()->organization_id)
                    ->pluck('id', 'slug')
                : [],
        ]);
    }

    public function lookups(): JsonResponse
    {
        return $this->data([
            'organization_types' => [
                'individual_farmer' => 'Individual Farmer',
                'family_farm' => 'Family Farm',
                'commercial_farm' => 'Commercial Farm',
                'cooperative' => 'Cooperative',
                'union' => 'Union',
                'processor' => 'Processor',
                'exporter' => 'Exporter',
                'supplier' => 'Supplier',
                'ngo' => 'NGO',
                'research_institution' => 'Research Institution',
                'government_program' => 'Government Program',
                'agricultural_service' => 'Agricultural Service Company',
            ],
            'seasons' => [
                'belg' => 'Belg',
                'meher' => 'Meher',
                'jelega' => 'Jelega',
                'short_rains' => 'Short Rains',
            ],
            'activity_types' => [
                'land_preparation' => 'Land Preparation',
                'planting' => 'Planting',
                'irrigation' => 'Irrigation',
                'fertilizer' => 'Fertilizer Application',
                'pesticide' => 'Pesticide Application',
                'weeding' => 'Weeding',
                'scouting' => 'Scouting',
                'thinning' => 'Thinning',
                'harvesting' => 'Harvesting',
                'post_harvest' => 'Post-Harvest',
                'maintenance' => 'Maintenance',
                'other' => 'Other',
            ],
            'irrigation_methods' => [
                'drip' => 'Drip',
                'sprinkler' => 'Sprinkler',
                'flood' => 'Flood / Furrow',
                'canal' => 'Canal',
                'pivot' => 'Center Pivot',
                'manual' => 'Manual / Bucket',
            ],
            'irrigation_sources' => [
                'well' => 'Well',
                'borehole' => 'Borehole',
                'river' => 'River',
                'pond' => 'Pond',
                'reservoir' => 'Reservoir',
                'recycled' => 'Recycled Water',
                'rain' => 'Rainfed',
            ],
            'treatment_categories' => [
                'fertilizer' => 'Fertilizer',
                'pesticide' => 'Pesticide',
                'fungicide' => 'Fungicide',
                'herbicide' => 'Herbicide',
                'other' => 'Other',
            ],
            'treatment_methods' => [
                'spray' => 'Spray',
                'broadcast' => 'Broadcast',
                'foliar' => 'Foliar Feed',
                'drench' => 'Drench',
                'soil_application' => 'Soil Application',
                'seed_treatment' => 'Seed Treatment',
            ],
            'equipment_types' => [
                'tractor' => 'Tractor',
                'implement' => 'Implement / Attachments',
                'irrigation_pump' => 'Irrigation Pump',
                'harvester' => 'Harvester',
                'sprayer' => 'Sprayer',
                'vehicle' => 'Vehicle',
                'generator' => 'Generator',
                'tool' => 'Tool',
            ],
            'equipment_statuses' => [
                'active' => 'Active',
                'maintenance' => 'In Maintenance',
                'retired' => 'Retired',
            ],
            'maintenance_types' => [
                'preventive' => 'Preventive',
                'scheduled' => 'Scheduled Service',
                'repair' => 'Repair',
                'emergency' => 'Emergency Repair',
            ],
            'maintenance_statuses' => [
                'scheduled' => 'Scheduled',
                'in_progress' => 'In Progress',
                'completed' => 'Completed',
                'cancelled' => 'Cancelled',
            ],
            'attendance_statuses' => [
                'present' => 'Present',
                'absent' => 'Absent',
                'late' => 'Late',
                'half_day' => 'Half Day',
                'leave' => 'Leave',
            ],
            'payroll_statuses' => [
                'draft' => 'Draft',
                'submitted' => 'Submitted',
                'paid' => 'Paid',
            ],
            'purchase_order_statuses' => [
                'draft' => 'Draft',
                'sent' => 'Sent to Supplier',
                'received' => 'Received',
                'cancelled' => 'Cancelled',
            ],
            'budget_statuses' => [
                'active' => 'Active',
                'closed' => 'Closed',
            ],
            'tenure_types' => [
                'owner' => 'Ownership Certificate',
                'lease' => 'Lease Agreement',
                'grant' => 'Government Grant',
                'permit' => 'Usage Permit',
            ],
            'contract_types' => [
                'land_lease' => 'Land Lease',
                'input_supply' => 'Input Supply',
                'produce_sale' => 'Produce Sale',
                'service' => 'Service Agreement',
            ],
            'contract_statuses' => [
                'draft' => 'Draft',
                'active' => 'Active',
                'expired' => 'Expired',
                'terminated' => 'Terminated',
            ],
            'export_statuses' => [
                'draft' => 'Draft',
                'customs_cleared' => 'Customs Cleared',
                'shipped' => 'Shipped',
                'delivered' => 'Delivered',
                'cancelled' => 'Cancelled',
            ],
            'transport_modes' => [
                'road' => 'Road',
                'rail' => 'Rail',
                'air' => 'Air',
                'sea' => 'Sea',
            ],
            'expense_categories' => [
                'inputs' => 'Seeds & Fertilizer',
                'labor' => 'Labor',
                'equipment' => 'Equipment',
                'fuel' => 'Fuel & Energy',
                'transport' => 'Transport',
                'irrigation' => 'Irrigation',
                'land' => 'Land & Rent',
                'admin' => 'Administration',
                'other' => 'Other',
            ],
            'payment_methods' => [
                'cash' => 'Cash',
                'bank_transfer' => 'Bank Transfer',
                'telebirr' => 'Telebirr',
                'cbe_birr' => 'CBE Birr',
                'chapa' => 'Chapa',
                'mobile_money' => 'Mobile Money',
            ],
            'inventory_categories' => [
                'seed' => 'Seed',
                'fertilizer' => 'Fertilizer',
                'pesticide' => 'Pesticide',
                'tool' => 'Tools & Equipment',
                'fuel' => 'Fuel',
                'harvest' => 'Harvested Produce',
                'other' => 'Other',
            ],
            'units' => [
                'hectare' => 'Hectare',
                'timad' => 'Timad',
                'quintal' => 'Quintal',
                'kilogram' => 'Kilogram',
                'liter' => 'Liter',
                'ton' => 'Ton',
                'piece' => 'Piece',
                'day' => 'Day',
                'hour' => 'Hour',
            ],
            'regions' => [
                'Oromia', 'Amhara', 'Tigray', 'Sidama', 'SNNPR', 'Somali',
                'Afar', 'Benishangul-Gumuz', 'Gambella', 'Central Ethiopia',
                'South Ethiopia', 'Harari', 'Dire Dawa', 'Addis Ababa',
            ],
            'soil_types' => ['Loam', 'Clay Loam', 'Sandy Loam', 'Clay', 'Sandy', 'Vertisol', 'Nitisol', 'Red Soil'],
            'irrigation_types' => ['Rainfed', 'Drip', 'Sprinkler', 'Flood', 'Canal', 'Pivot'],
            'statuses' => [
                'activity' => ['pending' => 'Pending', 'in_progress' => 'In Progress', 'completed' => 'Completed', 'cancelled' => 'Cancelled'],
                'plan' => ['planned' => 'Planned', 'growing' => 'Growing', 'ready' => 'Ready for Harvest', 'harvested' => 'Harvested', 'failed' => 'Failed', 'cancelled' => 'Cancelled'],
                'harvest' => ['recorded' => 'Recorded', 'stored' => 'Stored', 'in_processing' => 'In Processing', 'sold' => 'Sold'],
                'quality' => ['pending' => 'Pending', 'passed' => 'Passed', 'failed' => 'Failed', 'hold' => 'On Hold'],
                'payment' => ['pending' => 'Pending Verification', 'verified' => 'Verified', 'rejected' => 'Rejected'],
            ],
            'crops' => Crop::query()->orderBy('name')->get(['id', 'name', 'category', 'default_unit']),
        ]);
    }
}
