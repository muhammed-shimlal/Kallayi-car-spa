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

const API_BASE: string = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';


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

    // --- Navigation State ---
    // isLoading replaced by isGlobalLoading
    const [activeTab, setActiveTab] = useState('overview');
    const [financeSubTab, setFinanceSubTab] = useState('overview');
    const [adminName, setAdminName] = useState('Loading...');

    // --- Data States ---
    
    const queryClient = useQueryClient();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const fetchHeaders = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };

    // --- React Query Fetchers ---
    const userQuery = useQuery({
        queryKey: ['userMe'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/core/users/me/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            setAdminName(data.first_name || data.username);
            return data;
        },
        enabled: !!token
    });

    const kpiQuery = useQuery<KpiSummary>({
        queryKey: ['kpiData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/dashboard/kpi_summary/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed to fetch KPI');
            return res.json();
        },
        enabled: !!token
    });

    const chartQuery = useQuery<ChartDataPoint[]>({
        queryKey: ['chartData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/dashboard/revenue_chart/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                return data.map((d: ChartDataPoint) => ({ name: new Date(d.date || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: d.value }));
            }
            return generateDemoChartData();
        },
        enabled: !!token,
        initialData: () => generateDemoChartData()
    });

    const bookingsQuery = useQuery<RecentBooking[]>({
        queryKey: ['recentBookings'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/bookings/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const b = await res.json();
            return Array.isArray(b) ? b : (Array.isArray(b.results) ? b.results : []);
        },
        enabled: !!token
    });

    const expensesQuery = useQuery<Expense[]>({
        queryKey: ['expenses'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/general-expenses/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const e = await res.json();
            return e.results || e;
        },
        enabled: !!token
    });

    const expenseCategoriesQuery = useQuery<ExpenseCategory[]>({
        queryKey: ['expenseCategories'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/expense-categories/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const khataQuery = useQuery<KhataCustomer[]>({
        queryKey: ['khataCustomers'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/khata/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            const customerList = Array.isArray(data) ? data : (data.results || []);
            return customerList.filter((c: KhataCustomer) => Number(c.outstanding_balance || 0) > 0);
        },
        enabled: !!token
    });

    const customerCreditsQuery = useQuery<KhataCustomer[]>({
        queryKey: ['customerCredits'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/dashboard/outstanding_credit/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const payrollQuery = useQuery<PayrollWorker[]>({
        queryKey: ['payrollData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/staff/daily-settlement/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const servicesQuery = useQuery<ServicePackage[]>({
        queryKey: ['services'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/bookings/services/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const staffQuery = useQuery<StaffMember[]>({
        queryKey: ['staff'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/staff/directory/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const eodQuery = useQuery<EodData>({
        queryKey: ['eodData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/close-register/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const analyticsQuery = useQuery<AnalyticsData>({
        queryKey: ['analyticsData'],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/finance/analytics/`, { headers: fetchHeaders });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!token
    });

    const isGlobalLoading = !isMounted || userQuery.isLoading || kpiQuery.isLoading || chartQuery.isLoading || bookingsQuery.isLoading || expensesQuery.isLoading || khataQuery.isLoading || customerCreditsQuery.isLoading || payrollQuery.isLoading || servicesQuery.isLoading || staffQuery.isLoading || eodQuery.isLoading || analyticsQuery.isLoading;

    const kpiData = kpiQuery.data || { net_profit_today: 0, revenue_today: 0, general_expenses_today: 0, labor_cost_today: 0 };
    const chartData = chartQuery.data || generateDemoChartData();
    const recentBookings = bookingsQuery.data || [];
    const expenses = expensesQuery.data || [];
    const expenseCategories = expenseCategoriesQuery.data || [];
    const khataCustomers = khataQuery.data || [];
    const customerCredits = customerCreditsQuery.data || [];
    const payrollData = payrollQuery.data || [];
    const services = servicesQuery.data || [];
    const staffDirectory = staffQuery.data || [];
    const eodData = eodQuery.data || null;
    const analyticsData = analyticsQuery.data || { busiest_hours: [], packages: [], top_staff: [] };


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
    const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
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

    // --- Service Menu State ---
        const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServicePackage | null>(null);
    const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', duration_minutes: '' });

    // --- Staff Directory State ---
        const [staffSubTab, setStaffSubTab] = useState('payroll');
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
    const [staffForm, setStaffForm] = useState({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ staff_id: '', amount: '', description: '' });

        
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
    const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);
    useEffect(() => {
        // Only fetch when the user clicks the "PDF Invoices" sub-tab
        if (activeTab !== 'finance' || financeSubTab !== 'invoices') return;
        
        const fetchInvoices = async () => {
            const token = localStorage.getItem('auth_token');
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/bookings/completed/`, {
                    headers: { 'Authorization': `Token ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setInvoiceList(Array.isArray(data) ? data : (data.results || []));
                }
            } catch (e) { 
                console.error("Failed to load invoice list", e); 
            }
        };
        fetchInvoices();
    }, [activeTab, financeSubTab]);


    // --- Service Menu CRUD ---

    const openServiceModal = (service: ServicePackage | null = null) => {
        if (service) {
            setEditingService(service);
            setServiceForm({ name: service.name, description: service.description || '', price: String(service.price), duration_minutes: String(service.duration_minutes) });
        } else {
            setEditingService(null);
            setServiceForm({ name: '', description: '', price: '', duration_minutes: '' });
        }
        setIsServiceModalOpen(true);
    };

    const saveService = async () => {
        const token = localStorage.getItem('auth_token');
        const url = editingService
            ? `${API_BASE}/bookings/services/${editingService.id}/`
            : `${API_BASE}/bookings/services/`;
        const method = editingService ? 'PATCH' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    ...serviceForm, 
                    price: parseFloat(serviceForm.price) || 0, 
                    duration_minutes: parseInt(serviceForm.duration_minutes) || 0 
                })
            });
            if (res.ok) {
                toast.success('Service saved successfully!');
                setIsServiceModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['services'] });
            } else {
                const data = await res.json();
                toast.error(data.detail || 'Failed to save service');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const deleteService = async (id: number) => {
        if (!confirm('Are you sure you want to delete this service?')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/bookings/services/${id}/`, {
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
            setStaffForm({ first_name: staff.first_name, phone_number: staff.phone_number || '', role: staff.role, base_salary: String(staff.base_salary), commission_rate: String(staff.commission_rate || '') });
        } else {
            setEditingStaff(null);
            setStaffForm({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
        }
        setIsStaffModalOpen(true);
    };

    const saveStaff = async (data?: { first_name: string; phone_number: string; role: string; base_salary: string; commission_rate?: string }) => {
        const token = localStorage.getItem('auth_token');
        const url = editingStaff
            ? `${API_BASE}/staff/directory/${editingStaff.id}/`
            : `${API_BASE}/staff/directory/`;
        const method = editingStaff ? 'PATCH' : 'POST';
        const formPayload = data ?? staffForm;
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formPayload, base_salary: parseFloat(formPayload.base_salary) || 0, commission_rate: parseFloat(formPayload.commission_rate || '0') || 0 })
            });
            if (res.ok) {
                toast.success(editingStaff ? 'Staff updated!' : 'Staff registered successfully!');
                setIsStaffModalOpen(false);
                queryClient.invalidateQueries({ queryKey: ['staff'] });
            } else {
                const errData = await res.json();
                toast.error(errData.detail || 'Failed to save');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const terminateStaff = async (id: number) => {
        if (!confirm('WARNING: Are you sure you want to remove this staff member? Their past payroll records will be preserved, but their login will be revoked.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/staff/directory/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                queryClient.invalidateQueries({ queryKey: ['staff'] });
                queryClient.invalidateQueries({ queryKey: ['payrollData'] });
                toast.success("Staff member terminated.");
            } else { toast.error('Failed to terminate.'); }
        } catch (e) { toast.error('Network error'); }
    };

    // --- Manual Khata Charge ---
    const submitManualKhataCharge = async () => {
        if (!manualKhataForm.phone || !manualKhataForm.amount) {
            toast.error('Phone and Amount are required.');
            return;
        }
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/finance/khata/manual-charge/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: manualKhataForm.phone,
                    name: manualKhataForm.name,
                    amount: parseFloat(manualKhataForm.amount),
                    description: manualKhataForm.description || 'Manual Khata Entry',
                }),
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
            const res = await fetch(`${API_BASE}/bookings/global-history/?date=${globalHistoryDate}`, {
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
        const url = `${API_BASE}/bookings/${editingLedgerEntry.id || editingLedgerEntry.booking_id}/`;

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
            const res = await fetch(`${API_BASE}/bookings/${id}/`, {
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
            const res = await fetch(`${API_BASE}/bookings/vehicle-history/?q=${encodeURIComponent(searchQuery)}`, {
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
        mutationFn: async (formData: FormData) => {
            const token = localStorage.getItem('auth_token');
            const url = editingExpense ? `${API_BASE}/finance/general-expenses/${editingExpense.id}/` : `${API_BASE}/finance/general-expenses/`;
            const method = editingExpense ? 'PATCH' : 'POST';
            const res = await fetch(url, { method, headers: { 'Authorization': `Token ${token}` }, body: formData });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to record expense.');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editingExpense ? 'Expense updated successfully!' : 'Expense recorded successfully!');
            cancelEditingExpense();
            queryClient.invalidateQueries({ queryKey: ['kpiData'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        },
        onError: (err: any) => {
            toast.error(err.message || 'Network error while recording expense.');
        }
    });

    const handleExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.category || !expenseForm.amount || !expenseForm.date || !expenseForm.description) {
            toast.error('All fields except Receipt are required.');
            return;
        }
        const formData = new FormData();
        formData.append('category', expenseForm.category);
        formData.append('amount', expenseForm.amount);
        formData.append('date', expenseForm.date);
        formData.append('description', expenseForm.description);
        if (receiptFile) formData.append('receipt_image', receiptFile);
        
        expenseMutation.mutate(formData);
    };

    const startEditingExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setExpenseForm({
            category: (typeof expense.category === 'object' && expense.category !== null && 'id' in expense.category) ? String(expense.category.id) : String(expense.category),
            amount: String(expense.amount),
            date: expense.date,
            description: expense.description
        });
        setReceiptFile(null);
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const cancelEditingExpense = () => {
        setEditingExpense(null);
        setExpenseForm({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
        clearFile();
    };

    const deleteExpense = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this expense? This action cannot be undone.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/finance/general-expenses/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                toast.success('Expense deleted successfully!');
                queryClient.invalidateQueries();
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

    const handleLogout = () => { localStorage.removeItem('auth_token'); router.push('/login'); };

    const downloadTaxReport = async () => {
        try {
            const res = await fetch(`${API_BASE}/finance/reports/tax_summary/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (!res.ok) throw new Error("Failed");
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `tax_summary.csv`; a.click();
        } catch (e) { toast.error("Failed to export."); }
    };

    // Single consolidated invoice download function (downloadInvoicePDF removed — duplicate)
    const downloadInvoice = useCallback(async (bookingId: number) => {
        try {
            const res = await fetch(`${API_BASE}/finance/invoice/${bookingId}/pdf/`, {
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` }
            });
            if (!res.ok) throw new Error('Failed to generate PDF');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Kallayi_Invoice_${bookingId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success('Invoice Downloaded');
        } catch (e) {
            toast.error('Failed to download invoice.');
        }
    }, []);

    const approveExpense = async (id: number) => {
        try {
            await fetch(`${API_BASE}/finance/expenses/${id}/`, {
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
            const res = await fetch(`${API_BASE}/invoices/${id}/mark_paid/`, {
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
        const url = editingKhataCustomer ? `${API_BASE}/customers/${editingKhataCustomer.id}/` : `${API_BASE}/customers/`;
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
            const res = await fetch(`${API_BASE}/customers/${id}/`, {
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
            const res = await fetch(`${API_BASE}/finance/khata/${customer.id}/`, { headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}` } });
            if (res.ok) {
                setKhataLedger(await res.json());
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
            const res = await fetch(`${API_BASE}/finance/khata/settle/`, {
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
            queryClient.invalidateQueries({ queryKey: ['recentBookings'] });
            if (selectedKhataCustomer) loadKhataLedger(selectedKhataCustomer);
        },
        onError: (e: any) => toast.error(e.message || "Network error")
    });

    const handleKhataSettle = () => khataSettleMutation.mutate();

    const closeRegisterMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`${API_BASE}/finance/close-register/`, {
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

    const settleWorkerPay = async (id: number) => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE}/staff/payroll/${id}/settle/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (res.ok) {
                toast.success('Worker paid successfully.');
                queryClient.invalidateQueries();
            } else {
                toast.error("Failed to settle worker pay");
            }
        } catch (e) {
            toast.error("Network error settling worker pay");
        }
    };
    const handleAddAdvance = async () => {
        if (!advanceForm.staff_id || !advanceForm.amount) {
            toast.error("Please select a worker and enter an amount.");
            return;
        }
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_BASE}/staff/advance/${advanceForm.staff_id}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    amount: advanceForm.amount,
                    description: advanceForm.description || 'Cash Advance'
                })
            });

            if (res.ok) {
                toast.success("Advance added and deducted from ledger!");
                setIsAdvanceModalOpen(false);
                setAdvanceForm({ staff_id: '', amount: '', description: '' });
                queryClient.invalidateQueries(); // Refresh the table!
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to add advance");
            }
        } catch (e) {
            toast.error("Network error adding advance");
        }
    };

    const totalOutstandingCredit = 
    customerCredits.reduce((sum, item) => sum + Number(item.amount || 0), 0) + 
    khataCustomers.reduce((sum, item) => sum + Number(item.outstanding_balance || 0), 0);
    const totalDailyPayout = payrollData.reduce((sum, worker) => sum + worker.final_payout, 0);


    const value = {
        uiState: {
            isLoading: isGlobalLoading, isGlobalLoading, activeTab, setActiveTab, financeSubTab, setFinanceSubTab,
            staffSubTab, setStaffSubTab, adminName, setAdminName,
            isKhataModalOpen, setIsKhataModalOpen, isKhataCustomerModalOpen, setIsKhataCustomerModalOpen,
            isKhataLedgerModalOpen, setIsKhataLedgerModalOpen, isManualKhataOpen, setIsManualKhataOpen,
            isServiceModalOpen, setIsServiceModalOpen, isStaffModalOpen, setIsStaffModalOpen, openStaffModal,
            isAdvanceModalOpen, setIsAdvanceModalOpen, isLedgerModalOpen, setIsLedgerModalOpen
        },
        financeState: {
            kpiData, chartData, expenses, expenseCategories, isSubmittingExpense: expenseMutation.isPending, expenseForm,
            receiptFile, receiptPreview, editingExpense, khataCustomers, khataLedger, selectedKhataCustomer,
            editingKhataCustomer, khataCustomerForm, khataPaymentAmount, eodData, manualKhataForm,
            customerCredits, invoiceList, analyticsData, totalOutstandingCredit, totalDailyPayout,
            setExpenseForm, setReceiptFile, setReceiptPreview, setKhataCustomerForm, setKhataPaymentAmount, setManualKhataForm,
            fetchExpenseCategories, handleFileChange, clearFile, handleExpenseSubmit, startEditingExpense,
            cancelEditingExpense, deleteExpense, downloadTaxReport, downloadInvoice, approveExpense, settleCredit,
            openKhataCustomerModal, saveKhataCustomer, deleteKhataCustomer, loadKhataLedger, handleKhataSettle,
            handleCloseRegister, submitManualKhataCharge, setSelectedKhataCustomer, setEditingKhataCustomer
        },
        staffState: {
            payrollData, staffDirectory, editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
            fetchStaffDirectory, saveStaff, terminateStaff, settleWorkerPay, handleAddAdvance
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
            fetchDashboardData, handleLogout
        },
        queueState: {
            recentBookings
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
