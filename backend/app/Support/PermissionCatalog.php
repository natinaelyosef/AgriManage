<?php

namespace App\Support;

/**
 * Central permission catalogue. Format: module.resource.action
 * Permissions are global definitions; role -> permission mappings are created
 * per organization.
 */
class PermissionCatalog
{
    /**
     * @return array<string, array<int, string>>
     */
    public static function all(): array
    {
        return [
            'Organization' => [
                'organization.view',
                'organization.edit',
                'organization.settings.manage',
            ],
            'Users & Roles' => [
                'user.view',
                'user.create',
                'user.edit',
                'user.delete',
                'role.manage',
            ],
            'Farm & Land' => [
                'farm.view',
                'farm.create',
                'farm.edit',
                'farm.delete',
                'farm.export',
                'field.view',
                'field.create',
                'field.edit',
                'field.delete',
                'field.map',
                'landrecord.view',
                'landrecord.create',
                'landrecord.edit',
                'landrecord.delete',
            ],
            'Planning' => [
                'season.view',
                'season.create',
                'season.edit',
                'season.delete',
                'crop.view',
                'crop.create',
                'crop.edit',
                'crop.delete',
                'plan.view',
                'plan.create',
                'plan.edit',
                'plan.delete',
                'plan.approve',
            ],
            'Operations' => [
                'activity.view',
                'activity.create',
                'activity.edit',
                'activity.delete',
                'activity.approve',
                'harvest.view',
                'harvest.create',
                'harvest.edit',
                'harvest.delete',
                'harvest.approve',
                'irrigation.view',
                'irrigation.create',
                'irrigation.edit',
                'irrigation.delete',
                'treatment.view',
                'treatment.create',
                'treatment.edit',
                'treatment.delete',
                'equipment.view',
                'equipment.create',
                'equipment.edit',
                'equipment.delete',
                'maintenance.view',
                'maintenance.create',
                'maintenance.edit',
                'maintenance.delete',
            ],
            'Resources' => [
                'inventory.view',
                'inventory.create',
                'inventory.edit',
                'inventory.delete',
                'inventory.receive',
                'inventory.issue',
                'inventory.export',
                'worker.view',
                'worker.create',
                'worker.edit',
                'worker.delete',
                'worker.attendance',
                'worker.payroll',
                'attendance.view',
                'attendance.create',
                'attendance.edit',
                'attendance.delete',
                'payroll.view',
                'payroll.create',
                'payroll.edit',
                'payroll.delete',
            ],
            'Commerce' => [
                'customer.view',
                'customer.create',
                'customer.edit',
                'customer.delete',
                'sale.view',
                'sale.create',
                'sale.edit',
                'sale.delete',
                'sale.approve',
                'purchaseorder.view',
                'purchaseorder.create',
                'purchaseorder.edit',
                'purchaseorder.delete',
                'contract.view',
                'contract.create',
                'contract.edit',
                'contract.delete',
                'exportdoc.view',
                'exportdoc.create',
                'exportdoc.edit',
                'exportdoc.delete',
            ],
            'Finance' => [
                'expense.view',
                'expense.create',
                'expense.edit',
                'expense.delete',
                'expense.approve',
                'payment.view',
                'payment.create',
                'payment.verify',
                'budget.view',
                'budget.create',
                'budget.edit',
                'budget.delete',
            ],
            'Intelligence' => [
                'report.view',
                'report.export',
                'analytics.view',
            ],
            'Administration' => [
                'audit.view',
                'notification.view',
                'notification.manage',
            ],
        ];
    }

    /**
     * @return array<int, string>
     */
    public static function flat(): array
    {
        $keys = [];

        foreach (self::all() as $group) {
            $keys = array_merge($keys, $group);
        }

        return array_values(array_unique($keys));
    }

    /**
     * @return array<string, array<int, string>>
     */
    public static function roleMap(): array
    {
        $everything = self::flat();

        $managerExcluded = [
            'organization.settings.manage',
            'user.delete',
            'role.manage',
        ];

        return [
            'owner' => $everything,
            'manager' => array_values(array_diff($everything, $managerExcluded)),
            'agronomist' => [
                'organization.view',
                'farm.view',
                'field.view',
                'field.create',
                'field.edit',
                'field.map',
                'landrecord.view',
                'season.view',
                'crop.view',
                'crop.create',
                'crop.edit',
                'plan.view',
                'plan.create',
                'plan.edit',
                'activity.view',
                'activity.create',
                'activity.edit',
                'activity.delete',
                'harvest.view',
                'harvest.create',
                'harvest.edit',
                'irrigation.view',
                'irrigation.create',
                'irrigation.edit',
                'treatment.view',
                'treatment.create',
                'treatment.edit',
                'equipment.view',
                'maintenance.view',
                'inventory.view',
                'worker.view',
                'report.view',
                'analytics.view',
                'notification.view',
                'attendance.view',
                'attendance.create',
                'attendance.edit',
                'purchaseorder.view',
                'budget.view',
                'contract.view',
                'exportdoc.view',
            ],
            'accountant' => [
                'organization.view',
                'farm.view',
                'field.view',
                'season.view',
                'crop.view',
                'plan.view',
                'activity.view',
                'harvest.view',
                'irrigation.view',
                'treatment.view',
                'equipment.view',
                'maintenance.view',
                'inventory.view',
                'customer.view',
                'customer.create',
                'customer.edit',
                'sale.view',
                'sale.create',
                'sale.edit',
                'sale.approve',
                'expense.view',
                'expense.create',
                'expense.edit',
                'expense.delete',
                'expense.approve',
                'payment.view',
                'payment.create',
                'payment.verify',
                'report.view',
                'report.export',
                'analytics.view',
                'audit.view',
                'notification.view',
                'attendance.view',
                'payroll.view',
                'payroll.create',
                'payroll.edit',
                'purchaseorder.view',
                'purchaseorder.create',
                'purchaseorder.edit',
                'budget.view',
                'budget.create',
                'budget.edit',
                'landrecord.view',
                'contract.view',
                'contract.create',
                'contract.edit',
                'exportdoc.view',
                'exportdoc.create',
                'exportdoc.edit',
            ],
            'worker' => [
                'farm.view',
                'field.view',
                'activity.view',
                'activity.edit',
                'harvest.view',
                'harvest.create',
                'irrigation.view',
                'irrigation.create',
                'treatment.view',
                'equipment.view',
                'maintenance.view',
                'inventory.view',
                'notification.view',
                'attendance.view',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function roleNames(): array
    {
        return [
            'owner' => 'Owner',
            'manager' => 'Farm Manager',
            'agronomist' => 'Agronomist',
            'accountant' => 'Accountant',
            'worker' => 'Field Worker',
        ];
    }
}
