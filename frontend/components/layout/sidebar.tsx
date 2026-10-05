"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  LineChart,
  Map,
  Sprout,
  CalendarRange,
  Leaf,
  ClipboardList,
  Truck,
  Wheat,
  Droplets,
  Syringe,
  Cog,
  Wrench,
  CalendarCheck,
  Banknote,
  ShoppingCart,
  PieChart,
  FileText,
  FileSignature,
  Ship,
  Users,
  Package,
  Wallet,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  UserCog,
  Bell,
  History,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n, type TranslationKey } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
}

interface NavGroup {
  labelKey: TranslationKey;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    labelKey: "nav.overview",
    items: [
      { href: "/app", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/app/analytics", labelKey: "nav.analytics", icon: LineChart, permission: "report.view" },
    ],
  },
  {
    labelKey: "nav.land",
    items: [
      { href: "/app/farms", labelKey: "nav.farms", icon: Map, permission: "farm.view" },
      { href: "/app/fields", labelKey: "nav.fields", icon: Sprout, permission: "field.view" },
      { href: "/app/land-records", labelKey: "nav.landRecords", icon: FileText, permission: "landrecord.view" },
      { href: "/app/seasons", labelKey: "nav.seasons", icon: CalendarRange, permission: "season.view" },
    ],
  },
  {
    labelKey: "nav.production",
    items: [
      { href: "/app/crops", labelKey: "nav.crops", icon: Leaf, permission: "crop.view" },
      { href: "/app/plans", labelKey: "nav.cropPlans", icon: ClipboardList, permission: "plan.view" },
      { href: "/app/activities", labelKey: "nav.activities", icon: Truck, permission: "activity.view" },
      { href: "/app/harvest", labelKey: "nav.harvest", icon: Wheat, permission: "harvest.view" },
      { href: "/app/export-documents", labelKey: "nav.exportDocs", icon: Ship, permission: "exportdoc.view" },
      { href: "/app/irrigation", labelKey: "nav.irrigation", icon: Droplets, permission: "irrigation.view" },
      { href: "/app/treatments", labelKey: "nav.treatments", icon: Syringe, permission: "treatment.view" },
    ],
  },
  {
    labelKey: "nav.resources",
    items: [
      { href: "/app/workers", labelKey: "nav.workers", icon: Users, permission: "worker.view" },
      { href: "/app/attendance", labelKey: "nav.attendance", icon: CalendarCheck, permission: "attendance.view" },
      { href: "/app/payroll", labelKey: "nav.payroll", icon: Banknote, permission: "payroll.view" },
      { href: "/app/inventory", labelKey: "nav.inventory", icon: Package, permission: "inventory.view" },
      { href: "/app/equipment", labelKey: "nav.equipment", icon: Cog, permission: "equipment.view" },
      { href: "/app/maintenance", labelKey: "nav.maintenance", icon: Wrench, permission: "maintenance.view" },
    ],
  },
  {
    labelKey: "nav.finance",
    items: [
      { href: "/app/expenses", labelKey: "nav.expenses", icon: Receipt, permission: "expense.view" },
      { href: "/app/sales", labelKey: "nav.sales", icon: Wallet, permission: "sale.view" },
      { href: "/app/payments", labelKey: "nav.payments", icon: CreditCard, permission: "payment.view" },
      { href: "/app/purchase-orders", labelKey: "nav.purchaseOrders", icon: ShoppingCart, permission: "purchaseorder.view" },
      { href: "/app/contracts", labelKey: "nav.contracts", icon: FileSignature, permission: "contract.view" },
      { href: "/app/budgets", labelKey: "nav.budgets", icon: PieChart, permission: "budget.view" },
      { href: "/app/reports", labelKey: "nav.reports", icon: BarChart3, permission: "report.view" },
    ],
  },
  {
    labelKey: "nav.settings",
    items: [
      { href: "/app/settings", labelKey: "nav.settings", icon: Settings },
      { href: "/app/settings/users", labelKey: "nav.users", icon: UserCog, permission: "user.view" },
      { href: "/app/notifications", labelKey: "nav.notifications", icon: Bell },
      { href: "/app/audit", labelKey: "nav.audit", icon: History, permission: "audit.view" },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can, user } = useAuth();
  const { t } = useI18n();

  return (
    <nav className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4" aria-label="Main">
      <div className="px-2">
        <Link href="/app" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            A
          </span>
          <span className="text-[0.95rem] font-bold tracking-tight">AgriManage</span>
        </Link>
        {user?.organization && (
          <p className="mt-2 truncate px-2 text-xs text-muted-foreground" title={user.organization.name}>
            {user.organization.name}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.permission || can(item.permission));
          if (visible.length === 0) return null;
          return (
            <div key={group.labelKey}>
              <p className="px-2 pb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(group.labelKey)}
              </p>
              <ul className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    item.href === "/app"
                      ? pathname === "/app"
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                            : "text-muted hover:bg-earth-100 hover:text-foreground dark:hover:bg-white/5",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
