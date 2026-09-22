export interface ServicePackagePrice {
    id?: number;
    package_id?: number;
    vehicle_type: string;
    price: number | string;
}

export interface ServicePackage {
    id: number;
    name: string;
    description?: string;
    price: number | string;
    base_price?: number | string;
    final_price?: number | string;
    duration_minutes?: number | string;
    vehicle_type?: string;
    tiered_prices?: ServicePackagePrice[];
    service_package_prices?: ServicePackagePrice[];
    tier_prices?: Record<string, number | string>;
    is_applicable?: boolean;
    created_at?: string;
}

export interface StaffMember {
    id: string | number;
    user_id: string | number;
    first_name: string;
    name?: string;
    username?: string;
    phone_number?: string;
    phone?: string;
    role: string;
    salary_type?: string;
    salary_amount?: number | string;
    base_salary: number | string;
    commission_rate?: number | string;
    commission_percentage?: number | string;
    retained_balance?: number | string;
    wash_revenue_today?: number | string;
    unsettled_advances?: number | string;
    advances?: number | string;
    collected_cash_holding?: number | string;
    cash_in_hand?: number | string;
    due_amount?: number | string;
    pending_balance?: number | string;
    is_active?: boolean;
}

export interface KhataCustomer {
    id: number;
    name: string;
    phone_number: string;
    credit_limit: number | string;
    outstanding_balance?: number | string;
    amount?: number | string; // from customerCredits
}

export interface KhataLedgerEntry {
    id: number;
    date: string;
    description: string;
    transaction_type: string;
    amount: number | string;
    plate_number?: string;
    number_plate_image?: string | null;
    created_at?: string;
}

export interface PayrollWorker {
    id: string | number;
    name?: string;
    first_name?: string;
    username?: string;
    role: string;
    jobs_completed?: number;
    tips?: number | string;
    tips_earned?: number | string;
    commission?: number | string;
    commission_rate?: number | string;
    commission_percentage?: number | string;
    wash_revenue?: number | string;
    wash_revenue_today?: number | string;
    base_salary?: number | string;
    base_wage?: number | string;
    commission_earned?: number | string;
    gross_earnings?: number | string;
    gross_earned?: number | string;
    advances?: number | string;
    unsettled_advances?: number | string;
    retained_balance?: number | string;
    previous_retained_balance?: number | string;
    total_payable_due?: number | string;
    net_payable?: number | string;
    final_payout?: number | string;
    amount_paid?: number | string;
    balance_retained?: number | string;
    pending_balance?: number | string;
    due_amount?: number | string;
    cash_in_hand?: number | string;
    collected_cash_holding?: number | string;
    amount?: number | string;
    status?: string;
    is_settled?: boolean;
    user_id?: string | number;
    profile_id?: string | number;
    staff_id?: string | number;
    payroll_id?: string | number | null;
}

export interface RecentBooking {
    id: number;
    status: string;
    plate_number?: string;
    vehicle_model?: string;
    service_name?: string;
    customer_name?: string;
    customer_id?: number | null;
    price?: number | string;
    technician_name?: string | null;
    technician_id?: string | number | null;
    created_at?: string | null;
    time_slot?: string | null;
    bay_assignment?: string | null;
    vehicle_info?: string;
    service_package_details?: string;
}

export interface QueueBooking extends RecentBooking {}

export interface Invoice {
    id: number;
    booking_id?: number;
    invoice_number?: string;
    amount?: number | string;
    created_at?: string;
    status?: string;
}

export interface KpiSummary {
    net_profit_today: number;
    revenue_today: number;
    today_revenue?: number;
    pre_booking_revenue?: number;
    today_total_credit?: number;
    today_credit_asset?: number;
    today_collection_bank?: number;
    bank_today?: number;
    chemical_cost_today?: number;
    general_expenses_today: number;
    general_expense_today?: number;
    labor_cost_today: number;
    today_washed_count?: number;
    washed_today?: number;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    date?: string;
}

export interface ExpenseCategory {
    id: number | string;
    name: string;
    description?: string;
}

export interface Expense {
    id: number;
    category: number | ExpenseCategory | string;
    amount: number | string;
    date: string;
    description: string;
    receipt_image?: string | null;
    is_approved?: boolean;
}

export interface EodData {
    total_sales?: number;
    total_cash?: number;
    total_upi?: number;
    // other EOD fields
}

export interface AnalyticsData {
    busiest_hours: unknown[];
    packages: unknown[];
    top_staff: unknown[];
}

export interface GenericData {
    [key: string]: unknown;
}

export interface UnifiedSearchResult {
    vehicle_id?: number | string;
    plate_number: string;
    make: string;
    model: string;
    vehicle_type?: string;
    color?: string;
    customer_id?: string;
    customer_name: string;
    phone_number: string;
    user_id?: string | null;
    outstanding_balance?: number;
    loyalty_points?: number;
}

