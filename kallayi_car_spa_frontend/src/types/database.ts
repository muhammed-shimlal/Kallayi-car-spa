/**
 * KALLAYI CAR SPA & AUTO CARE - DATABASE TYPES
 * Supabase PostgreSQL TypeScript Schema Definitions
 * 
 * Strict 1-to-1 parity with Django 5.x Models and Supabase DDL.
 */

// ==============================================================================
// 1. ENUMS & LITERAL UNION TYPES
// ==============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export const CANONICAL_VEHICLE_TYPES = [
  'HATCHBACK',
  'SEDAN',
  'COMPACT_SUV',
  'SUV',
  'MUV',
  'LUXURY',
  'BIKE',
  'AUTO',
  'VAN',
] as const;

export type CanonicalVehicleType = typeof CANONICAL_VEHICLE_TYPES[number];

export type VehicleType =
  | CanonicalVehicleType
  | 'ALL'
  | 'FULL_SUV'
  | 'TWO_WHEELER'
  | 'CAR'
  | 'TRUCK';

export type StaffRole =
  | 'MANAGER'
  | 'TECHNICIAN'
  | 'DRIVER'
  | 'WASHER'
  | 'ADMIN';

export type SalaryType =
  | 'DAILY'
  | 'MONTHLY'
  | 'COMMISSION'
  | 'CUSTOM';

export type CommissionType =
  | 'PERCENTAGE'
  | 'FIXED';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITING'
  | 'IN_BAY_1'
  | 'IN_BAY_2'
  | 'DETAILING'
  | 'READY'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'UPI'
  | 'BANK_TRANSFER'
  | 'CARD'
  | 'CHEQUE';

export type InvoicePaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'ONLINE'
  | 'SPLIT';

export type ExpenseType =
  | 'BUSINESS'
  | 'STAFF';

export type ExpenseTransactionType =
  | 'ADVANCE'
  | 'DEDUCTION'
  | 'BONUS'
  | 'REIMBURSEMENT'
  | 'INCENTIVE';

export type ExpenseStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PAID'
  | 'CANCELLED';

export type KhataTransactionType =
  | 'CHARGE'
  | 'SETTLEMENT';

export type NotificationType =
  | 'SMS'
  | 'EMAIL'
  | 'WHATSAPP';

export type PaymentTransactionStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED';

export type FleetLogType =
  | 'FUEL'
  | 'MAINTENANCE'
  | 'OTHER';

export type ChemicalRecipe = Record<string, number>;

// ==============================================================================
// 2. DATABASE ENTITY ROWS (POSTGRESQL TABLE SCHEMAS)
// ==============================================================================

export type PasswordResetOtpRow = {
  id: string; // UUID
  phone_number: string;
  otp_code: string;
  created_at: string;
  is_used: boolean;
};

export type StaffProfileRow = {
  id: string; // UUID
  user_id: string; // UUID -> auth.users
  role: StaffRole;
  phone_number: string;
  salary_type: SalaryType;
  salary_amount: number;
  hourly_rate: number;
  base_salary: number;
  commission_type: CommissionType;
  commission_rate: number;
  commission_percentage?: number;
  commission_amount: number;
  retained_balance?: number;
  joining_date: string;
  is_active: boolean;
  is_online: boolean;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryRow = {
  id: number;
  staff_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  clock_in_location: string;
  clock_out_location: string;
  created_at: string;
};

export type SubscriptionPlanRow = {
  id: number;
  name: string;
  price: number;
  interval_days: number;
  description: string;
  created_at: string;
};

export type CustomerRow = {
  id: string;
  user_id: string | null;
  name: string;
  phone_number: string;
  address: string;
  loyalty_points: number;
  outstanding_balance: number;
  credit_limit: number;
  created_at: string;
  updated_at: string;
};

export type MemberSubscriptionRow = {
  id: number;
  customer_id: string;
  plan_id: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  auto_renew: boolean;
  created_at: string;
};

export type CustomerVehicleRow = {
  id: number;
  user_id: string | null;
  make: string;
  model: string;
  plate_number: string;
  registration_number: string;
  color: string;
  year: number | null;
  notes: string;
  vehicle_type: VehicleType;
  created_at: string;
};

export type CouponRow = {
  id: number;
  code: string;
  discount_percentage: number;
  expiry_date: string;
  is_active: boolean;
  created_at: string;
};

export type CommissionRuleRow = {
  id: number;
  name: string;
  flat_amount: number;
  percentage: number;
  created_at: string;
};

export type ServicePackageRow = {
  id: number;
  name: string;
  price: number;
  description: string;
  duration_minutes: number;
  vehicle_type: VehicleType;
  chemical_recipe: ChemicalRecipe;
  commission_rule_id: number | null;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
  icon_url?: string | null;
  base_price?: number;
  final_price?: number;
  tiered_prices?: ServicePackagePriceRow[];
  service_package_prices?: ServicePackagePriceRow[];
  tier_prices?: Record<string, number>;
  is_applicable?: boolean;
};

export type ServiceRow = ServicePackageRow;

export type ServicePackagePriceRow = {
  id: number;
  package_id: number;
  service_id?: number;
  vehicle_type: string;
  price: number;
  estimated_time_minutes?: number | null;
};

export type ServiceTierPriceRow = ServicePackagePriceRow;

export type SOPChecklistRow = {
  id: number;
  name: string;
  service_package_id: number | null;
  items: string[];
  created_at: string;
};

export type BookingRow = {
  id: number;
  customer_id: string;
  vehicle_id: number;
  technician_id: string | null;
  service_package_id: number | null;
  time_slot: string;
  end_time: string | null;
  start_time: string | null;
  status: BookingStatus;
  bay_assignment: string | null;
  points_redeemed: number;
  base_price: number;
  final_price: number;
  discount_amount: number;
  discount_percentage: number;
  discount_reason?: string | null;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type JobInspectionRow = {
  id: number;
  booking_id: number;
  performed_by_id: string | null;
  checklist_data: Record<string, boolean>;
  photo_proof: string | null;
  passed: boolean;
  notes: string;
  created_at: string;
};

export type ReviewRow = {
  id: number;
  customer_id: string;
  booking_id: number;
  rating: number;
  comment: string;
  created_at: string;
};

export type RevenueCategoryRow = {
  id: number;
  name: string;
  description: string;
  created_at: string;
};

export type ExpenseCategoryRow = {
  id: number;
  name: string;
  description: string;
  created_at: string;
};

export type GeneralExpenseRow = {
  id: number;
  category_id: number | null;
  expense_type: ExpenseType;
  transaction_type: ExpenseTransactionType | null;
  payment_method: PaymentMethod;
  staff_id: string | null;
  amount: number;
  description: string;
  notes: string;
  date: string;
  receipt_image: string | null;
  recorded_by_id: string | null;
  status: ExpenseStatus;
  approved_by_id: string | null;
  approved_at: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type SalaryPaymentRow = {
  id: number;
  staff_id: string;
  payment_date: string;
  period_start: string;
  period_end: string;
  calculated_payable: number;
  paid_amount: number;
  remaining_balance: number;
  payment_method: PaymentMethod;
  reference_number: string;
  notes: string;
  created_by_id: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
  is_active: boolean;
};

export type ChemicalInventoryRow = {
  id: number;
  name: string;
  current_volume: number;
  cost_per_unit: number;
  uom: string;
  reorder_level: number;
  created_at: string;
  updated_at: string;
};

export type ChemicalUsageLogRow = {
  id: number;
  inventory_item_id: number;
  booking_id: number | null;
  amount_used: number;
  timestamp: string;
};

export type PayrollEntryRow = {
  id: number;
  staff_user_id: string;
  date: string;
  base_wage: number;
  commission_earned: number;
  tips_earned: number;
  gross_earnings?: number;
  commission_amount?: number;
  advance_deducted?: number;
  previous_retained_applied?: number;
  net_payable?: number;
  amount_paid?: number;
  balance_retained?: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
};

export type DeferredRevenueRow = {
  id: number;
  customer_id: string;
  total_amount: number;
  remaining_balance: number;
  start_date: string;
  end_date: string;
  daily_amortization_rate: number;
  created_at: string;
};

export type InvoiceRow = {
  id: number;
  booking_id: number | null;
  subscription_id: number | null;
  amount: number;
  base_price: number;
  final_price: number;
  discount_amount: number;
  discount_percentage: number;
  discount_reason?: string | null;
  revenue_category_id: number | null;
  is_deferred: boolean;
  is_paid: boolean;
  payment_method: InvoicePaymentMethod | null;
  split_cash: number;
  split_online: number;
  split_khata: number;
  cash_collected_by_staff_id?: string | null;
  created_at: string;
};

export type StaffAdvanceRow = {
  id: string;
  staff_id: string;
  amount: number;
  date?: string;
  purpose: string;
  is_settled: boolean;
  settled_at?: string | null;
  payout_id?: number | null;
  created_at?: string;
};

export type StaffCashHandoverRow = {
  id: string;
  staff_id: string;
  amount: number;
  notes?: string | null;
  handover_date?: string;
  received_by_user_id?: string | null;
  created_at?: string;
};

export type KhataStatus = 'PENDING' | 'PARTIALLY_PAID' | 'SETTLED';

export type KhataLedgerRow = {
  id: number;
  customer_id: string;
  amount: number;
  transaction_type: KhataTransactionType;
  description: string;
  related_booking_id: number | null;
  booking_id?: number | null;
  invoice_id?: number | null;
  number_plate_image: string | null;
  transaction_date?: string;
  due_date?: string;
  status?: KhataStatus;
  settled_at?: string | null;
  last_reminder_sent_at?: string | null;
  reminder_count?: number;
  customer_phone?: string | null;
  created_at: string;
};

export type DailyRegisterAuditRow = {
  id: number;
  date: string;
  closed_by_id: string | null;
  closed_at: string;
  gross_revenue: number;
  expected_cash_in_till: number;
  total_expenses: number;
  is_locked: boolean;
  created_at: string;
};

export type BankTransactionType = 'DEPOSIT' | 'WITHDRAWAL';

export type BankTransactionRow = {
  id: number;
  amount: number;
  transaction_type: BankTransactionType;
  bank_name: string;
  purpose: string;
  reference_number: string | null;
  receipt_image: string | null;
  recorded_by_id: string | null;
  recorded_by_name: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
};

export type CollectionBankRow = {
  id: number;
  date: string;
  amount: number;
  notes: string;
  recorded_by_id: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationLogRow = {
  id: number;
  booking_id: number | null;
  type: NotificationType;
  recipient: string;
  message: string;
  status: string;
  sent_at: string;
};

export type PaymentTransactionRow = {
  id: number;
  invoice_id: number;
  stripe_payment_intent_id: string;
  amount: number;
  status: PaymentTransactionStatus;
  provider_response: Record<string, unknown>;
  timestamp: string;
};

export type FleetVehicleRow = {
  id: number;
  owner_id: string;
  model: string;
  plate_number: string;
  last_wash_date: string | null;
  gps_coordinates: string;
  created_at: string;
};

export type FleetAccountRow = {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  billing_cycle_days: number;
  created_at: string;
};

export type FleetAccountVehicleRow = {
  fleet_account_id: number;
  vehicle_id: number;
};

export type ServiceVehicleRow = {
  id: number;
  make: string;
  model: string;
  plate_number: string;
  is_active: boolean;
  last_service_odometer: number;
  service_interval_km: number;
  created_at: string;
};

export type VehicleAssignmentRow = {
  id: number;
  vehicle_id: number;
  technician_id: string;
  assigned_at: string;
};

export type FleetLogRow = {
  id: number;
  vehicle_id: number;
  log_type: FleetLogType;
  amount: number;
  odometer: number;
  receipt_photo: string | null;
  notes: string;
  recorded_by_id: string | null;
  created_at: string;
};

export type TechnicianLocationRow = {
  technician_id: string;
  latitude: number;
  longitude: number;
  last_updated: string;
};

// ==============================================================================
// 3. DATABASE SCHEMA INTERFACE (FOR SUPABASE CLIENT GENERICS)
// ==============================================================================

export type Database = {
  public: {
    Tables: {
      password_reset_otps: {
        Row: PasswordResetOtpRow;
        Insert: Partial<PasswordResetOtpRow> & { phone_number: string; otp_code: string };
        Update: Partial<PasswordResetOtpRow>;
        Relationships: [];
      };
      staff_profiles: {
        Row: StaffProfileRow;
        Insert: Partial<StaffProfileRow> & { user_id: string };
        Update: Partial<StaffProfileRow>;
        Relationships: [];
      };
      time_entries: {
        Row: TimeEntryRow;
        Insert: Partial<TimeEntryRow> & { staff_id: string; clock_in_time: string };
        Update: Partial<TimeEntryRow>;
        Relationships: [
          {
            foreignKeyName: 'time_entries_staff_id_fkey';
            columns: ['staff_id'];
            isOneToOne: false;
            referencedRelation: 'staff_profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      subscription_plans: {
        Row: SubscriptionPlanRow;
        Insert: Partial<SubscriptionPlanRow> & { name: string; price: number };
        Update: Partial<SubscriptionPlanRow>;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: Partial<CustomerRow> & { user_id?: string | null; name?: string; phone_number?: string };
        Update: Partial<CustomerRow>;
        Relationships: [];
      };
      member_subscriptions: {
        Row: MemberSubscriptionRow;
        Insert: Partial<MemberSubscriptionRow> & { customer_id: string; plan_id: number; end_date: string };
        Update: Partial<MemberSubscriptionRow>;
        Relationships: [
          {
            foreignKeyName: 'member_subscriptions_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'member_subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_plans';
            referencedColumns: ['id'];
          }
        ];
      };
      customer_vehicles: {
        Row: CustomerVehicleRow;
        Insert: Partial<CustomerVehicleRow> & { user_id?: string | null; make: string; model: string; plate_number: string };
        Update: Partial<CustomerVehicleRow>;
        Relationships: [];
      };
      coupons: {
        Row: CouponRow;
        Insert: Partial<CouponRow> & { code: string; discount_percentage: number; expiry_date: string };
        Update: Partial<CouponRow>;
        Relationships: [];
      };
      commission_rules: {
        Row: CommissionRuleRow;
        Insert: Partial<CommissionRuleRow> & { name: string };
        Update: Partial<CommissionRuleRow>;
        Relationships: [];
      };
      service_packages: {
        Row: ServicePackageRow;
        Insert: Partial<ServicePackageRow> & { name: string; price: number };
        Update: Partial<ServicePackageRow>;
        Relationships: [
          {
            foreignKeyName: 'service_packages_commission_rule_id_fkey';
            columns: ['commission_rule_id'];
            isOneToOne: false;
            referencedRelation: 'commission_rules';
            referencedColumns: ['id'];
          }
        ];
      };
      service_package_prices: {
        Row: ServicePackagePriceRow;
        Insert: Partial<ServicePackagePriceRow> & { package_id: number; vehicle_type: string; price: number };
        Update: Partial<ServicePackagePriceRow>;
        Relationships: [
          {
            foreignKeyName: 'service_package_prices_package_id_fkey';
            columns: ['package_id'];
            isOneToOne: false;
            referencedRelation: 'service_packages';
            referencedColumns: ['id'];
          }
        ];
      };
      sop_checklists: {
        Row: SOPChecklistRow;
        Insert: Partial<SOPChecklistRow> & { name: string };
        Update: Partial<SOPChecklistRow>;
        Relationships: [
          {
            foreignKeyName: 'sop_checklists_service_package_id_fkey';
            columns: ['service_package_id'];
            isOneToOne: false;
            referencedRelation: 'service_packages';
            referencedColumns: ['id'];
          }
        ];
      };
      bookings: {
        Row: BookingRow;
        Insert: Partial<BookingRow> & { customer_id: string; vehicle_id: number; time_slot: string };
        Update: Partial<BookingRow>;
        Relationships: [
          {
            foreignKeyName: 'bookings_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'customer_vehicles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'bookings_service_package_id_fkey';
            columns: ['service_package_id'];
            isOneToOne: false;
            referencedRelation: 'service_packages';
            referencedColumns: ['id'];
          }
        ];
      };
      job_inspections: {
        Row: JobInspectionRow;
        Insert: Partial<JobInspectionRow> & { booking_id: number };
        Update: Partial<JobInspectionRow>;
        Relationships: [
          {
            foreignKeyName: 'job_inspections_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      reviews: {
        Row: ReviewRow;
        Insert: Partial<ReviewRow> & { customer_id: string; booking_id: number; rating: number };
        Update: Partial<ReviewRow>;
        Relationships: [
          {
            foreignKeyName: 'reviews_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reviews_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      revenue_categories: {
        Row: RevenueCategoryRow;
        Insert: Partial<RevenueCategoryRow> & { name: string };
        Update: Partial<RevenueCategoryRow>;
        Relationships: [];
      };
      expense_categories: {
        Row: ExpenseCategoryRow;
        Insert: Partial<ExpenseCategoryRow> & { name: string };
        Update: Partial<ExpenseCategoryRow>;
        Relationships: [];
      };
      general_expenses: {
        Row: GeneralExpenseRow;
        Insert: Partial<GeneralExpenseRow> & { amount: number };
        Update: Partial<GeneralExpenseRow>;
        Relationships: [
          {
            foreignKeyName: 'general_expenses_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'expense_categories';
            referencedColumns: ['id'];
          }
        ];
      };
      salary_payments: {
        Row: SalaryPaymentRow;
        Insert: Partial<SalaryPaymentRow> & { staff_id: string; period_start: string; period_end: string; paid_amount: number };
        Update: Partial<SalaryPaymentRow>;
        Relationships: [];
      };
      chemical_inventory: {
        Row: ChemicalInventoryRow;
        Insert: Partial<ChemicalInventoryRow> & { name: string; current_volume: number; cost_per_unit: number };
        Update: Partial<ChemicalInventoryRow>;
        Relationships: [];
      };
      chemical_usage_logs: {
        Row: ChemicalUsageLogRow;
        Insert: Partial<ChemicalUsageLogRow> & { inventory_item_id: number; amount_used: number };
        Update: Partial<ChemicalUsageLogRow>;
        Relationships: [
          {
            foreignKeyName: 'chemical_usage_logs_inventory_item_id_fkey';
            columns: ['inventory_item_id'];
            isOneToOne: false;
            referencedRelation: 'chemical_inventory';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chemical_usage_logs_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      payroll_entries: {
        Row: PayrollEntryRow;
        Insert: Partial<PayrollEntryRow> & { staff_user_id: string; date: string };
        Update: Partial<PayrollEntryRow>;
        Relationships: [];
      };
      deferred_revenue: {
        Row: DeferredRevenueRow;
        Insert: Partial<DeferredRevenueRow> & { customer_id: string; total_amount: number; remaining_balance: number; start_date: string; end_date: string; daily_amortization_rate: number };
        Update: Partial<DeferredRevenueRow>;
        Relationships: [
          {
            foreignKeyName: 'deferred_revenue_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          }
        ];
      };
      invoices: {
        Row: InvoiceRow;
        Insert: Partial<InvoiceRow> & { amount: number };
        Update: Partial<InvoiceRow>;
        Relationships: [
          {
            foreignKeyName: 'invoices_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: true;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'member_subscriptions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_revenue_category_id_fkey';
            columns: ['revenue_category_id'];
            isOneToOne: false;
            referencedRelation: 'revenue_categories';
            referencedColumns: ['id'];
          }
        ];
      };
      staff_advances: {
        Row: StaffAdvanceRow;
        Insert: Partial<StaffAdvanceRow> & { staff_id: string; amount: number; purpose: string };
        Update: Partial<StaffAdvanceRow>;
        Relationships: [];
      };
      staff_cash_handovers: {
        Row: StaffCashHandoverRow;
        Insert: Partial<StaffCashHandoverRow> & { staff_id: string; amount: number };
        Update: Partial<StaffCashHandoverRow>;
        Relationships: [];
      };
      khata_ledgers: {
        Row: KhataLedgerRow;
        Insert: Partial<KhataLedgerRow> & { customer_id: string; amount: number; transaction_type: KhataTransactionType; description: string };
        Update: Partial<KhataLedgerRow>;
        Relationships: [
          {
            foreignKeyName: 'khata_ledgers_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'khata_ledgers_related_booking_id_fkey';
            columns: ['related_booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      khata_ledger: {
        Row: KhataLedgerRow;
        Insert: Partial<KhataLedgerRow> & { customer_id: string; amount: number; transaction_type: KhataTransactionType; description: string };
        Update: Partial<KhataLedgerRow>;
        Relationships: [];
      };
      daily_register_audits: {
        Row: DailyRegisterAuditRow;
        Insert: Partial<DailyRegisterAuditRow> & { gross_revenue: number; expected_cash_in_till: number; total_expenses: number };
        Update: Partial<DailyRegisterAuditRow>;
        Relationships: [];
      };
      collection_banks: {
        Row: CollectionBankRow;
        Insert: Partial<CollectionBankRow> & { amount: number };
        Update: Partial<CollectionBankRow>;
        Relationships: [];
      };
      bank_transactions: {
        Row: BankTransactionRow;
        Insert: Partial<BankTransactionRow> & { amount: number; transaction_type: BankTransactionType };
        Update: Partial<BankTransactionRow>;
        Relationships: [];
      };
      notification_logs: {
        Row: NotificationLogRow;
        Insert: Partial<NotificationLogRow> & { recipient: string; message: string };
        Update: Partial<NotificationLogRow>;
        Relationships: [
          {
            foreignKeyName: 'notification_logs_booking_id_fkey';
            columns: ['booking_id'];
            isOneToOne: false;
            referencedRelation: 'bookings';
            referencedColumns: ['id'];
          }
        ];
      };
      payment_transactions: {
        Row: PaymentTransactionRow;
        Insert: Partial<PaymentTransactionRow> & { invoice_id: number; stripe_payment_intent_id: string; amount: number };
        Update: Partial<PaymentTransactionRow>;
        Relationships: [
          {
            foreignKeyName: 'payment_transactions_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          }
        ];
      };
      fleet_vehicles: {
        Row: FleetVehicleRow;
        Insert: Partial<FleetVehicleRow> & { owner_id: string; model: string; plate_number: string };
        Update: Partial<FleetVehicleRow>;
        Relationships: [
          {
            foreignKeyName: 'fleet_vehicles_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          }
        ];
      };
      fleet_accounts: {
        Row: FleetAccountRow;
        Insert: Partial<FleetAccountRow> & { company_name: string; contact_person: string; email: string; phone: string };
        Update: Partial<FleetAccountRow>;
        Relationships: [];
      };
      fleet_account_vehicles: {
        Row: FleetAccountVehicleRow;
        Insert: FleetAccountVehicleRow;
        Update: Partial<FleetAccountVehicleRow>;
        Relationships: [
          {
            foreignKeyName: 'fleet_account_vehicles_fleet_account_id_fkey';
            columns: ['fleet_account_id'];
            isOneToOne: false;
            referencedRelation: 'fleet_accounts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'fleet_account_vehicles_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'fleet_vehicles';
            referencedColumns: ['id'];
          }
        ];
      };
      service_vehicles: {
        Row: ServiceVehicleRow;
        Insert: Partial<ServiceVehicleRow> & { make: string; model: string; plate_number: string };
        Update: Partial<ServiceVehicleRow>;
        Relationships: [];
      };
      vehicle_assignments: {
        Row: VehicleAssignmentRow;
        Insert: Partial<VehicleAssignmentRow> & { vehicle_id: number; technician_id: string };
        Update: Partial<VehicleAssignmentRow>;
        Relationships: [
          {
            foreignKeyName: 'vehicle_assignments_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'service_vehicles';
            referencedColumns: ['id'];
          }
        ];
      };
      fleet_logs: {
        Row: FleetLogRow;
        Insert: Partial<FleetLogRow> & { vehicle_id: number; log_type: FleetLogType; amount: number; odometer: number };
        Update: Partial<FleetLogRow>;
        Relationships: [
          {
            foreignKeyName: 'fleet_logs_vehicle_id_fkey';
            columns: ['vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'service_vehicles';
            referencedColumns: ['id'];
          }
        ];
      };
      technician_locations: {
        Row: TechnicianLocationRow;
        Insert: TechnicianLocationRow;
        Update: Partial<TechnicianLocationRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
