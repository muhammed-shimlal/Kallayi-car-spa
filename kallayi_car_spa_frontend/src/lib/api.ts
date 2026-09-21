/**
 * KALLAYI CAR SPA & AUTO CARE - API CLIENT & REPOSITORY
 * Next.js 16 Relative API Client with typed route helpers.
 */

import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { BookingRow, InvoiceRow, BookingStatus } from '@/types/database';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return '/api';
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  }
  return 'http://127.0.0.1:3000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach dynamic auth token & baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    let token = Cookies.get('auth_token');
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('auth_token') || undefined;
    }
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth redirects
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        Cookies.remove('auth_token');
        localStorage.removeItem('auth_token');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Extracts human-readable error messages from API responses or exceptions.
 */
export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      if ('error' in data && typeof data.error === 'string') return data.error;
      if ('message' in data && typeof data.message === 'string') return data.message;
      if ('detail' in data && typeof data.detail === 'string') return data.detail;
    }
    return error.message || 'API request failed';
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ==============================================================================
// TYPED API REPOSITORY HELPERS
// ==============================================================================

export interface FetchBookingsParams {
  status?: string;
  date?: string;
  technician_id?: string;
  limit?: number;
}

/**
 * Fetches bookings queue from /api/bookings
 */
export async function fetchBookings(params?: FetchBookingsParams): Promise<BookingRow[]> {
  try {
    const res = await api.get('/bookings', { params });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[fetchBookings] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Updates booking status & bay assignment via PATCH /api/bookings/[id]
 */
export async function updateBookingStatus(
  bookingId: number,
  payload: {
    status?: BookingStatus | string;
    bay_assignment?: string | null;
    technician_id?: string | null;
    final_price?: number;
    start_time?: string;
    end_time?: string;
  }
): Promise<BookingRow> {
  try {
    const res = await api.patch(`/bookings/${bookingId}`, payload);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return res.data;
  } catch (err) {
    console.error(`[updateBookingStatus] Error for #${bookingId}:`, err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface POSCheckoutPayload {
  booking_id: number;
  split_cash?: number;
  split_online?: number;
  split_khata?: number;
  payment_method?: 'CASH' | 'CARD' | 'ONLINE' | 'SPLIT';
  base_price?: number;
  final_price?: number;
  discount_amount?: number;
  revenue_category_id?: number;
}

export interface POSCheckoutResponse {
  success: boolean;
  message?: string;
  data?: {
    invoice: InvoiceRow;
    booking_id: number;
    amount: number;
    split_summary: {
      cash: number;
      online: number;
      khata: number;
    };
  };
  error?: string;
}

/**
 * Submits POS split checkout via POST /api/pos/checkout
 */
export async function checkoutPOS(payload: POSCheckoutPayload): Promise<POSCheckoutResponse> {
  try {
    const res = await api.post<POSCheckoutResponse>('/pos/checkout', payload);
    return res.data;
  } catch (err) {
    console.error('[checkoutPOS] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches structured invoice and booking relations via GET /api/invoices/[id]
 */
export async function fetchInvoice(id: string | number) {
  try {
    const res = await api.get(`/invoices/${id}`);
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return res.data;
  } catch (err) {
    console.error(`[fetchInvoice] Error for #${id}:`, err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface FetchExpensesParams {
  date?: string;
  start_date?: string;
  end_date?: string;
  expense_type?: 'BUSINESS' | 'STAFF';
  category_id?: number;
  status?: string;
  limit?: number;
}

/**
 * Fetches general expenses via GET /api/finance/expenses
 */
export async function fetchExpenses(params?: FetchExpensesParams) {
  try {
    const res = await api.get('/finance/expenses', { params });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[fetchExpenses] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface CreateExpensePayload {
  category_id?: number | null;
  category_name?: string;
  expense_type?: 'BUSINESS' | 'STAFF';
  transaction_type?: 'ADVANCE' | 'DEDUCTION' | 'BONUS' | 'REIMBURSEMENT' | 'INCENTIVE' | null;
  payment_method?: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE';
  staff_id?: string | null;
  amount: number;
  description: string;
  notes?: string;
  date?: string;
  status?: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  receipt_image?: string | null;
}

/**
 * Records an expense via POST /api/finance/expenses
 */
export async function createExpense(payload: CreateExpensePayload) {
  try {
    const res = await api.post('/finance/expenses', payload);
    return res.data;
  } catch (err) {
    console.error('[createExpense] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches daily register audit summary via GET /api/finance/daily-audit
 */
export async function fetchDailyAudit(date?: string) {
  try {
    const res = await api.get('/finance/daily-audit', { params: { date } });
    if (res.data?.success && res.data.data) {
      return res.data.data;
    }
    return res.data;
  } catch (err) {
    console.error('[fetchDailyAudit] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface LockDailyAuditPayload {
  date?: string;
  closed_by_id?: string;
  gross_revenue?: number;
  expected_cash_in_till?: number;
  total_expenses?: number;
}

/**
 * Locks and closes daily register audit via POST /api/finance/daily-audit
 */
export async function lockDailyAudit(payload: LockDailyAuditPayload) {
  try {
    const res = await api.post('/finance/daily-audit', payload);
    return res.data;
  } catch (err) {
    console.error('[lockDailyAudit] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches global completed wash history and daily CRM stats
 */
export async function fetchGlobalWashHistory(date?: string) {
  try {
    const res = await api.get('/bookings/global-history', { params: { date } });
    return res.data;
  } catch (err) {
    console.error('[fetchGlobalWashHistory] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Looks up vehicle & customer service dossier by plate or phone query
 */
export async function lookupVehicleDossier(query: string) {
  try {
    const res = await api.get('/bookings/vehicle-history', { params: { q: query } });
    return res.data;
  } catch (err) {
    console.error('[lookupVehicleDossier] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface BankDepositPayload {
  amount: number;
  date?: string;
  notes?: string;
}

/**
 * Fetches all bank deposit and savings records
 */
export async function fetchBankDeposits() {
  try {
    const res = await api.get('/finance/bank-deposits');
    return res.data;
  } catch (err) {
    console.error('[fetchBankDeposits] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Records a daily bank deposit savings entry
 */
export async function saveBankDeposit(payload: BankDepositPayload) {
  try {
    const res = await api.post('/finance/bank-deposits', payload);
    return res.data;
  } catch (err) {
    console.error('[saveBankDeposit] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches active Khata accounts and recent ledgers
 */
export async function fetchKhataCustomers(all?: boolean) {
  try {
    const res = await api.get('/finance/khata', { params: { all: all ? 'true' : 'false' } });
    return res.data;
  } catch (err) {
    console.error('[fetchKhataCustomers] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface KhataChargePayload {
  customer_id: string;
  amount: number;
  description?: string;
  related_booking_id?: number | null;
  number_plate_image?: string | null;
}

/**
 * Records a manual Khata charge
 */
export async function createKhataCharge(payload: KhataChargePayload) {
  try {
    const res = await api.post('/finance/khata', payload);
    return res.data;
  } catch (err) {
    console.error('[createKhataCharge] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

export interface SettleKhataPayload {
  customer_id: string;
  amount_paid: number;
  description?: string;
  payment_method?: string;
}

/**
 * Settles outstanding Khata credit balance and dispatches WhatsApp confirmation
 */
export async function settleKhata(payload: SettleKhataPayload) {
  try {
    const res = await api.post('/finance/khata/settle', payload);
    return res.data;
  } catch (err) {
    console.error('[settleKhata] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Sends polite WhatsApp payment reminder to customer with outstanding balance
 */
export async function sendKhataReminder(customerId: string) {
  try {
    const res = await api.post('/finance/khata/remind', { customer_id: customerId });
    return res.data;
  } catch (err) {
    console.error('[sendKhataReminder] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches dynamic service packages with optional vehicle_type tier resolution
 */
export async function fetchServicePackages(vehicleType?: string) {
  try {
    const res = await api.get('/services', {
      params: vehicleType ? { vehicle_type: vehicleType } : undefined,
    });
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[fetchServicePackages] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches user's customer vehicles via GET /api/customer-vehicles
 */
export async function fetchCustomerVehicles() {
  try {
    const res = await api.get('/customer-vehicles');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[fetchCustomerVehicles] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches active subscription plans via GET /api/subscriptions
 */
export async function fetchSubscriptionPlans() {
  try {
    const res = await api.get('/subscriptions');
    if (res.data?.success && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error('[fetchSubscriptionPlans] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Creates a subscription plan via POST /api/subscriptions
 */
export async function createSubscriptionPlan(payload: {
  name: string;
  price: number;
  interval_days?: number;
  description?: string;
}) {
  try {
    const res = await api.post('/subscriptions', payload);
    return res.data;
  } catch (err) {
    console.error('[createSubscriptionPlan] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Updates a subscription plan via PATCH /api/subscriptions/[id]
 */
export async function updateSubscriptionPlan(
  id: number,
  payload: {
    name?: string;
    price?: number;
    interval_days?: number;
    description?: string;
  }
) {
  try {
    const res = await api.patch(`/subscriptions/${id}`, payload);
    return res.data;
  } catch (err) {
    console.error(`[updateSubscriptionPlan] Error for #${id}:`, err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Deletes a subscription plan via DELETE /api/subscriptions/[id]
 */
export async function deleteSubscriptionPlan(id: number) {
  try {
    const res = await api.delete(`/subscriptions/${id}`);
    return res.data;
  } catch (err) {
    console.error(`[deleteSubscriptionPlan] Error for #${id}:`, err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Fetches revenue and expense categories via GET /api/finance/categories
 */
export async function fetchCategories() {
  try {
    const res = await api.get('/finance/categories');
    return res.data;
  } catch (err) {
    console.error('[fetchCategories] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Creates a category via POST /api/finance/categories
 */
export async function createCategory(payload: {
  type: 'revenue' | 'expense';
  name: string;
  description?: string;
}) {
  try {
    const res = await api.post('/finance/categories', payload);
    return res.data;
  } catch (err) {
    console.error('[createCategory] Error:', err);
    throw new Error(extractErrorMessage(err));
  }
}

/**
 * Deletes a category via DELETE /api/finance/categories/[id]
 */
export async function deleteCategory(id: number, type: 'revenue' | 'expense') {
  try {
    const res = await api.delete(`/finance/categories/${id}`, {
      params: { type },
    });
    return res.data;
  } catch (err) {
    console.error(`[deleteCategory] Error for #${id}:`, err);
    throw new Error(extractErrorMessage(err));
  }
}

export default api;


