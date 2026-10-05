export interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  plan: string;
  country: string;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
  locale: string;
  currency: string;
  area_unit: string;
  calendar: string;
  status: string;
}

export interface RoleSummary {
  id: number;
  name: string;
  slug: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  locale: string;
  avatar_url: string | null;
  last_login_at: string | null;
  role: RoleSummary | null;
  permissions: string[];
  organization: Organization | null;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  organization: Organization;
}

export interface OrgUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  locale: string;
  avatar_url: string | null;
  status: "active" | "suspended";
  last_login_at: string | null;
  created_at: string;
  role: RoleSummary | null;
}

export interface Farm {
  id: number;
  name: string;
  code: string | null;
  type: string;
  country: string;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
  area_hectares: number;
  cultivated_hectares: number;
  latitude: number | null;
  longitude: number | null;
  established_year: number | null;
  status: string;
  description: string | null;
  qr_code: string | null;
  fields?: Field[];
  created_at: string;
}

export interface Field {
  id: number;
  farm_id: number;
  name: string;
  code: string | null;
  area_hectares: number;
  soil_type: string | null;
  irrigation_type: string | null;
  topography: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  boundary: number[][] | null;
  status: string;
  notes: string | null;
  qr_code: string | null;
  farm?: Farm;
  created_at: string;
}

export interface Season {
  id: number;
  name: string;
  code: string | null;
  year: number;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
}

export interface Crop {
  id: number;
  name: string;
  category: string;
  default_unit: string;
  growing_days: number | null;
}

export interface CropPlan {
  id: number;
  season_id: number;
  field_id: number;
  crop_id: number;
  variety: string | null;
  planned_area_hectares: number;
  planting_date: string | null;
  expected_harvest_date: string | null;
  expected_yield: number;
  actual_yield: number;
  yield_unit: string;
  seed_quantity: number | null;
  estimated_cost: number | null;
  status: string;
  notes: string | null;
  season?: Season;
  field?: Field;
  crop?: Crop;
  created_at: string;
}

export type ActivityStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface Activity {
  id: number;
  crop_plan_id: number | null;
  field_id: number | null;
  farm_id: number | null;
  type: string;
  title: string;
  description: string | null;
  status: ActivityStatus;
  priority: "low" | "medium" | "high" | "urgent";
  scheduled_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  assigned_worker_id: number | null;
  labor_hours: number | null;
  quantity: number | null;
  unit: string | null;
  cost: number | null;
  notes: string | null;
  field?: Field;
  crop_plan?: CropPlan;
  worker?: Worker;
  created_at: string;
}

export interface Worker {
  id: number;
  farm_id: number | null;
  name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  employment_type: string;
  daily_rate: number;
  currency: string;
  hire_date: string | null;
  status: string;
  gender: string | null;
  notes: string | null;
  farm?: Farm;
  created_at: string;
}

export interface LandRecord {
  id: number;
  farm_id: number | null;
  parcel_name: string;
  holder_name: string;
  tenure_type: string;
  document_number: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  area_hectares: number;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
  status: string;
  notes: string | null;
  farm?: Farm;
  created_at: string;
}

export interface Contract {
  id: number;
  farm_id: number | null;
  title: string;
  type: string;
  counterparty: string;
  counterparty_phone: string | null;
  start_date: string;
  end_date: string | null;
  value: number;
  currency: string;
  payment_terms: string | null;
  status: string;
  document_number: string | null;
  notes: string | null;
  farm?: Farm;
  created_at: string;
}

export interface ExportDocument {
  id: number;
  doc_number: string;
  customer_id: number | null;
  product: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
  destination_country: string;
  transport_mode: string;
  ship_date: string | null;
  status: string;
  notes: string | null;
  customer?: Customer | null;
  created_at: string;
}

export interface AnalyticsTrendPoint {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface AnalyticsForecastRow {
  crop: string;
  historical_quantity: number;
  batches: number;
  historical_yield_per_ha: number | null;
  planned_area_hectares: number;
  plans: number;
  forecast_quantity: number | null;
  yield_unit: string;
}

export interface CashflowMonth {
  month: string;
  label: string;
  inflow: { contracts: number; accounts_receivable: number; total: number };
  outflow: { budgeted: number; baseline: number; total: number };
  net: number;
  cumulative: number;
}

export interface MappedField {
  id: number;
  name: string;
  code: string | null;
  farm: string | null;
  area_hectares: number;
  status: string;
  latitude: number | null;
  longitude: number | null;
  crop: string | null;
  plan_status: string | null;
  boundary: number[][] | null;
}

export interface AnalyticsPayload {
  trends: {
    from: string;
    to: string;
    months: AnalyticsTrendPoint[];
    totals: { revenue: number; expenses: number; profit: number };
  };
  forecast: {
    cutoff: string;
    season: string | null;
    rows: AnalyticsForecastRow[];
    totals: { historical_quantity: number; planned_area_hectares: number; forecast_quantity: number };
  };
  cashflow: {
    opening_balance: number;
    receivables: number;
    baseline_monthly_expense: number;
    months: CashflowMonth[];
    totals: { inflow: number; outflow: number; net: number };
  };
  field_map: {
    bounds: {
      min_latitude: number;
      max_latitude: number;
      min_longitude: number;
      max_longitude: number;
    } | null;
    fields: MappedField[];
    totals: { fields: number; area_hectares: number };
  };
}

export interface AttendanceRecord {
  id: number;
  worker_id: number;
  work_date: string;
  status: string;
  hours: number | null;
  notes: string | null;
  worker?: Worker;
  created_at: string;
}

export interface PayrollItem {
  id: number;
  payroll_run_id: number;
  worker_id: number;
  days_worked: number;
  base_rate: number;
  gross: number;
  deductions: number;
  net: number;
  notes: string | null;
  worker?: Worker;
}

export interface PayrollRun {
  id: number;
  period_start: string;
  period_end: string;
  status: string;
  total: number;
  notes: string | null;
  items?: PayrollItem[];
  created_at: string;
}

export interface PurchaseOrderItem {
  id?: number;
  purchase_order_id?: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier: string;
  farm_id: number | null;
  order_date: string;
  expected_date: string | null;
  status: string;
  subtotal: number;
  total: number;
  notes: string | null;
  farm?: Farm;
  items?: PurchaseOrderItem[];
  created_at: string;
}

export interface Budget {
  id: number;
  name: string;
  category: string;
  period_start: string;
  period_end: string;
  amount: number;
  farm_id: number | null;
  status: string;
  notes: string | null;
  farm?: Farm;
  spent?: number;
  created_at: string;
}

export interface IrrigationEvent {
  id: number;
  field_id: number;
  farm_id: number | null;
  irrigation_date: string;
  method: string;
  source: string | null;
  duration_minutes: number | null;
  volume_m3: number | null;
  cost: number | null;
  performed_by: number | null;
  notes: string | null;
  field?: Field;
  farm?: Farm;
  worker?: Worker;
  created_at: string;
}

export interface Treatment {
  id: number;
  field_id: number;
  farm_id: number | null;
  crop_plan_id: number | null;
  applied_date: string;
  category: string;
  product_name: string;
  dose: number | null;
  dose_unit: string | null;
  method: string | null;
  target: string | null;
  pre_harvest_interval_days: number | null;
  inventory_item_id: number | null;
  quantity_used: number | null;
  cost: number | null;
  performed_by: number | null;
  notes: string | null;
  field?: Field;
  farm?: Farm;
  crop_plan?: CropPlan;
  inventoryItem?: InventoryItem;
  worker?: Worker;
  created_at: string;
}

export interface Equipment {
  id: number;
  farm_id: number | null;
  name: string;
  code: string | null;
  type: string;
  serial_number: string | null;
  manufacturer: string | null;
  purchase_date: string | null;
  status: string;
  hours_meter: number | null;
  fuel_type: string | null;
  notes: string | null;
  farm?: Farm;
  created_at: string;
}

export interface MaintenanceRecord {
  id: number;
  equipment_id: number;
  title: string;
  type: string;
  status: string;
  performed_date: string | null;
  next_due_date: string | null;
  cost: number | null;
  performed_by: number | null;
  notes: string | null;
  equipment?: Equipment;
  worker?: Worker;
  created_at: string;
}

export interface HarvestBatch {
  id: number;
  batch_number: string;
  crop_plan_id: number | null;
  field_id: number | null;
  farm_id: number | null;
  crop_id: number | null;
  harvest_date: string;
  quantity: number;
  unit: string;
  moisture_percent: number | null;
  grade: string | null;
  quality_status: string;
  status: string;
  location: string | null;
  unit_price: number | null;
  notes: string | null;
  qr_code: string | null;
  field?: Field;
  crop?: Crop;
  crop_plan?: CropPlan;
  created_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  reorder_level: number;
  warehouse: string | null;
  supplier_name: string | null;
  expiry_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface StockMovement {
  id: number;
  inventory_item_id: number;
  type: "in" | "out" | "adjustment";
  quantity: number;
  unit_cost: number | null;
  reason: string | null;
  user?: { id: number; name: string } | null;
  moved_at: string;
}

export interface Customer {
  id: number;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string | null;
  credit_limit: number | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: number;
  category: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  expense_date: string;
  payment_method: string;
  status: string;
  farm_id: number | null;
  field_id: number | null;
  crop_plan_id: number | null;
  supplier_name: string | null;
  farm?: Farm;
  field?: Field;
  crop_plan?: CropPlan;
  created_at: string;
}

export interface SaleItem {
  id?: number;
  harvest_batch_id: number | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total: number;
}

export interface Sale {
  id: number;
  customer_id: number | null;
  invoice_number: string;
  sale_date: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_amount: number;
  currency: string;
  notes: string | null;
  customer?: Customer | null;
  items?: SaleItem[];
  payments?: Payment[];
  created_at: string;
}

export interface Payment {
  id: number;
  sale_id: number | null;
  expense_id: number | null;
  direction: "in" | "out";
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  receipt_url: string | null;
  paid_at: string | null;
  status: "pending" | "verified" | "rejected";
  rejection_reason: string | null;
  notes: string | null;
  sale?: Sale | null;
  verifier?: { id: number; name: string } | null;
  created_at: string;
}

export interface NotificationRecord {
  id: number;
  severity: "INFO" | "WARNING" | "CRITICAL" | "EMERGENCY";
  title: string;
  message: string | null;
  entity_type: string | null;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditLogRecord {
  id: number;
  actor_name: string | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface DashboardPayload {
  kpis: {
    farms: number;
    fields: number;
    total_hectares: number;
    cultivated_hectares: number;
    active_plans: number;
    workers: number;
    revenue: number;
    expenses: number;
    profit: number;
    receivables: number;
    inventory_value: number;
    pending_verifications: number;
    low_stock_count: number;
    overdue_activities: number;
    water_usage_m3: number;
    overdue_maintenance: number;
  };
  today: Activity[];
  upcoming_harvests: CropPlan[];
  recent_harvests: HarvestBatch[];
  low_stock: Array<Pick<InventoryItem, "id" | "name" | "quantity" | "unit" | "reorder_level">>;
  trend: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  alerts: NotificationRecord[];
}

export interface ProfitabilityReport {
  group_by: string;
  from: string;
  to: string;
  rows: Array<{
    label: string;
    quantity: number;
    revenue: number;
    expenses: number;
    profit: number;
    batches: number;
    transactions: number;
  }>;
  totals: { revenue: number; expenses: number; profit: number; quantity: number };
}

export interface Lookups {
  organization_types: Record<string, string>;
  seasons: Record<string, string>;
  activity_types: Record<string, string>;
  irrigation_methods: Record<string, string>;
  irrigation_sources: Record<string, string>;
  treatment_categories: Record<string, string>;
  treatment_methods: Record<string, string>;
  equipment_types: Record<string, string>;
  equipment_statuses: Record<string, string>;
  maintenance_types: Record<string, string>;
  maintenance_statuses: Record<string, string>;
  attendance_statuses: Record<string, string>;
  payroll_statuses: Record<string, string>;
  purchase_order_statuses: Record<string, string>;
  budget_statuses: Record<string, string>;
  tenure_types: Record<string, string>;
  contract_types: Record<string, string>;
  contract_statuses: Record<string, string>;
  export_statuses: Record<string, string>;
  transport_modes: Record<string, string>;
  expense_categories: Record<string, string>;
  payment_methods: Record<string, string>;
  inventory_categories: Record<string, string>;
  units: Record<string, string>;
  regions: string[];
  soil_types: string[];
  irrigation_types: string[];
  statuses: Record<string, Record<string, string>>;
  crops: Crop[];
}
