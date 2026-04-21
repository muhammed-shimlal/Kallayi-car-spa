export interface ServicePackage {
    id: number;
    name: string;
    description?: string;
    price: number | string;
    duration_minutes?: number | string;
}

export interface StaffMember {
    id: number;
    user_id: number;
    first_name: string;
    username: string;
    phone_number?: string;
    role: string;
    base_salary: number | string;
    commission_rate?: number | string;
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
    created_at?: string;
}

export interface PayrollWorker {
    id: number;
    name?: string;
    first_name?: string;
    username?: string;
    role: string;
    jobs_completed?: number;
    base_salary?: number | string;
    commission_earned?: number | string;
    advances?: number | string;
    final_payout: number;
    status?: string;
    user_id?: number;
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
    technician_id?: number | null;
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
    general_expenses_today: number;
    labor_cost_today: number;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    date?: string;
}

export interface ExpenseCategory {
    id: number;
    name: string;
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
