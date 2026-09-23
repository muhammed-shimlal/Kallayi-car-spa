'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
    LayoutDashboard, Users, Car, Wallet, LogOut,
    TrendingUp, Activity, Receipt, ChevronRight, Download,
    CreditCard, FileText, FlaskConical, CheckCircle, PlusCircle,
    Clock, AlertCircle, Check, BadgeDollarSign, UserCog, Lock,
    AlertTriangle, IndianRupee, Landmark, BookOpen, BarChart2, Trophy,
    Search, MapPin, Star, Calendar, Wrench, Trash2, Pencil, UserPlus, UserMinus,
    Upload, Tag, Image as ImageIcon, X
} from 'lucide-react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

import { getApiBaseUrl } from '@/lib/api';
import { handleSignOut } from '@/lib/authClient';

const getApiBase = (): string => getApiBaseUrl();
const API_BASE: string = getApiBaseUrl();


import {
    ServicePackage, StaffMember, KhataCustomer, KhataLedgerEntry,
    PayrollWorker, RecentBooking, Invoice, KpiSummary, ChartDataPoint,
    Expense, ExpenseCategory, EodData, AnalyticsData, GenericData
} from '@/types/admin';

import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
type ReactNode = React.ReactNode;

const DashboardContext = createContext<any>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // --- Navigation State (URL-synced Single Source of Truth) ---
    const [activeTab, setActiveTabState] = useState('overview');
    const [financeSubTab, setFinanceSubTabState] = useState('overview');
    const [adminName, setAdminName] = useState('Loading...');

    const setActiveTab = useCallback((tab: string, subTab?: string) => {
        const targetTab = tab === 'settings' ? 'overview' : tab;
        setActiveTabState(targetTab);
        if (subTab) {
            setFinanceSubTabState(subTab);
        }
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', targetTab);
            if (subTab) {
                url.searchParams.set('subtab', subTab);
            } else {
                url.searchParams.delete('subtab');
            }
            window.history.pushState({}, '', url.toString());
        }
    }, []);

    const setFinanceSubTab = useCallback((subTab: string) => {
        setFinanceSubTabState(subTab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('subtab', subTab);
            window.history.pushState({}, '', url.toString());
        }
    }, []);

    useEffect(() => {
        const syncFromUrl = () => {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                const tab = urlParams.get('tab');
                const subtab = urlParams.get('subtab');
                if (tab === 'settings') {
                    setActiveTabState('overview');
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', 'overview');
                    window.history.replaceState({}, '', url.toString());
                } else if (tab) {
                    setActiveTabState(tab);
                }
                if (subtab) setFinanceSubTabState(subtab);
            }
        };
        syncFromUrl();
        window.addEventListener('popstate', syncFromUrl);
        return () => window.removeEventListener('popstate', syncFromUrl);
    }, []);

    // --- Data States ---
    
    const queryClient = useQueryClient();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const fetchHeaders = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };

    // Real-time synchronization across Live Queue, POS, and Khata tabs
    useEffect(() => {
        const handleSync = () => {
            queryClient.invalidateQueries({ queryKey: ['khataCustomers'] });
            queryClient.invalidateQueries({ queryKey: ['khataRecentLedgers'] });
            queryClient.invalidateQueries({ queryKey: ['customerCredits'] });
            queryClient.invalidateQueries({ queryKey: ['kpiData'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
            queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
            queryClient.invalidateQueries({ queryKey: ['todayWashedVehicles'] });
            queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
        };
        window.addEventListener('booking:completed', handleSync);
        window.addEventListener('queue:updated', handleSync);
        window.addEventListener('khata:updated', handleSync);
        window.addEventListener('bank:updated', handleSync);
        return () => {
            window.removeEventListener('booking:completed', handleSync);
            window.removeEventListener('queue:updated', handleSync);
            window.removeEventListener('khata:updated', handleSync);
            window.removeEventListener('bank:updated', handleSync);
        };
    }, [queryClient]);

    // --- React Query Fetchers ---
    const userQuery = useQuery({
        queryKey: ['userMe'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/auth/me`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setAdminName(data.first_name || data.username || 'Admin');
            return data;
        },
        enabled: true
    });

    const overviewQuery = useQuery({
        queryKey: ['dashboardOverview'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard/overview`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch dashboard overview');
            return res.json();
        },
        refetchInterval: 10000
    });

    const kpiQuery = useQuery<KpiSummary>({
        queryKey: ['kpiData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard/overview`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch KPI');
            const data = await res.json();
            return data.kpiData;
        },
        refetchInterval: 10000,
        enabled: true
    });

    const chartQuery = useQuery({
        queryKey: ['chartData', overviewQuery.data],
        queryFn: async () => {
            if (overviewQuery.data?.chartData) {
                return overviewQuery.data.chartData;
            }
            const res = await fetch(`${API_BASE}/dashboard/overview`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch chart data');
            const data = await res.json();
            return data.chartData || [];
        },
        enabled: true
    });

    const bookingsQuery = useQuery<RecentBooking[]>({
        queryKey: ['recentBookings', overviewQuery.data],
        queryFn: async () => {
            if (overviewQuery.data?.recentBookings) {
                return overviewQuery.data.recentBookings;
            }
            const res = await fetch(`${API_BASE}/bookings`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const b = await res.json();
            return Array.isArray(b) ? b : (Array.isArray(b.results) ? b.results : (b.data || []));
        },
        enabled: true
    });

    const todayWashedQuery = useQuery({
        queryKey: ['todayWashedVehicles', overviewQuery.data],
        queryFn: async () => {
            if (overviewQuery.data?.todayWashedVehicles) {
                const list = overviewQuery.data.todayWashedVehicles;
                return { count: list.length, today_washed_count: list.length, results: list };
            }
            const res = await fetch(`${API_BASE}/dashboard/overview`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch today washed vehicles');
            const data = await res.json();
            const list = data.todayWashedVehicles || [];
            return { count: list.length, today_washed_count: list.length, results: list };
        },
        enabled: true,
        refetchInterval: 10000
    });

    const expensesQuery = useQuery<Expense[]>({
        queryKey: ['expenses'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/expenses`, { 
                headers: fetchHeaders 
            });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.data)) return data.data;
            if (data && Array.isArray(data.results)) return data.results;
            return [];
        },
        enabled: true
    });

    const DEFAULT_EXPENSE_CATEGORIES_FALLBACK: ExpenseCategory[] = [
        { id: 1, name: '🧴 Wash Chemicals', description: 'Shampoo, Foam, Wax, Polish, Degreaser, Tire Shine' },
        { id: 2, name: '👥 Salaries & Commission', description: 'Staff Wages, Daily Helper, Staff Advance' },
        { id: 3, name: '⚡ Electricity & Water', description: 'Electricity Bill, Water Tankers, KSEB' },
        { id: 4, name: '🏢 Rent & Maintenance', description: 'Shop Rent, Lease, Property Upkeep' },
        { id: 5, name: '🔧 Machinery & Tools', description: 'Pressure Washer Parts, Vacuum Repairs, Compressor Oil, Pipe/Nozzle replacement' },
        { id: 6, name: '🧽 Consumables', description: 'Microfiber Cloths, Brushes, Gloves, Spray Bottles' },
        { id: 7, name: '☕ Tea & Refreshments', description: 'Staff Tea/Snacks, Customer Refreshments' },
        { id: 8, name: '📢 Marketing & Promo', description: 'Board, Banners, Social Media Ads' },
        { id: 9, name: '➕ Other', description: 'Manual custom category' },
    ];

    const expenseCategoriesQuery = useQuery<ExpenseCategory[]>({
        queryKey: ['expenseCategories'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/expense-categories`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.data || []);
            return list.length > 0 ? list : DEFAULT_EXPENSE_CATEGORIES_FALLBACK;
        },
        placeholderData: DEFAULT_EXPENSE_CATEGORIES_FALLBACK,
        enabled: true
    });

    const khataQuery = useQuery<KhataCustomer[]>({
        queryKey: ['khataCustomers'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/khata`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const customerList = Array.isArray(data) ? data : (data.customers || data.results || []);
            return customerList.filter((c: KhataCustomer) => Number(c.outstanding_balance || 0) > 0);
        },
        enabled: true
    });

    const customerCreditsQuery = useQuery<KhataCustomer[]>({
        queryKey: ['customerCredits'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/khata`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return Array.isArray(data) ? data : (data.customers || data.results || []);
        },
        enabled: true
    });

    const khataRecentLedgersQuery = useQuery<any[]>({
        queryKey: ['khataRecentLedgers'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/khata/ledgers`, { headers: fetchHeaders });
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data) ? data : (data.ledgers || data.results || data.data || []);
        },
        enabled: true
    });

    const payrollQuery = useQuery<PayrollWorker[]>({
        queryKey: ['payrollData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/staff/daily-settlement`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: true
    });

    const servicesQuery = useQuery<ServicePackage[]>({
        queryKey: ['services'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/bookings/services`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (data?.results || []));
        },
        enabled: true
    });

    const [staffStatusFilter, setStaffStatusFilter] = useState<'all' | 'active' | 'terminated'>('active');
    const [staffSearchQuery, setStaffSearchQuery] = useState('');

    const staffQuery = useQuery<any[]>({
        queryKey: ['staff', staffStatusFilter, staffSearchQuery],
        queryFn: async () => {
            let url = `${API_BASE}/staff/directory`;
            const params = new URLSearchParams();
            if (staffStatusFilter === 'active') params.append('is_active', 'true');
            if (staffStatusFilter === 'terminated') params.append('is_active', 'false');
            if (staffSearchQuery) params.append('search', staffSearchQuery);
            if (params.toString()) url += `?${params.toString()}`;
            const res = await fetch(url, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        },
        enabled: true
    });

    const eodQuery = useQuery<EodData>({
        queryKey: ['eodData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/eod`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch EOD data');
            const data = await res.json();
            return data.data || data;
        },
        refetchInterval: 15000,
        enabled: true
    });

    const analyticsQuery = useQuery<AnalyticsData>({
        queryKey: ['analyticsData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/analytics`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: true
    });

    const bankQuery = useQuery({
        queryKey: ['bankTransactions'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/bank`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch bank data');
            return res.json();
        },
        refetchInterval: 12000,
        enabled: true
    });

    const staffHandoversQuery = useQuery({
        queryKey: ['staffHandovers'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/staff/cash-handover`, { headers: fetchHeaders });
            if (!res.ok) return { total_handed_over: 0, handovers: [] };
            return res.json();
        },
        enabled: true
    });

    const isGlobalLoading = !isMounted || userQuery.isLoading;

    const kpiData: KpiSummary = kpiQuery.data || {
        net_profit_today: 0,
        revenue_today: 0,
        today_revenue: 0,
        pre_booking_revenue: 0,
        today_total_credit: 0,
        today_credit_asset: 0,
        today_collection_bank: 0,
        bank_today: 0,
        chemical_cost_today: 0,
        general_expenses_today: 0,
        general_expense_today: 0,
        labor_cost_today: 0,
        today_washed_count: 0,
        washed_today: 0,
    };
    const chartData = chartQuery.data || generateDemoChartData();
    const recentBookings = bookingsQuery.data || [];
    const todayWashedRaw = todayWashedQuery.data || { count: 0, today_washed_count: 0, results: [] };
    const todayWashedVehicles = Array.isArray(todayWashedRaw) ? todayWashedRaw : (todayWashedRaw.results || []);
    const todayWashedCount = todayWashedRaw.today_washed_count ?? todayWashedRaw.count ?? ((kpiData as any).today_washed_count || todayWashedVehicles.length);
    const rawExpenses = expensesQuery.data || [];
    const expenses = Array.isArray(rawExpenses) ? rawExpenses : ((rawExpenses as any)?.results || (rawExpenses as any)?.data || []);
    const expenseCategories = expenseCategoriesQuery.data || [];
    const khataCustomers = khataQuery.data || [];
    const customerCredits = customerCreditsQuery.data || [];
    const khataRecentLedgers = khataRecentLedgersQuery.data || [];
    const payrollData = payrollQuery.data || [];
    const services = servicesQuery.data || [];
    const staffDirectory = staffQuery.data || [];
    const eodData = eodQuery.data || null;
    const analyticsData = analyticsQuery.data || { busiest_hours: [], packages: [], top_staff: [] };

    const rawBankData = bankQuery.data || {};
    const bankSummary = rawBankData.summary || {
        current_balance: rawBankData.current_balance || 0,
        net_balance: rawBankData.current_balance || 0,
        total_deposited: rawBankData.total_deposited || 0,
        total_withdrawn: rawBankData.total_withdrawn || 0,
        today_deposited: 0,
        today_withdrawn: 0,
        transaction_count: 0
    };
    const bankTransactions = Array.isArray(rawBankData.transactions) 
        ? rawBankData.transactions 
        : (Array.isArray(rawBankData.data) ? rawBankData.data : (Array.isArray(rawBankData.history) ? rawBankData.history : []));


    function generateDemoChartData() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({ name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: 0 });
        }
        return days;
    }
// isSubmittingExpense in export is now mapped directly to expenseMutation.isPending
    const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', custom_category: '' });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
            const [khataLedger, setKhataLedger] = useState<KhataLedgerEntry[]>([]);
    const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<KhataCustomer | null>(null);
    const [isKhataModalOpen, setIsKhataModalOpen] = useState(false);
    const [isKhataCustomerModalOpen, setIsKhataCustomerModalOpen] = useState(false);
    const [editingKhataCustomer, setEditingKhataCustomer] = useState<KhataCustomer | null>(null);
    const [khataCustomerForm, setKhataCustomerForm] = useState({ name: '', phone_number: '', credit_limit: '' });
    const [isKhataLedgerModalOpen, setIsKhataLedgerModalOpen] = useState(false);
    const [khataPaymentAmount, setKhataPaymentAmount] = useState<string>('');
    
    // --- Manual Khata Charge State ---
    const [isManualKhataOpen, setIsManualKhataOpen] = useState(false);
    const [manualKhataForm, setManualKhataForm] = useState({ phone: '', name: '', amount: '', description: '' });

    // --- Bank Management State ---
    const [isBankDepositModalOpen, setIsBankDepositModalOpen] = useState(false);
    const [isBankWithdrawModalOpen, setIsBankWithdrawModalOpen] = useState(false);

    // --- EOD Closeout & Daily Audit Modal State ---
    const [isEODModalOpen, setIsEODModalOpen] = useState(false);

    // --- Service Menu State ---
        const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServicePackage | null>(null);
    const [serviceForm, setServiceForm] = useState({ 
        name: '', 
        description: '', 
        price: '', 
        duration_minutes: '45',
        tiered_prices: {
            HATCHBACK: '',
            SEDAN: '',
            COMPACT_SUV: '',
            SUV: '',
            MUV: '',
            VAN: '',
            LUXURY: '',
            BIKE: '',
            AUTO: '',
            TRUCK: '',
        } as Record<string, string>
    });

    // --- Staff Directory State ---
        const [staffSubTab, setStaffSubTab] = useState('payroll');
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [staffForm, setStaffForm] = useState({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ staff_id: '', amount: '', description: '' });
    const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
    const [handoverForm, setHandoverForm] = useState({ staff_id: '', amount: '', notes: '' });

        
    // --- CRM State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicleData, setVehicleData] = useState<GenericData | null>(null);
    const [crmLoading, setCrmLoading] = useState(false);
    const [crmError, setCrmError] = useState('');
    const [globalHistory, setGlobalHistory] = useState<GenericData | null>(null);
    const [globalHistoryDate, setGlobalHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<GenericData | null>(null);
    const [ledgerForm, setLedgerForm] = useState({ technician_id: '', status: 'COMPLETED' });
    const invoiceQuery = useQuery({
        queryKey: ['invoiceData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/bookings/completed`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch invoices');
            const data = await res.json();
            return Array.isArray(data) ? data : (data.results || data.data || []);
        },
        enabled: !!token,
        refetchOnMount: true,
        refetchOnWindowFocus: true
    });
    const invoiceList = invoiceQuery.data || [];


    // --- Service Menu CRUD ---

    const openServiceModal = (service: ServicePackage | null = null) => {
        if (service) {
            setEditingService(service);
            const tierMap: Record<string, string> = {
                HATCHBACK: '',
                SEDAN: '',
                COMPACT_SUV: '',
                SUV: '',
                MUV: '',
                VAN: '',
                LUXURY: '',
                BIKE: '',
                AUTO: '',
                TRUCK: ''
            };
            if (service.tier_prices && typeof service.tier_prices === 'object') {
                Object.entries(service.tier_prices).forEach(([k, v]) => {
                    tierMap[k.toUpperCase()] = String(v || '');
                });
            } else if (service.tiered_prices && Array.isArray(service.tiered_prices)) {
                service.tiered_prices.forEach((tp: any) => {
                    if (tp.vehicle_type) {
                        tierMap[tp.vehicle_type.toUpperCase()] = String(tp.price);
                    }
                });
            } else if (service.service_package_prices && Array.isArray(service.service_package_prices)) {
                service.service_package_prices.forEach((tp: any) => {
                    if (tp.vehicle_type) {
                        tierMap[tp.vehicle_type.toUpperCase()] = String(tp.price);
                    }
                });
            }
            // Fill empty fields with main service price
            Object.keys(tierMap).forEach(k => {
                if (!tierMap[k]) tierMap[k] = String(service.price || service.base_price || '');
            });

            setServiceForm({ 
                name: service.name, 
                description: service.description || '', 
                price: String(service.price || service.base_price || ''), 
                duration_minutes: String(service.duration_minutes || '45'),
                tiered_prices: tierMap
            });
        } else {
            setEditingService(null);
            setServiceForm({ 
                name: '', 
                description: '', 
                price: '', 
                duration_minutes: '45',
                tiered_prices: {
                    HATCHBACK: '',
                    SEDAN: '',
                    COMPACT_SUV: '',
                    SUV: '',
                    MUV: '',
                    VAN: '',
                    LUXURY: '',
                    BIKE: '',
                    AUTO: '',
                    TRUCK: ''
                }
            });
        }
        setIsServiceModalOpen(true);
    };

    const saveService = async () => {
        const token = localStorage.getItem('auth_token');
        const url = editingService
            ? `${API_BASE}/services/${editingService.id}`
            : `${API_BASE}/services`;
        const method = editingService ? 'PATCH' : 'POST';
        const ALL_BODY_TYPE_KEYS = ['HATCHBACK', 'SEDAN', 'COMPACT_SUV', 'SUV', 'MUV', 'VAN', 'LUXURY', 'BIKE', 'AUTO', 'TRUCK'];
        const mainPrice = parseFloat(serviceForm.price) || 0;

        const tieredArray = ALL_BODY_TYPE_KEYS.map((k) => ({
            vehicle_type: k,
            price: parseFloat(serviceForm.tiered_prices[k]) || mainPrice
        }));

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    name: serviceForm.name, 
                    description: serviceForm.description, 
                    price: mainPrice, 
                    duration_minutes: parseInt(serviceForm.duration_minutes) || 45,
                    tiered_prices: tieredArray,
                    tier_prices: serviceForm.tiered_prices,
                })
            });
            if (res.ok) {
                toast.success('Service saved successfully!');
                setIsServiceModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['services'] });
            } else {
                const data = await res.json();
                toast.error(data.detail || data.error || 'Failed to save service');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const deleteService = async (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/services/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                toast.success('Service deleted.');
                queryClient.invalidateQueries({ queryKey: ['services'] });
            } else { toast.error('Failed to delete.'); }
        } catch (e) { toast.error('Network error'); }
    };

    // --- Staff Directory CRUD ---

    const openStaffModal = (staff: StaffMember | null = null) => {
        if (staff) {
            setEditingStaff(staff);
            setStaffForm({ 
                first_name: staff.first_name || staff.name || '', 
                phone_number: staff.phone_number || staff.phone || '', 
                role: staff.role || 'WASHER', 
                base_salary: String(staff.salary_amount ?? staff.base_salary ?? ''), 
                commission_rate: String(staff.commission_rate ?? '') 
            });
        } else {
            setEditingStaff(null);
            setStaffForm({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
        }
        setIsStaffModalOpen(true);
    };

    const saveStaff = async (data?: { first_name?: string; name?: string; full_name?: string; phone_number?: string; phone?: string; role: string; salary_type?: string; salary_amount?: string; base_salary?: string; commission_rate?: string; commission_percentage?: string | number; password?: string }) => {
        const token = localStorage.getItem('auth_token');
        const url = editingStaff
            ? `${API_BASE}/staff/directory/${editingStaff.id}`
            : `${API_BASE}/staff/directory`;
        const method = editingStaff ? 'PATCH' : 'POST';
        const formPayload = data ?? staffForm;

        const firstName = formPayload.first_name || (formPayload as any).name || (formPayload as any).full_name || '';
        const phoneNumber = formPayload.phone_number || (formPayload as any).phone || '';
        const salaryVal = parseFloat((formPayload as any).salary_amount || formPayload.base_salary || '0') || 0;
        const commVal = parseFloat(String((formPayload as any).commission_percentage ?? formPayload.commission_rate ?? '0')) || 0;

        try {
            const res = await fetch(url, {
                method,
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '', 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ 
                    first_name: firstName,
                    name: firstName,
                    full_name: firstName,
                    phone_number: phoneNumber,
                    phone: phoneNumber,
                    role: formPayload.role || 'WASHER',
                    salary_type: (formPayload as any).salary_type || 'DAILY',
                    salary_amount: salaryVal,
                    base_salary: salaryVal,
                    commission_rate: commVal,
                    commission_percentage: commVal,
                    is_active: true,
                    password: (formPayload as any).password || (formPayload as any).default_password || undefined,
                })
            });
            if (res.ok) {
                const resData = await res.json().catch(() => ({}));
                toast.success(editingStaff ? 'Staff updated!' : 'Staff registered successfully!');
                await queryClient.invalidateQueries({ queryKey: ['staff'] });
                await queryClient.refetchQueries({ queryKey: ['staff'] });
                await queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                if (editingStaff) {
                    setIsStaffModalOpen(false);
                    setEditingStaff(null);
                }
                return { success: true, data: resData.data };
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || errData.detail || 'Failed to save staff member');
                return { success: false, error: errData.error || errData.detail };
            }
        } catch (e) {
            toast.error('Network error');
            return { success: false, error: 'Network error' };
        }
    };

    const toggleStaffStatus = async (id: number, isCurrentlyActive: boolean) => {
        const actionText = isCurrentlyActive ? "terminate (soft delete)" : "reactivate";
        if (!confirm(`Are you sure you want to ${actionText} this staff member?`)) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/staff/directory/${id}/toggle_status`, {
                method: 'POST',
                headers: { 
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                const data = await res.json();
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                toast.success(data.message || (isCurrentlyActive ? "Staff member terminated." : "Staff member reactivated!"));
            } else {
                toast.error('Failed to update status.');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const terminateStaff = async (id: number) => {
        await toggleStaffStatus(id, true);
    };

    // --- Manual Khata Charge ---
    const submitManualKhataCharge = async (proofFile?: File | null) => {
        if (!manualKhataForm.phone || !manualKhataForm.amount) {
            toast.error('Phone and Amount are required.');
            return;
        }
        const token = localStorage.getItem('auth_token');
        try {
            const formData = new FormData();
            formData.append('phone', manualKhataForm.phone);
            formData.append('name', manualKhataForm.name || '');
            formData.append('amount', String(manualKhataForm.amount));
            formData.append('description', manualKhataForm.description || 'Manual Khata Entry');
            if (proofFile) {
                formData.append('number_plate_image', proofFile);
            }

            const res = await fetch(`${API_BASE}/finance/khata/manual-charge`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}` },
                body: formData,
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(`Charged ₹${manualKhataForm.amount} to ${data.customer_name}'s Khata. New balance: ₹${data.new_balance}`);
                setIsManualKhataOpen(false);
                setManualKhataForm({ phone: '', name: '', amount: '', description: '' });
                queryClient.invalidateQueries();
            } else {
                toast.error(data.error || 'Failed to create Khata charge.');
            }
        } catch (e) { toast.error('Network error'); }
    };

    // Effect for re-fetching Global History ONLY when the date changes AND crm tab is active.
    // Does NOT depend on activeTab or vehicleData to avoid firing on every tab switch.
    const fetchGlobalHistory = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/bookings/global-history?date=${globalHistoryDate}`, {
                headers: { 'Authorization': `Token ${token}` },
            });
            if (res.ok) {
                setGlobalHistory(await res.json());
            } else {
                setGlobalHistory(null);
            }
        } catch (e) {
            setGlobalHistory(null);
        }
    }, [globalHistoryDate]);

    useEffect(() => {
        if (activeTab !== 'crm' || vehicleData) return;
        fetchGlobalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalHistoryDate]);

    const updateLedgerEntry = async () => {
        if (!editingLedgerEntry || !ledgerForm.technician_id || !ledgerForm.status) {
            toast.error('Technician and Status are required.');
            return;
        }
        
        const token = localStorage.getItem('auth_token');
        const url = `${API_BASE}/bookings/${editingLedgerEntry.id || editingLedgerEntry.booking_id}`;

        try {
            const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(ledgerForm)
            });

            if (res.ok) {
                toast.success('Ledger entry updated successfully!');
                setIsLedgerModalOpen(false);
                setEditingLedgerEntry(null);
                fetchGlobalHistory();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to update ledger entry.');
            }
        } catch (error) {
            toast.error('Network error while updating ledger entry.');
        }
    };

    const deleteLedgerEntry = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this specific ledger entry? This cannot be undone.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/bookings/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                toast.success('Ledger entry deleted successfully.');
                fetchGlobalHistory();
            } else {
                toast.error('Failed to delete ledger entry.');
            }
        } catch (error) {
            toast.error('Network error deleting ledger entry.');
        }
    };

    const handleCrmSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setCrmLoading(true);
        setCrmError('');
        const token = localStorage.getItem('auth_token');
        
        try {
            const res = await fetch(`${API_BASE}/bookings/vehicle-history?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            
            if (res.ok) {
                const data = await res.json();
                setVehicleData(data);
                setActiveTab('crm');
            } else {
                const err = await res.json();
                setCrmError(err.error || 'Vehicle not found');
                setVehicleData(null);
            }
        } catch (error) {
            setCrmError('Connection error while fetching timeline.');
            setVehicleData(null);
        } finally {
            setCrmLoading(false);
        }
    };

    // --- Expense Functions ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    const clearFile = () => {
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const expenseMutation = useMutation({
        mutationFn: async (data: FormData | Record<string, any>) => {
            const token = localStorage.getItem('auth_token');
            const url = editingExpense ? `${API_BASE}/finance/general-expenses/${editingExpense.id}/` : `${API_BASE}/finance/general-expenses/`;
            const method = editingExpense ? 'PATCH' : 'POST';

            let body: BodyInit;
            let headers: HeadersInit = { 'Authorization': `Token ${token}` };

            if (data instanceof FormData) {
                body = data;
            } else {
                headers['Content-Type'] = 'application/json';
                const sanitizedPayload = {
                    ...data,
                    category_id: data.category ? Number(data.category) : (data.category_id ? Number(data.category_id) : null),
                    amount: Number(data.amount) || 0,
                };
                body = JSON.stringify(sanitizedPayload);
            }

            const res = await fetch(url, { method, headers, body });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail || err.error || (typeof err === 'object' ? JSON.stringify(err) : 'Failed to record expense.'));
            }
            return res.json();
        },
        onSuccess: async (responsePayload: any) => {
            const newOrUpdatedData = responsePayload?.data || responsePayload;
            toast.success(editingExpense ? 'Expense updated successfully!' : 'Expense recorded successfully!');
            cancelEditingExpense();

            // Set Query cache immediately for instant UI responsiveness
            queryClient.setQueryData(['expenses'], (oldData: any) => {
                if (!oldData) return [newOrUpdatedData];
                const list = Array.isArray(oldData) ? oldData : (oldData.results || []);
                const exists = list.some((item: any) => item.id === newOrUpdatedData.id);
                if (exists) {
                    return list.map((item: any) => item.id === newOrUpdatedData.id ? newOrUpdatedData : item);
                }
                return [newOrUpdatedData, ...list];
            });

            await queryClient.invalidateQueries({ queryKey: ['expenses'] });
            await queryClient.refetchQueries({ queryKey: ['expenses'] });
            await queryClient.invalidateQueries({ queryKey: ['kpiData'] });
            await queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Network error while recording expense.');
        }
    });

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.category || !expenseForm.amount || !expenseForm.date) {
            toast.error('Category, Amount, and Date are required.');
            return;
        }

        const selectedCatObj = expenseCategories.find((c: any) => String(c.id) === String(expenseForm.category) || c.name === expenseForm.category);
        const isOther = expenseForm.category === 'OTHER' || 
                        expenseForm.category === 'Other' || 
                        expenseForm.category === '9' ||
                        (selectedCatObj && (selectedCatObj.name?.toLowerCase().includes('other') || String(selectedCatObj.id).toUpperCase() === 'OTHER'));
        if (isOther && (!expenseForm.custom_category || !expenseForm.custom_category.trim())) {
            toast.error('Please enter a custom category name.');
            return;
        }

        const categoryNum = Number(expenseForm.category);
        const amountNum = Number(expenseForm.amount) || 0;

        const formData = new FormData();
        if (!isOther && !isNaN(categoryNum) && categoryNum > 0) {
            formData.append('category_id', String(categoryNum));
        }
        formData.append('category', expenseForm.category);
        if (isOther && expenseForm.custom_category) {
            formData.append('custom_category', expenseForm.custom_category.trim());
            formData.append('category_name', expenseForm.custom_category.trim());
        }
        formData.append('amount', String(amountNum));
        formData.append('date', expenseForm.date || new Date().toISOString().split('T')[0]);
        formData.append('description', expenseForm.description || '');
        if (receiptFile) formData.append('receipt_image', receiptFile);
        
        expenseMutation.mutate(formData);
    };

    const startEditingExpense = (expense: Expense) => {
        setEditingExpense(expense);
        const catId = (typeof expense.category === 'object' && expense.category !== null && 'id' in expense.category)
            ? String((expense.category as any).id)
            : String(expense.category ?? '');

        setExpenseForm({
            category: catId,
            amount: String(expense.amount),
            date: expense.date,
            description: expense.description || '',
            custom_category: ''
        });
        setReceiptFile(null);
        setReceiptPreview((expense as any).receipt_image || (expense as any).receipt || null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cancelEditingExpense = () => {
        setEditingExpense(null);
        setExpenseForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '', custom_category: '' });
        clearFile();
    };

    const deleteExpense = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/finance/general-expenses/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                toast.success('Expense deleted successfully!');

                queryClient.setQueryData(['expenses'], (oldData: any) => {
                    if (!oldData) return [];
                    const list = Array.isArray(oldData) ? oldData : (oldData.results || []);
                    return list.filter((item: any) => item.id !== id);
                });

                await queryClient.invalidateQueries({ queryKey: ['expenses'] });
                await queryClient.refetchQueries({ queryKey: ['expenses'] });
                await queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                await queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
            } else {
                toast.error('Failed to delete expense.');
            }
        } catch (error) {
            toast.error('Network error while deleting expense.');
        }
    };


    // --- Actions ---

    const fetchDashboardData = () => queryClient.invalidateQueries();
    const fetchServices = () => queryClient.invalidateQueries({ queryKey: ['services'] });
    const fetchStaffDirectory = () => queryClient.invalidateQueries({ queryKey: ['staff'] });
    const fetchExpenseCategories = () => queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });

    const handleLogout = handleSignOut;

    const downloadTaxReport = async () => {
        try {
            const res = await fetch(`${API_BASE}/finance/reports/tax_summary`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tax_summary.csv`; a.click();
        } catch (e) { toast.error("Failed to export."); }
    };

    // Single consolidated invoice download function (downloadInvoicePDF removed — duplicate)
    const downloadInvoice = useCallback(async (bookingOrInvoiceId: string | number) => {
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            const cleanId = String(bookingOrInvoiceId).trim();
            
            const res = await fetch(`${API_BASE}/finance/invoice/${cleanId}/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Token ${token}`,
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Failed to download (${res.status}): ${errorText}`);
            }

            // Convert the response to a Blob to handle the binary PDF data
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary hidden link to trigger the browser's download behavior
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Invoice_${cleanId}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            toast.success("Invoice downloaded successfully!");
        } catch (error) {
            console.error("Download Error:", error);
            toast.error("Failed to download PDF invoice. Check console.");
        }
    }, []);

    const approveExpense = async (id: number) => {
        try {
            await fetch(`${API_BASE}/finance/expenses/${id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true })
            });
            queryClient.invalidateQueries();
        } catch (e) { toast.error("Failed to approve"); }
    };

    const settleCredit = async (id: number) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/invoices/${id}/mark_paid`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                queryClient.invalidateQueries({ queryKey: ['customerCredits'] });
                queryClient.invalidateQueries();
                toast.success("Account marked as settled! Revenue updated.");
            } else {
                toast.error("Failed to settle account.");
            }
        } catch (e) {
            toast.error("Network error while settling account.");
        }
    };

    const openKhataCustomerModal = (customer: KhataCustomer | null = null) => {
        if (customer) {
            setEditingKhataCustomer(customer);
            setKhataCustomerForm({
                name: customer.name || '',
                phone_number: customer.phone_number || '',
                credit_limit: String(customer.credit_limit || '')
            });
        } else {
            setEditingKhataCustomer(null);
            setKhataCustomerForm({ name: '', phone_number: '', credit_limit: '' });
        }
        setIsKhataCustomerModalOpen(true);
    };

    const saveKhataCustomer = async () => {
        if (!khataCustomerForm.name || !khataCustomerForm.phone_number || !khataCustomerForm.credit_limit) {
            toast.error('Name, phone number and credit limit are required.');
            return;
        }
        const token = localStorage.getItem('auth_token');
        const url = editingKhataCustomer ? `${API_BASE}/customers/${editingKhataCustomer.id}` : `${API_BASE}/customers`;
        const method = editingKhataCustomer ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: khataCustomerForm.name,
                    phone_number: khataCustomerForm.phone_number,
                    credit_limit: parseFloat(khataCustomerForm.credit_limit) || 0
                })
            });

            if (res.ok) {
                toast.success('Customer saved successfully!');
                setIsKhataCustomerModalOpen(false);
                setEditingKhataCustomer(null);
                setKhataCustomerForm({ name: '', phone_number: '', credit_limit: '' });
                queryClient.invalidateQueries();
            } else {
                const err = await res.json();
                toast.error(err.error || 'Failed to save customer.');
            }
        } catch (error) {
            toast.error('Network error while saving customer.');
        }
    };

    const deleteKhataCustomer = async (id: number) => {
        if (!window.confirm('Delete this Khata customer? This action cannot be undone.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/customers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                toast.success('Khata customer deleted successfully!');
                queryClient.invalidateQueries();
            } else {
                toast.error('Failed to delete customer.');
            }
        } catch (error) {
            toast.error('Network error while deleting customer.');
        }
    };

    const loadKhataLedger = async (customer: KhataCustomer) => {
        setSelectedKhataCustomer(customer);
        try {
            const res = await fetch(`${API_BASE}/finance/khata/${customer.id}`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (res.ok) {
                const data = await res.json();
                const safeList = Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : (Array.isArray(data?.data) ? data.data : []));
                setKhataLedger(safeList);
                setIsKhataLedgerModalOpen(true);
            } else {
                toast.error('Failed to load Khata ledger.');
            }
        } catch (e) {
            toast.error('Network error while loading Khata ledger.');
        }
    };

    const khataSettleMutation = useMutation({
        mutationFn: async () => {
            if (!selectedKhataCustomer || !khataPaymentAmount) throw new Error("Missing info");
            const res = await fetch(`${API_BASE}/finance/khata/settle`, {
                method: 'POST',
                headers: fetchHeaders,
                body: JSON.stringify({ customer_id: selectedKhataCustomer.id, amount: khataPaymentAmount, description: "Admin Dashboard Settlement" })
            });
            if (!res.ok) throw new Error("Failed to process payment");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Payment received successfully!");
            setIsKhataModalOpen(false);
            setKhataPaymentAmount('');
            queryClient.invalidateQueries({ queryKey: ['khataCustomers'] });
            queryClient.invalidateQueries({ queryKey: ['kpiData'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
            queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
            if (selectedKhataCustomer) loadKhataLedger(selectedKhataCustomer);
        },
        onError: (e: any) => toast.error(e.message || "Network error")
    });

    const handleKhataSettle = () => khataSettleMutation.mutate();

    const closeRegisterMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/finance/close-register`, {
                method: 'POST',
                headers: fetchHeaders
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to close register.");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Register successfully closed and financial data locked.');
            queryClient.invalidateQueries({ queryKey: ['kpiData'] });
            queryClient.invalidateQueries({ queryKey: ['eodData'] });
        },
        onError: (e: any) => {
            toast.error(e.message || "Network error closing register.");
        }
    });

    const handleCloseRegister = () => closeRegisterMutation.mutate();

    const settleWorkerPay = async (id: number | string, amount?: number, paymentMethod?: string, notes?: string) => {
        try {
            const token = localStorage.getItem('auth_token');
            const bodyData: any = {};
            if (amount !== undefined && amount !== null) bodyData.paid_amount = amount;
            if (paymentMethod) bodyData.payment_method = paymentMethod;
            if (notes) bodyData.notes = notes;

            // Resolve ID if passed as numeric or non-UUID
            let targetId = String(id || '').trim();
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!UUID_REGEX.test(targetId)) {
                const staffList = ((staffQuery.data || []) as any[]);
                const matched = staffList.find((s: any) => 
                    String(s.id) === targetId || 
                    String(s.user_id) === targetId ||
                    String(s.payroll_id) === targetId
                );
                if (matched?.id && UUID_REGEX.test(String(matched.id))) {
                    targetId = String(matched.id);
                } else {
                    const num = parseInt(targetId, 10);
                    if (!isNaN(num) && num >= 1 && num <= staffList.length) {
                        const indexed = staffList[num - 1];
                        if (indexed?.id && UUID_REGEX.test(String(indexed.id))) {
                            targetId = String(indexed.id);
                        }
                    }
                }
            }

            const res = await fetch(`${API_BASE}/staff/settle-pay/${targetId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(bodyData)
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'Worker payout recorded successfully.');
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
                return data;
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to settle worker pay");
                throw new Error(err.error || "Failed to settle worker pay");
            }
        } catch (e: any) {
            toast.error(e.message || "Network error settling worker pay");
            throw e;
        }
    };

    const handleAddAdvance = async () => {
        if (!advanceForm.staff_id || !advanceForm.amount) {
            toast.error("Please select a worker and enter an amount.");
            return;
        }
        try {
            const token = localStorage.getItem('auth_token');
            let targetStaffId = String(advanceForm.staff_id || '').trim();
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!UUID_REGEX.test(targetStaffId)) {
                const staffList = ((staffQuery.data || []) as any[]);
                const matched = staffList.find((s: any) => 
                    String(s.id) === targetStaffId || 
                    String(s.user_id) === targetStaffId
                );
                if (matched?.id && UUID_REGEX.test(String(matched.id))) {
                    targetStaffId = String(matched.id);
                }
            }

            const res = await fetch(`${API_BASE}/staff/advance/${targetStaffId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    amount: parseFloat(advanceForm.amount),
                    purpose: advanceForm.description || 'Cash Advance',
                    description: advanceForm.description || 'Cash Advance'
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || "Advance added and deducted from ledger!");
                setIsAdvanceModalOpen(false);
                setAdvanceForm({ staff_id: '', amount: '', description: '' });
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to add advance");
            }
        } catch (e) {
            toast.error("Network error adding advance");
        }
    };

    const handleRecordHandover = async (
        staffId?: string, 
        amount?: number, 
        notes?: string, 
        reconciledInvoiceIds?: number[], 
        vehiclePlates?: string[]
    ) => {
        let targetStaffId = staffId || handoverForm.staff_id;
        const targetAmount = amount !== undefined ? amount : parseFloat(handoverForm.amount);
        const targetNotes = notes !== undefined ? notes : handoverForm.notes;

        if (!targetStaffId || !targetAmount || targetAmount <= 0) {
            toast.error("Please select a staff member and enter a valid handover amount.");
            return;
        }

        // UUID resolution fallback
        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!UUID_REGEX.test(targetStaffId)) {
            const staffList = ((staffQuery.data || []) as any[]);
            const matched = staffList.find((s: any) => 
                String(s.id) === targetStaffId || 
                String(s.user_id) === targetStaffId ||
                String(s.payroll_id) === targetStaffId
            );
            if (matched?.id && UUID_REGEX.test(String(matched.id))) {
                targetStaffId = String(matched.id);
            }
        }

        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE}/staff/cash-handover`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    staff_id: targetStaffId,
                    amount: targetAmount,
                    notes: targetNotes || 'Cash Handover to Admin',
                    reconciled_invoice_ids: reconciledInvoiceIds || [],
                    vehicle_plates: vehiclePlates || []
                })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'Cash handover recorded successfully!');
                setIsHandoverModalOpen(false);
                setHandoverForm({ staff_id: '', amount: '', notes: '' });
                queryClient.invalidateQueries({ queryKey: ['staffHandovers'] });
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
                return data;
            } else {
                const err = await res.json().catch(() => ({}));
                toast.error(err.error || "Failed to record cash handover");
            }
        } catch (e) {
            toast.error("Network error recording cash handover");
        }
    };

    const safeCustomerCredits = Array.isArray(customerCredits) 
        ? customerCredits 
        : ((customerCredits as any)?.results || (customerCredits as any)?.debtors || []);

    const safeKhataCustomers = Array.isArray(khataCustomers) 
        ? khataCustomers 
        : ((khataCustomers as any)?.results || (khataCustomers as any)?.debtors || []);

    const safePayrollData = Array.isArray(payrollData) 
        ? payrollData 
        : ((payrollData as any)?.results || []);

    const totalOutstandingCredit = 
        safeCustomerCredits.reduce((sum: number, item: any) => sum + Number(item.amount || item.outstanding_balance || 0), 0) + 
        safeKhataCustomers.reduce((sum: number, item: any) => sum + Number(item.outstanding_balance || item.amount || 0), 0);

    const totalDailyPayout = safePayrollData.reduce((sum: number, worker: any) => sum + Number(worker.final_payout || worker.amount || 0), 0);


    const value = {
        uiState: {
            isLoading: isGlobalLoading, isGlobalLoading, activeTab, setActiveTab, financeSubTab, setFinanceSubTab,
            staffSubTab, setStaffSubTab, adminName, setAdminName,
            isKhataModalOpen, setIsKhataModalOpen, isKhataCustomerModalOpen, setIsKhataCustomerModalOpen,
            isKhataLedgerModalOpen, setIsKhataLedgerModalOpen, isManualKhataOpen, setIsManualKhataOpen,
            isServiceModalOpen, setIsServiceModalOpen, isStaffModalOpen, setIsStaffModalOpen, openStaffModal,
            isAdvanceModalOpen, setIsAdvanceModalOpen, isHandoverModalOpen, setIsHandoverModalOpen, isLedgerModalOpen, setIsLedgerModalOpen,
            isBankDepositModalOpen, setIsBankDepositModalOpen, isBankWithdrawModalOpen, setIsBankWithdrawModalOpen,
            isEODModalOpen, setIsEODModalOpen
        },
        financeState: {
            kpiData, chartData, expenses, expenseCategories, isSubmittingExpense: expenseMutation.isPending, expenseForm,
            receiptFile, receiptPreview, editingExpense, khataCustomers, khataRecentLedgers, khataLedger, selectedKhataCustomer,
            editingKhataCustomer, khataCustomerForm, khataPaymentAmount, eodData, manualKhataForm,
            customerCredits, invoiceList, analyticsData, totalOutstandingCredit, totalDailyPayout, fileInputRef,
            bankSummary, bankTransactions, refetchBank: () => {
                queryClient.invalidateQueries({ queryKey: ['bankTransactions'] });
                queryClient.invalidateQueries({ queryKey: ['kpiData'] });
                queryClient.invalidateQueries({ queryKey: ['dashboardOverview'] });
            }, isBankLoading: bankQuery.isLoading,
            setExpenseForm, setReceiptFile, setReceiptPreview, setKhataCustomerForm, setKhataPaymentAmount, setManualKhataForm,
            fetchExpenseCategories, handleFileChange, clearFile, handleExpenseSubmit, startEditingExpense,
            cancelEditingExpense, deleteExpense, downloadTaxReport, downloadInvoice, approveExpense, settleCredit,
            openKhataCustomerModal, saveKhataCustomer, deleteKhataCustomer, loadKhataLedger, handleKhataSettle,
            handleCloseRegister, submitManualKhataCharge, setSelectedKhataCustomer, setEditingKhataCustomer
        },
        staffState: {
            payrollData, staffDirectory, editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
            handoverForm, setHandoverForm,
            staffStatusFilter, setStaffStatusFilter, staffSearchQuery, setStaffSearchQuery,
            handoversData: staffHandoversQuery.data?.handovers || [],
            totalHandedOver: staffHandoversQuery.data?.total_handed_over || 0,
            refetchHandovers: () => queryClient.invalidateQueries({ queryKey: ['staffHandovers'] }),
            fetchStaffDirectory, saveStaff, terminateStaff, toggleStaffStatus, settleWorkerPay, handleAddAdvance, handleRecordHandover
        },
        serviceState: {
            services, editingService, serviceForm, setServiceForm, fetchServices, openServiceModal, saveService, deleteService
        },
        crmState: {
            searchQuery, setSearchQuery, vehicleData, crmLoading, crmError, globalHistory, globalHistoryDate,
            setGlobalHistoryDate, editingLedgerEntry, setEditingLedgerEntry, ledgerForm, setLedgerForm,
            fetchGlobalHistory, updateLedgerEntry, deleteLedgerEntry, handleCrmSearch
        },
        globalActions: {
            fetchDashboardData, handleLogout, handleSignOut
        },
        queueState: {
            recentBookings,
            todayWashedVehicles,
            todayWashedCount
        }
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
