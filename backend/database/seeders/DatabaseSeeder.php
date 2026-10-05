<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\AppNotification;
use App\Models\Crop;
use App\Models\CropPlan;
use App\Models\Customer;
use App\Models\Expense;
use App\Models\Farm;
use App\Models\Field;
use App\Models\AttendanceRecord;
use App\Models\Budget;
use App\Models\Contract;
use App\Models\Equipment;
use App\Models\ExportDocument;
use App\Models\HarvestBatch;
use App\Models\InventoryItem;
use App\Models\IrrigationEvent;
use App\Models\LandRecord;
use App\Models\MaintenanceRecord;
use App\Models\PayrollRun;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Permission;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Season;
use App\Models\Treatment;
use App\Models\User;
use App\Models\Worker;
use App\Support\PermissionCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedPermissions();
        $this->seedCrops();

        $this->seedDemoOrganization([
            'name' => 'Demo Teff Farm — Oromia',
            'type' => 'commercial_farm',
            'region' => 'Oromia',
            'zone' => 'Arsi',
            'woreda' => 'Roobit',
            'slug' => 'demo-teff-farm',
            'farms' => [
                ['name' => 'Robe Valley Farm', 'code' => 'FRM-001', 'area' => 145.5, 'cultivated' => 118.0, 'lat' => 7.6833, 'lng' => 40.1000],
                ['name' => 'Bale Highland Farm', 'code' => 'FRM-002', 'area' => 82.0, 'cultivated' => 54.0, 'lat' => 7.1000, 'lng' => 39.5500],
            ],
        ], withFullCycle: true);

        $this->seedDemoOrganization([
            'name' => 'Demo Coffee Farm — Sidama',
            'type' => 'commercial_farm',
            'region' => 'Sidama',
            'zone' => 'Sidama',
            'woreda' => 'Aleta Wondo',
            'slug' => 'demo-coffee-farm',
            'farms' => [
                ['name' => 'Wondo Estate', 'code' => 'CF-001', 'area' => 64.0, 'cultivated' => 47.0, 'lat' => 6.9667, 'lng' => 38.4833],
            ],
        ], withFullCycle: false);

        $this->seedDemoOrganization([
            'name' => 'Demo Cooperative — Arsi',
            'type' => 'cooperative',
            'region' => 'Oromia',
            'zone' => 'Arsi',
            'woreda' => 'Assela',
            'slug' => 'demo-cooperative',
            'farms' => [
                ['name' => 'Coop Central Shamba', 'code' => 'CO-001', 'area' => 210.0, 'cultivated' => 176.5, 'lat' => 7.8833, 'lng' => 39.1167],
            ],
        ], withFullCycle: false);

        AppNotification::create([
            'organization_id' => Organization::where('slug', 'demo-teff-farm')->first()->id,
            'severity' => 'WARNING',
            'title' => 'Urea stock will last approximately 5 days',
            'message' => 'Current stock is 42 kg against an average daily use of 9 kg across 3 fields.',
            'entity_type' => 'InventoryItem',
            'action_url' => '/app/resources/inventory',
        ]);

        AppNotification::create([
            'organization_id' => Organization::where('slug', 'demo-teff-farm')->first()->id,
            'severity' => 'INFO',
            'title' => 'Payment awaiting verification',
            'message' => 'Telebirr payment of 84,500 ETB from Adama Grain Export needs receipt verification.',
            'entity_type' => 'Payment',
            'action_url' => '/app/finance/payments?status=pending',
        ]);
    }

    private function seedPermissions(): void
    {
        foreach (PermissionCatalog::all() as $module => $keys) {
            foreach ($keys as $key) {
                Permission::query()->firstOrCreate(
                    ['key' => $key],
                    [
                        'name' => ucwords(str_replace('.', ' ', $key)),
                        'module' => str($key)->before('.'),
                        'description' => 'Grants '.$key.' inside '.$module.'.',
                    ]
                );
            }
        }
    }

    private function seedCrops(): void
    {
        $crops = [
            ['name' => 'Teff', 'category' => 'cereal', 'growing_days' => 90],
            ['name' => 'Wheat', 'category' => 'cereal', 'growing_days' => 120],
            ['name' => 'Maize', 'category' => 'cereal', 'growing_days' => 110],
            ['name' => 'Barley', 'category' => 'cereal', 'growing_days' => 100],
            ['name' => 'Sorghum', 'category' => 'cereal', 'growing_days' => 120],
            ['name' => 'Coffee', 'category' => 'perennial', 'growing_days' => 1095],
            ['name' => 'Sesame', 'category' => 'oilseed', 'growing_days' => 95],
            ['name' => 'Chickpea', 'category' => 'legume', 'growing_days' => 95],
            ['name' => 'Haricot Bean', 'category' => 'legume', 'growing_days' => 85],
            ['name' => 'Potato', 'category' => 'tuber', 'growing_days' => 100],
            ['name' => 'Onion', 'category' => 'vegetable', 'growing_days' => 90],
            ['name' => 'Tomato', 'category' => 'vegetable', 'growing_days' => 80],
        ];

        foreach ($crops as $crop) {
            Crop::query()->firstOrCreate(
                ['name' => $crop['name'], 'organization_id' => null],
                $crop + ['default_unit' => 'quintal', 'is_global' => true]
            );
        }
    }

    /**
     * @param array<string, mixed> $organization
     */
    private function seedDemoOrganization(array $organization, bool $withFullCycle): void
    {
        $org = Organization::query()->create([
            'name' => $organization['name'],
            'slug' => $organization['slug'],
            'type' => $organization['type'],
            'region' => $organization['region'],
            'zone' => $organization['zone'],
            'woreda' => $organization['woreda'],
            'plan' => 'professional',
            'email' => 'demo@agrimanage.test',
        ]);

        $permissions = Permission::query()->pluck('id', 'key');
        $roles = [];

        foreach (PermissionCatalog::roleNames() as $slug => $name) {
            $role = Role::create([
                'organization_id' => $org->id,
                'name' => $name,
                'slug' => $slug,
                'is_system' => true,
            ]);

            $keys = PermissionCatalog::roleMap()[$slug] ?? [];
            $role->permissions()->sync($permissions->filter(fn ($id, $key) => in_array($key, $keys, true))->values()->all());

            $roles[$slug] = $role;
        }

        $emailHost = $organization['slug'].'.test';

        $users = collect([
            ['owner', 'Selam Bekele', 'owner', 'Owner'],
            ['manager', 'Dawit Alemu', 'manager', 'Farm Manager'],
            ['agronomist', 'Hanna Tesfaye', 'agronomist', 'Agronomist'],
            ['accountant', 'Yonas Mekonnen', 'accountant', 'Accountant'],
            ['worker', 'Bekir Hassan', 'worker', 'Field Worker'],
        ])->map(fn (array $user) => User::create([
            'organization_id' => $org->id,
            'role_id' => $roles[$user[0]]->id,
            'name' => $user[1],
            'email' => $user[2].'@'.$emailHost,
            'position' => $user[3],
            'password' => 'password',
        ]));

        $owner = $users->first();

        $farms = collect($organization['farms'])->map(fn (array $farm) => Farm::create([
            'organization_id' => $org->id,
            'owner_user_id' => $owner->id,
            'name' => $farm['name'],
            'code' => $farm['code'],
            'type' => 'commercial',
            'region' => $organization['region'],
            'zone' => $organization['zone'],
            'woreda' => $organization['woreda'],
            'kebele' => 'Kebele 04',
            'area_hectares' => $farm['area'],
            'cultivated_hectares' => $farm['cultivated'],
            'latitude' => $farm['lat'],
            'longitude' => $farm['lng'],
            'established_year' => 2016,
            'qr_code' => 'AG-'.strtoupper(Str::random(10)),
            'description' => 'Registered demo farm used for portfolio demonstrations.',
        ]));

        $soils = ['Loam', 'Clay Loam', 'Nitisol', 'Vertisol'];
        $fields = $farms->flatMap(function (Farm $farm) use ($org, $soils, $organization) {
            $count = (int) ceil($farm->cultivated_hectares / 25);

            return collect(range(1, $count))->map(fn ($index) => Field::create([
                'organization_id' => $org->id,
                'farm_id' => $farm->id,
                'name' => $farm->name.' Block '.$index,
                'code' => $farm->code.'-'.str_pad((string) $index, 2, '0', STR_PAD_LEFT),
                'area_hectares' => round($farm->cultivated_hectares / $count, 2),
                'soil_type' => $soils[$index % count($soils)],
                'irrigation_type' => $index % 3 === 0 ? 'Rainfed' : 'Canal',
                'latitude' => $farm->latitude,
                'longitude' => $farm->longitude,
                'altitude_m' => 2000 + ($index * 45),
                'qr_code' => 'AG-'.strtoupper(Str::random(10)),
            ]));
        })->values();

        $season = Season::create([
            'organization_id' => $org->id,
            'name' => 'Meher '.now()->year,
            'code' => 'MEHER-'.now()->year,
            'year' => now()->year,
            'start_date' => now()->subMonths(3)->toDateString(),
            'end_date' => now()->addMonths(4)->toDateString(),
            'status' => 'active',
            'notes' => 'Main cropping season.',
        ]);

        $crops = Crop::query()->where('organization_id', null)->pluck('id', 'name');
        $plans = [];

        $planSeed = [
            ['crop' => 'Teff', 'variety' => 'Quncho', 'share' => 0.45],
            ['crop' => 'Wheat', 'variety' => 'Bavarian', 'share' => 0.30],
            ['crop' => 'Maize', 'variety' => 'MH-140', 'share' => 0.25],
        ];

        foreach ($fields->take($withFullCycle ? 6 : 3) as $index => $field) {
            $seed = $planSeed[$index % count($planSeed)];

            $plans[] = CropPlan::create([
                'organization_id' => $org->id,
                'season_id' => $season->id,
                'field_id' => $field->id,
                'crop_id' => $crops[$seed['crop']],
                'variety' => $seed['variety'],
                'planned_area_hectares' => $field->area_hectares,
                'planting_date' => now()->subMonths(2)->addDays($index * 4)->toDateString(),
                'expected_harvest_date' => now()->addDays(35 + ($index * 6))->toDateString(),
                'expected_yield' => round($field->area_hectares * 18, 2),
                'yield_unit' => 'quintal',
                'estimated_cost' => round($field->area_hectares * 12400, 2),
                'status' => $index < 3 ? 'growing' : 'planned',
            ]);
        }

        $workers = collect([
            ['Bekir Hassan', '+251911000111', 'Field Supervisor', 'permanent', 420],
            ['Marta Girma', '+251911000222', 'Field Worker', 'seasonal', 280],
            ['Kabir Yusuf', '+251911000333', 'Irrigation Operator', 'permanent', 380],
            ['Lensa Tola', '+251911000444', 'Field Worker', 'daily', 250],
        ])->map(fn (array $worker) => Worker::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'name' => $worker[0],
            'phone' => $worker[1],
            'role' => $worker[2],
            'employment_type' => $worker[3],
            'daily_rate' => $worker[4],
            'hire_date' => now()->subMonths(6)->toDateString(),
            'status' => 'active',
        ]));

        $inventory = collect([
            ['Urea 46%', 'fertilizer', 'kg', 42, 96.5, 80, 'Main Store'],
            ['DAP', 'fertilizer', 'kg', 610, 118.0, 150, 'Main Store'],
            ['Teff Seed (Quncho)', 'seed', 'kg', 320, 84.0, 100, 'Seed Store'],
            ['Roundup Herbicide', 'pesticide', 'liter', 26, 640.0, 20, 'Chemical Cabinet'],
            ['Diesel', 'fuel', 'liter', 480, 92.0, 100, 'Pump Station'],
            ['Harvested Teff', 'harvest', 'quintal', 168, 4200.0, 0, 'Warehouse A'],
        ])->map(fn (array $item) => InventoryItem::create([
            'organization_id' => $org->id,
            'name' => $item[0],
            'sku' => strtoupper(Str::random(6)),
            'category' => $item[1],
            'unit' => $item[2],
            'quantity' => $item[3],
            'unit_cost' => $item[4],
            'reorder_level' => $item[5],
            'warehouse' => $item[6],
            'supplier_name' => 'Oromia Agricultural Supplies',
        ]));

        $customers = collect([
            ['Adama Grain Export', 'exporter', '+251911222333'],
            ['Addis Millers PLC', 'processor', '+251911444555'],
            ['Local Market Trader', 'buyer', '+251911666777'],
        ])->map(fn (array $customer) => Customer::create([
            'organization_id' => $org->id,
            'name' => $customer[0],
            'type' => $customer[1],
            'phone' => $customer[2],
            'region' => $organization['region'],
        ]));

        if (! $withFullCycle) {
            return;
        }

        $activityTypes = ['land_preparation', 'planting', 'irrigation', 'fertilizer', 'weeding', 'scouting'];

        foreach ($plans as $planIndex => $plan) {
            foreach (array_slice($activityTypes, 0, 5) as $offset => $type) {
                Activity::create([
                    'organization_id' => $org->id,
                    'crop_plan_id' => $plan->id,
                    'field_id' => $plan->field_id,
                    'farm_id' => $farms->first()->id,
                    'type' => $type,
                    'title' => ucfirst(str_replace('_', ' ', $type)).' — '.$plan->field->name,
                    'status' => $offset < 3 ? 'completed' : ($offset === 3 ? 'in_progress' : 'pending'),
                    'priority' => $offset === 4 ? 'high' : 'medium',
                    'scheduled_date' => now()->subDays(20 - ($offset * 5))->addDays($planIndex)->toDateString(),
                    'assigned_worker_id' => $workers[$offset % $workers->count()]->id,
                    'labor_hours' => 6 + $offset,
                    'cost' => 850 + ($offset * 120),
                    'completed_at' => $offset < 3 ? now()->subDays(19 - ($offset * 5)) : null,
                ]);
            }
        }

        $batches = [];

        foreach (array_slice($plans, 0, 3) as $index => $plan) {
            $quantity = round($plan->expected_yield * (0.72 + ($index * 0.06)), 2);

            $batches[] = HarvestBatch::create([
                'organization_id' => $org->id,
                'batch_number' => 'HB-'.now()->format('ymd').'-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                'crop_plan_id' => $plan->id,
                'field_id' => $plan->field_id,
                'farm_id' => $farms->first()->id,
                'crop_id' => $plan->crop_id,
                'harvest_date' => now()->subDays(12 - ($index * 3))->toDateString(),
                'quantity' => $quantity,
                'unit' => 'quintal',
                'moisture_percent' => 11.2 + $index,
                'grade' => $index === 0 ? 'A' : 'B',
                'quality_status' => $index === 2 ? 'pending' : 'passed',
                'status' => $index === 0 ? 'sold' : 'stored',
                'location' => 'Warehouse A — Bay '.($index + 1),
                'unit_price' => 4200,
                'recorded_by' => $owner->id,
                'qr_code' => 'AG-'.strtoupper(Str::random(10)),
            ]);

            $plan->update(['actual_yield' => $quantity, 'status' => 'harvested']);
        }

        Expense::create([
            'organization_id' => $org->id,
            'category' => 'inputs',
            'title' => 'DAP and Urea purchase',
            'amount' => 48600,
            'expense_date' => now()->subDays(24)->toDateString(),
            'payment_method' => 'bank_transfer',
            'farm_id' => $farms->first()->id,
            'supplier_name' => 'Oromia Agricultural Supplies',
            'created_by' => $owner->id,
        ]);

        Expense::create([
            'organization_id' => $org->id,
            'category' => 'labor',
            'title' => 'Seasonal labor — weeding crew',
            'amount' => 27300,
            'expense_date' => now()->subDays(9)->toDateString(),
            'payment_method' => 'cash',
            'farm_id' => $farms->first()->id,
            'created_by' => $owner->id,
        ]);

        Expense::create([
            'organization_id' => $org->id,
            'category' => 'fuel',
            'title' => 'Diesel for water pump',
            'amount' => 11040,
            'expense_date' => now()->subDays(3)->toDateString(),
            'payment_method' => 'telebirr',
            'created_by' => $owner->id,
        ]);

        $sale = Sale::create([
            'organization_id' => $org->id,
            'customer_id' => $customers->first()->id,
            'invoice_number' => 'INV-'.now()->format('Ym').'-0001',
            'sale_date' => now()->subDays(6)->toDateString(),
            'status' => 'confirmed',
            'payment_status' => 'partial',
            'subtotal' => 168 * 4200,
            'tax_amount' => 0,
            'total' => 168 * 4200,
            'paid_amount' => 300000,
            'created_by' => $owner->id,
            'notes' => 'First consignment of the Meher season.',
        ]);

        SaleItem::create([
            'organization_id' => $org->id,
            'sale_id' => $sale->id,
            'harvest_batch_id' => $batches[0]->id,
            'description' => 'Teff (Quncho) Grade A',
            'quantity' => 168,
            'unit' => 'quintal',
            'unit_price' => 4200,
            'total' => 168 * 4200,
        ]);

        Payment::create([
            'organization_id' => $org->id,
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 300000,
            'method' => 'telebirr',
            'reference' => 'TRB-88231904',
            'paid_at' => now()->subDays(5),
            'status' => 'verified',
            'verified_by' => $users->firstWhere('position', 'Accountant')->id,
            'verified_at' => now()->subDays(5)->addHours(3),
        ]);

        Payment::create([
            'organization_id' => $org->id,
            'sale_id' => $sale->id,
            'direction' => 'in',
            'amount' => 405700,
            'method' => 'bank_transfer',
            'reference' => 'CBE-77190023',
            'paid_at' => now()->subDays(1),
            'status' => 'pending',
            'notes' => 'Awaiting bank slip verification.',
        ]);

        $this->seedOperations($org, $farms, $fields, $workers, $inventory);
        $this->seedFinanceDepth($org, $workers, $farms, $owner);
        $this->seedSupplyChain($org, $farms, $customers, $owner);
    }

    private function seedSupplyChain(Organization $org, $farms, $customers, User $owner): void
    {
        LandRecord::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'parcel_name' => 'Robe Valley Deed',
            'holder_name' => 'Demo Teff Farm PLC',
            'tenure_type' => 'owner',
            'document_number' => 'CSD/ARS/2019/4421',
            'issue_date' => now()->subYears(5)->toDateString(),
            'area_hectares' => 145.5,
            'region' => 'Oromia',
            'zone' => 'Arsi',
            'woreda' => 'Roobit',
            'kebele' => 'Boku Temam',
            'status' => 'active',
            'notes' => 'Freehold title held by the organization.',
        ]);

        LandRecord::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->count() > 1 ? $farms->last()->id : null,
            'parcel_name' => 'Bale Highland Lease',
            'holder_name' => 'Demo Teff Farm PLC',
            'tenure_type' => 'lease',
            'document_number' => 'LSE/BAL/2024/0877',
            'issue_date' => now()->subMonths(14)->toDateString(),
            'expiry_date' => now()->addMonths(10)->toDateString(),
            'area_hectares' => 82.0,
            'region' => 'Oromia',
            'zone' => 'Arsi',
            'woreda' => 'Robe',
            'status' => 'active',
            'notes' => '10-year renewable lease with the regional land bureau.',
        ]);

        Contract::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'title' => 'Teff supply agreement — Addis Millers',
            'type' => 'produce_sale',
            'counterparty' => 'Addis Millers PLC',
            'counterparty_phone' => '+251911444555',
            'start_date' => now()->subMonths(2)->toDateString(),
            'end_date' => now()->addMonths(4)->toDateString(),
            'value' => 1450000,
            'currency' => 'ETB',
            'payment_terms' => '30% advance, balance against delivery notes.',
            'status' => 'active',
            'document_number' => 'AGR-2026-014',
            'created_by' => $owner->id,
        ]);

        Contract::create([
            'organization_id' => $org->id,
            'type' => 'land_lease',
            'title' => 'Bale expansion parcel lease',
            'counterparty' => 'Robe Woreda Land Office',
            'start_date' => now()->addMonth()->toDateString(),
            'end_date' => now()->addYears(5)->toDateString(),
            'value' => 320000,
            'currency' => 'ETB',
            'payment_terms' => 'Annual payment every Meskerem.',
            'status' => 'draft',
            'notes' => 'Pending countersignature.',
            'created_by' => $owner->id,
        ]);

        $exporter = $customers->first();

        ExportDocument::create([
            'organization_id' => $org->id,
            'doc_number' => 'EXP-'.now()->format('ymd').'-0001',
            'customer_id' => $exporter?->id,
            'product' => 'Teff (Quncho) Grade A',
            'quantity' => 120,
            'unit' => 'quintal',
            'unit_price' => 4900,
            'total' => 588000,
            'destination_country' => 'Germany',
            'transport_mode' => 'sea',
            'ship_date' => now()->addDays(21)->toDateString(),
            'status' => 'draft',
            'notes' => 'Phytosanitary certificate pending.',
            'created_by' => $owner->id,
        ]);

        ExportDocument::create([
            'organization_id' => $org->id,
            'doc_number' => 'EXP-'.now()->format('ymd').'-0002',
            'customer_id' => $exporter?->id,
            'product' => 'Teff (Quncho) Grade B',
            'quantity' => 60,
            'unit' => 'quintal',
            'unit_price' => 4400,
            'total' => 264000,
            'destination_country' => 'United Arab Emirates',
            'transport_mode' => 'road',
            'ship_date' => now()->subDays(9)->toDateString(),
            'status' => 'delivered',
            'notes' => 'Delivered and signed for at Jebel Ali.',
            'created_by' => $owner->id,
        ]);
    }

    private function seedFinanceDepth(Organization $org, $workers, $farms, User $owner): void
    {
        $statuses = ['present', 'present', 'present', 'late', 'present', 'absent', 'half_day'];

        foreach ($workers as $workerIndex => $worker) {
            foreach (range(1, 10) as $dayOffset) {
                $status = $statuses[($workerIndex + $dayOffset) % count($statuses)];

                AttendanceRecord::create([
                    'organization_id' => $org->id,
                    'worker_id' => $worker->id,
                    'work_date' => now()->subDays($dayOffset)->toDateString(),
                    'status' => $status,
                    'hours' => $status === 'half_day' ? 4 : ($status === 'absent' ? 0 : ($status === 'late' ? 7 : 8)),
                ]);
            }
        }

        $run = PayrollRun::create([
            'organization_id' => $org->id,
            'period_start' => now()->subDays(10)->toDateString(),
            'period_end' => now()->toDateString(),
            'status' => 'paid',
            'total' => 0,
            'notes' => 'Bi-weekly wage run.',
            'created_by' => $owner->id,
        ]);

        $run->generateItems();

        $poA = PurchaseOrder::create([
            'organization_id' => $org->id,
            'po_number' => 'PO-'.now()->format('ymd').'-0001',
            'supplier' => 'Oromia Agricultural Supplies',
            'farm_id' => $farms->first()->id,
            'order_date' => now()->subDays(8)->toDateString(),
            'expected_date' => now()->subDays(2)->toDateString(),
            'status' => 'received',
            'subtotal' => 43200,
            'total' => 43200,
            'notes' => 'Fertilizer top-up for Meher.',
            'created_by' => $owner->id,
        ]);

        foreach ([
            ['Urea 46% (50kg bag)', 60, 'bag', 480],
            ['DAP (50kg bag)', 36, 'bag', 660],
        ] as [$description, $quantity, $unit, $unitPrice]) {
            PurchaseOrderItem::create([
                'organization_id' => $org->id,
                'purchase_order_id' => $poA->id,
                'description' => $description,
                'quantity' => $quantity,
                'unit' => $unit,
                'unit_price' => $unitPrice,
                'total' => $quantity * $unitPrice,
            ]);
        }

        $poB = PurchaseOrder::create([
            'organization_id' => $org->id,
            'po_number' => 'PO-'.now()->format('ymd').'-0002',
            'supplier' => 'Addis Machine Works',
            'farm_id' => $farms->first()->id,
            'order_date' => now()->subDays(1)->toDateString(),
            'status' => 'draft',
            'subtotal' => 7400,
            'total' => 7400,
            'notes' => 'Spare parts for the tractor.',
            'created_by' => $owner->id,
        ]);

        PurchaseOrderItem::create([
            'organization_id' => $org->id,
            'purchase_order_id' => $poB->id,
            'description' => 'Hydraulic hose kit',
            'quantity' => 2,
            'unit' => 'unit',
            'unit_price' => 1900,
            'total' => 3800,
        ]);

        PurchaseOrderItem::create([
            'organization_id' => $org->id,
            'purchase_order_id' => $poB->id,
            'description' => 'Engine oil filter (10W-30)',
            'quantity' => 4,
            'unit' => 'unit',
            'unit_price' => 900,
            'total' => 3600,
        ]);

        foreach ([
            ['Meher inputs budget', 'inputs', 180000, 'Fertilizer, seed and crop protection.'],
            ['Seasonal labor budget', 'labor', 95000, 'Weeding and harvest crews.'],
            ['Fuel and repairs budget', 'fuel', 60000, 'Diesel, tractor service and spares.'],
        ] as [$name, $category, $amount, $notes]) {
            Budget::create([
                'organization_id' => $org->id,
                'name' => $name,
                'category' => $category,
                'period_start' => now()->subMonths(3)->toDateString(),
                'period_end' => now()->addMonths(3)->toDateString(),
                'amount' => $amount,
                'farm_id' => $farms->first()->id,
                'status' => 'active',
                'notes' => $notes,
            ]);
        }
    }

    private function seedOperations(
        Organization $org,
        $farms,
        $fields,
        $workers,
        $inventory
    ): void {
        $irrigation = [
            [$fields[0], now()->subDays(15)->toDateString(), 'drip', 'well', 95, 42, 380],
            [$fields[1], now()->subDays(11)->toDateString(), 'sprinkler', 'borehole', 120, 55, 640],
            [$fields[2], now()->subDays(7)->toDateString(), 'canal', 'river', 180, null, 210],
            [$fields[0], now()->subDays(4)->toDateString(), 'drip', 'well', 90, 40, 360],
            [$fields[3 % $fields->count()], now()->subDays(2)->toDateString(), 'manual', 'pond', 60, 12, 90],
        ];

        foreach ($irrigation as $index => [$field, $date, $method, $source, $minutes, $volume, $cost]) {
            IrrigationEvent::create([
                'organization_id' => $org->id,
                'field_id' => $field->id,
                'farm_id' => $field->farm_id,
                'irrigation_date' => $date,
                'method' => $method,
                'source' => $source,
                'duration_minutes' => $minutes,
                'volume_m3' => $volume,
                'cost' => $cost,
                'performed_by' => $workers[$index % $workers->count()]->id,
            ]);
        }

        $urea = $inventory->firstWhere('name', 'Urea 46%');
        $dap = $inventory->firstWhere('name', 'DAP');
        $roundup = $inventory->firstWhere('name', 'Roundup Herbicide');

        $treatments = [
            [$fields[0], now()->subDays(22)->toDateString(), 'fertilizer', 'Urea 46%', 150, 'kg/ha', 'broadcast', null, 4, $urea, 150, 6200],
            [$fields[1], now()->subDays(18)->toDateString(), 'fertilizer', 'DAP', 200, 'kg/ha', 'broadcast', null, 3, $dap, 200, 9400],
            [$fields[2], now()->subDays(14)->toDateString(), 'herbicide', 'Roundup 360', 3, 'liter/ha', 'spray', 'Striga and volunteer weeds', 21, $roundup, 3, 2600],
            [$fields[0], now()->subDays(6)->toDateString(), 'pesticide', 'Cypermethrin 10EC', 0.5, 'liter/ha', 'spray', 'Fall armyworm', 14, null, null, 1850],
        ];

        foreach ($treatments as [$field, $date, $category, $product, $dose, $doseUnit, $method, $target, $phi, $item, $used, $cost]) {
            Treatment::create([
                'organization_id' => $org->id,
                'field_id' => $field->id,
                'farm_id' => $field->farm_id,
                'applied_date' => $date,
                'category' => $category,
                'product_name' => $product,
                'dose' => $dose,
                'dose_unit' => $doseUnit,
                'method' => $method,
                'target' => $target,
                'pre_harvest_interval_days' => $phi,
                'inventory_item_id' => $item?->id,
                'quantity_used' => $used,
                'cost' => $cost,
                'performed_by' => $workers[0]->id,
            ]);
        }

        $tractors = Equipment::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'name' => 'Massey Ferguson 375',
            'code' => 'EQ-TR-001',
            'type' => 'tractor',
            'serial_number' => 'MF375-884211',
            'manufacturer' => 'Massey Ferguson',
            'purchase_date' => now()->subYears(3)->toDateString(),
            'status' => 'active',
            'hours_meter' => 2140.5,
            'fuel_type' => 'diesel',
        ]);

        $pump = Equipment::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'name' => 'Honda Water Pump 4"',
            'code' => 'EQ-PM-001',
            'type' => 'irrigation_pump',
            'serial_number' => 'WH20-7112334',
            'manufacturer' => 'Honda',
            'status' => 'active',
            'hours_meter' => 640.0,
            'fuel_type' => 'petrol',
        ]);

        Equipment::create([
            'organization_id' => $org->id,
            'farm_id' => $farms->first()->id,
            'name' => 'Boom Sprayer 600L',
            'code' => 'EQ-SP-001',
            'type' => 'sprayer',
            'manufacturer' => 'Berthoud',
            'status' => 'active',
            'fuel_type' => 'manual',
        ]);

        MaintenanceRecord::create([
            'organization_id' => $org->id,
            'equipment_id' => $tractors->id,
            'title' => '250-hour service and hydraulic check',
            'type' => 'preventive',
            'status' => 'scheduled',
            'next_due_date' => now()->subDays(3)->toDateString(),
            'notes' => 'Overdue — book workshop slot.',
        ]);

        MaintenanceRecord::create([
            'organization_id' => $org->id,
            'equipment_id' => $pump->id,
            'title' => 'Impeller replacement',
            'type' => 'repair',
            'status' => 'completed',
            'performed_date' => now()->subDays(9)->toDateString(),
            'next_due_date' => now()->addMonths(6)->toDateString(),
            'cost' => 4200,
            'notes' => 'Replaced worn impeller and seals.',
        ]);

        MaintenanceRecord::create([
            'organization_id' => $org->id,
            'equipment_id' => $tractors->id,
            'title' => 'Oil and filter change',
            'type' => 'scheduled',
            'status' => 'scheduled',
            'next_due_date' => now()->addDays(12)->toDateString(),
            'cost' => 2800,
        ]);
    }
}
