<?php

use App\Http\Controllers\Api\V1\ActivityController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\BudgetController;
use App\Http\Controllers\Api\V1\ContractController;
use App\Http\Controllers\Api\V1\CropController;
use App\Http\Controllers\Api\V1\CropPlanController;
use App\Http\Controllers\Api\V1\CustomerController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EquipmentController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ExportDocumentController;
use App\Http\Controllers\Api\V1\FarmController;
use App\Http\Controllers\Api\V1\FieldController;
use App\Http\Controllers\Api\V1\HarvestController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\IrrigationController;
use App\Http\Controllers\Api\V1\LandRecordController;
use App\Http\Controllers\Api\V1\MaintenanceController;
use App\Http\Controllers\Api\V1\MetaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Http\Controllers\Api\V1\PayrollController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\SaleController;
use App\Http\Controllers\Api\V1\SearchController;
use App\Http\Controllers\Api\V1\SeasonController;
use App\Http\Controllers\Api\V1\TreatmentController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WorkerController;
use Illuminate\Support\Facades\Route;

$apiResource = function (string $uri, string $controller) {
    Route::get($uri, [$controller, 'index']);
    Route::post($uri, [$controller, 'store']);
    Route::get($uri.'/{id}', [$controller, 'show']);
    Route::match(['put', 'patch'], $uri.'/{id}', [$controller, 'update']);
    Route::delete($uri.'/{id}', [$controller, 'destroy']);
};

Route::prefix('v1')->group(function () use ($apiResource) {
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum', 'organization.active'])->group(function () use ($apiResource) {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        Route::get('meta/lookups', [MetaController::class, 'lookups']);
        Route::get('meta/permissions', [MetaController::class, 'permissions']);

        Route::get('dashboard', DashboardController::class);
        Route::get('search', SearchController::class);

        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read-all', [NotificationController::class, 'readAll']);
        Route::post('notifications/{id}/read', [NotificationController::class, 'read']);

    Route::get('reports/profitability', [ReportController::class, 'profitability']);
    Route::get('reports/cash-summary', [ReportController::class, 'cashSummary']);
    Route::get('reports/analytics', [ReportController::class, 'analytics']);
        Route::get('audit-logs', [ReportController::class, 'audit'])->middleware('permission:audit.view');

        $apiResource('farms', FarmController::class);
        $apiResource('land-records', LandRecordController::class);
        $apiResource('contracts', ContractController::class);
        $apiResource('export-documents', ExportDocumentController::class);
        $apiResource('fields', FieldController::class);
        $apiResource('seasons', SeasonController::class);
        $apiResource('crops', CropController::class);
        $apiResource('crop-plans', CropPlanController::class);
        $apiResource('activities', ActivityController::class);
        $apiResource('irrigation-events', IrrigationController::class);
        $apiResource('treatments', TreatmentController::class);
        $apiResource('equipment', EquipmentController::class);
        $apiResource('maintenance-records', MaintenanceController::class);
        $apiResource('harvest-batches', HarvestController::class);
        $apiResource('workers', WorkerController::class);
        $apiResource('attendance-records', AttendanceController::class);
        $apiResource('payroll-runs', PayrollController::class);
        $apiResource('purchase-orders', PurchaseOrderController::class);
        $apiResource('budgets', BudgetController::class);
        $apiResource('inventory-items', InventoryController::class);
        $apiResource('customers', CustomerController::class);
        $apiResource('expenses', ExpenseController::class);
        $apiResource('sales', SaleController::class);
        $apiResource('payments', PaymentController::class);
        $apiResource('users', UserController::class);

        Route::post('inventory-items/{id}/adjust', [InventoryController::class, 'adjust']);
        Route::get('inventory-items/{id}/movements', [InventoryController::class, 'movements']);
        Route::post('payments/{id}/verify', [PaymentController::class, 'verify']);
        Route::post('payments/{id}/reject', [PaymentController::class, 'reject']);
    });
});
