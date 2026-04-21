'use client';

import OverviewTab from '@/components/admin/dashboard/tabs/OverviewTab';
import FinanceTab from '@/components/admin/dashboard/tabs/FinanceTab';
import StaffTab from '@/components/admin/dashboard/tabs/StaffTab';
import StaffModal from '@/components/admin/dashboard/modals/StaffModal';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DashboardProvider } from '@/components/admin/dashboard/context/DashboardContext';
import { useRouter } from 'next/navigation';
import MobileNavigation from '@/components/admin/dashboard/MobileNavigation';
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

import { Skeleton } from '@/components/ui/Skeleton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8001/api';

export default function AdminDashboard() {
    const router = useRouter();

    // --- Navigation State ---
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [financeSubTab, setFinanceSubTab] = useState('overview');
    const [adminName, setAdminName] = useState('Loading...');

    // --- Data States ---
    const [kpiData, setKpiData] = useState({ net_profit_today: 0, revenue_today: 0, general_expenses_today: 0, labor_cost_today: 0 });
    const generateDemoChartData = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({ name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: Math.floor(Math.random() * 8000) + 2000 });
        }
        return days;
    };
    const [chartData, setChartData] = useState<any[]>(generateDemoChartData());
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<any[]>([]);
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
    const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', date: new Date().toISOString().split('T')[0], description: '' });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [editingExpense, setEditingExpense] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [payrollData, setPayrollData] = useState<any[]>([]);
    const [khataCustomers, setKhataCustomers] = useState<any[]>([]);
    const [khataLedger, setKhataLedger] = useState<any[]>([]);
    const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<any | null>(null);
    const [isKhataModalOpen, setIsKhataModalOpen] = useState(false);
    const [isKhataCustomerModalOpen, setIsKhataCustomerModalOpen] = useState(false);
    const [editingKhataCustomer, setEditingKhataCustomer] = useState<any | null>(null);
    const [khataCustomerForm, setKhataCustomerForm] = useState({ name: '', phone_number: '', credit_limit: '' });
    const [isKhataLedgerModalOpen, setIsKhataLedgerModalOpen] = useState(false);
    const [khataPaymentAmount, setKhataPaymentAmount] = useState<string>('');
    const [eodData, setEodData] = useState<any>(null);

    // --- Manual Khata Charge State ---
    const [isManualKhataOpen, setIsManualKhataOpen] = useState(false);
    const [manualKhataForm, setManualKhataForm] = useState({ phone: '', name: '', amount: '', description: '' });

    // --- Service Menu State ---
    const [services, setServices] = useState<any[]>([]);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any | null>(null);
    const [serviceForm, setServiceForm] = useState({ name: '', description: '', price: '', duration_minutes: '' });

    // --- Staff Directory State ---
    const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
    const [staffSubTab, setStaffSubTab] = useState('payroll');
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<any | null>(null);
    const [staffForm, setStaffForm] = useState({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [advanceForm, setAdvanceForm] = useState({ staff_id: '', amount: '', description: '' });

    const [customerCredits, setCustomerCredits] = useState<any[]>([]);
    const [analyticsData, setAnalyticsData] = useState<any>({
        busiest_hours: [],
        packages: [],
        top_staff: [],
    });

    // --- CRM State ---
    const [searchQuery, setSearchQuery] = useState('');
    const [vehicleData, setVehicleData] = useState<any | null>(null);
    const [crmLoading, setCrmLoading] = useState(false);
    const [crmError, setCrmError] = useState('');
    const [globalHistory, setGlobalHistory] = useState<any | null>(null);
    const [globalHistoryDate, setGlobalHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
    const [editingLedgerEntry, setEditingLedgerEntry] = useState<any | null>(null);
    const [ledgerForm, setLedgerForm] = useState({ technician_id: '', status: 'COMPLETED' });
    const [invoiceList, setInvoiceList] = useState<any[]>([]);
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

    // --- Data Fetching ---
    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return router.push('/login');

        const HEADERS = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };

        try {
            // Fetch all 10 endpoints safely (global-history is fetched separately)
            const [userRes, kpiRes, chartRes, bookRes, expRes, creditRes, payrollRes, khataRes, eodRes, analyticsRes] = await Promise.all([
                fetch(`${API_BASE}/core/users/me/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/dashboard/kpi_summary/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/dashboard/revenue_chart/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/bookings/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/general-expenses/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/dashboard/outstanding_credit/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/staff/daily-settlement/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/khata/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/close-register/`, { headers: HEADERS }).catch(() => null),
                fetch(`${API_BASE}/finance/analytics/`, { headers: HEADERS }).catch(() => null),
            ]);

            // Map data to state
            if (userRes?.ok) { const user = await userRes.json(); setAdminName(user.first_name || user.username); }
            if (kpiRes?.ok) setKpiData(await kpiRes.json());
            if (chartRes?.ok) {
                const chartApiData = await chartRes.json();
                if (Array.isArray(chartApiData) && chartApiData.length > 0) {
                    setChartData(chartApiData.map((d: any) => ({ name: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: d.value })));
                }
            }
            if (bookRes?.ok) {
                const b = await bookRes.json();
                // Safely check if it's an array, or if it has a paginated .results array. If neither, use empty []
                const safeBookingsArray = Array.isArray(b) ? b : (Array.isArray(b.results) ? b.results : []);
                setRecentBookings(safeBookingsArray);
            }
            if (expRes?.ok) { const e = await expRes.json(); setExpenses(e.results || e); }
            if (creditRes?.ok) { const creditData = await creditRes.json(); setCustomerCredits(creditData); }
            if (payrollRes?.ok) { const pd = await payrollRes.json(); setPayrollData(pd); }
            if (eodRes?.ok) { const eodD = await eodRes.json(); setEodData(eodD); }
            if (analyticsRes?.ok) { setAnalyticsData(await analyticsRes.json()); }

            // --- THE KHATA FIX ---
            if (khataRes?.ok) {
                const data = await khataRes.json();
                const customerList = Array.isArray(data) ? data : (data.results || []);
                const debtors = customerList.filter((c: any) => Number(c.outstanding_balance || 0) > 0);
                setKhataCustomers(debtors);
                toast.success(`SUCCESS! We found ${debtors.length} customers in the database who owe money.`);
            } else {
                toast.error(`API FAILED! Khata Status: ${khataRes?.status}`);
            }

        } catch (error: any) {
            toast.error("CRASH DETECTED!\n\nReason: " + error.message);
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    // --- Service Menu CRUD ---
    const fetchServices = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/bookings/services/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) setServices(await res.json());
        } catch (e) { console.error('Failed to fetch services'); }
    }, []);

    const openServiceModal = (service: any | null = null) => {
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
            ? `http://127.0.0.1:8001/api/bookings/services/${editingService.id}/`
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
                fetchServices();
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
            const res = await fetch(`http://127.0.0.1:8001/api/bookings/services/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                toast.success('Service deleted.');
                setServices(prev => prev.filter(s => s.id !== id));
            } else { toast.error('Failed to delete.'); }
        } catch (e) { toast.error('Network error'); }
    };

    // --- Staff Directory CRUD ---
    const fetchStaffDirectory = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`${API_BASE}/staff/directory/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) setStaffDirectory(await res.json());
        } catch (e) { console.error('Failed to fetch staff directory'); }
    }, []);

    const openStaffModal = (staff: any | null = null) => {
        if (staff) {
            setEditingStaff(staff);
            setStaffForm({ first_name: staff.first_name, phone_number: staff.phone_number || '', role: staff.role, base_salary: String(staff.base_salary), commission_rate: String(staff.commission_rate || '') });
        } else {
            setEditingStaff(null);
            setStaffForm({ first_name: '', phone_number: '', role: 'WASHER', base_salary: '', commission_rate: '' });
        }
        setIsStaffModalOpen(true);
    };

    const saveStaff = async () => {
        const token = localStorage.getItem('auth_token');
        const url = editingStaff
            ? `http://127.0.0.1:8001/api/staff/directory/${editingStaff.id}/`
            : `${API_BASE}/staff/directory/`;
        const method = editingStaff ? 'PATCH' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...staffForm, base_salary: parseFloat(staffForm.base_salary) || 0, commission_rate: parseFloat(staffForm.commission_rate) || 0 })
            });
            if (res.ok) {
                toast.success(editingStaff ? 'Staff updated!' : 'Staff registered successfully!');
                setIsStaffModalOpen(false);
                fetchStaffDirectory();
            } else {
                const data = await res.json();
                toast.error(data.detail || 'Failed to save');
            }
        } catch (e) { toast.error('Network error'); }
    };

    const terminateStaff = async (id: number) => {
        if (!confirm('WARNING: Are you sure you want to remove this staff member? Their past payroll records will be preserved, but their login will be revoked.')) return;
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/staff/directory/${id}/`, {
                method: 'DELETE',
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok || res.status === 204) {
                toast.success('Staff member terminated.');
                setStaffDirectory(prev => prev.filter(s => s.id !== id));
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
                fetchDashboardData();
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
            const res = await fetch(`http://127.0.0.1:8001/api/bookings/vehicle-history/?q=${encodeURIComponent(searchQuery)}`, {
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
    const fetchExpenseCategories = useCallback(async () => {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/finance/expense-categories/`, {
                headers: { 'Authorization': `Token ${token}` }
            });
            if (res.ok) {
                setExpenseCategories(await res.json());
            }
        } catch (e) { console.error('Failed to load expense categories'); }
    }, []);

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

    const handleExpenseSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expenseForm.category || !expenseForm.amount || !expenseForm.date || !expenseForm.description) {
            toast.error('All fields except Receipt are required.');
            return;
        }
        setIsSubmittingExpense(true);
        const token = localStorage.getItem('auth_token');
        try {
            const formData = new FormData();
            formData.append('category', expenseForm.category);
            formData.append('amount', expenseForm.amount);
            formData.append('date', expenseForm.date);
            formData.append('description', expenseForm.description);
            if (receiptFile) formData.append('receipt_image', receiptFile);

            const url = editingExpense ? `${API_BASE}/finance/general-expenses/${editingExpense.id}/` : `${API_BASE}/finance/general-expenses/`;
            const method = editingExpense ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Authorization': `Token ${token}` },
                body: formData
            });
            if (res.ok) {
                toast.success(editingExpense ? 'Expense updated successfully!' : 'Expense recorded successfully!');
                cancelEditingExpense();
                fetchDashboardData();
            } else {
                const err = await res.json();
                toast.error(err.error || `Failed to ${editingExpense ? 'update' : 'record'} expense.`);
            }
        } catch (error) {
            toast.error(`Network error while ${editingExpense ? 'updating' : 'recording'} expense.`);
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    const startEditingExpense = (expense: any) => {
        setEditingExpense(expense);
        setExpenseForm({
            category: expense.category?.id || expense.category,
            amount: expense.amount,
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
                fetchDashboardData();
            } else {
                toast.error('Failed to delete expense.');
            }
        } catch (error) {
            toast.error('Network error while deleting expense.');
        }
    };

    useEffect(() => { fetchDashboardData(); fetchServices(); fetchStaffDirectory(); fetchExpenseCategories(); }, [fetchDashboardData, fetchServices, fetchStaffDirectory, fetchExpenseCategories]);

    // --- Actions ---
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
            await fetch(`http://127.0.0.1:8001/api/finance/expenses/${id}/`, {
                method: 'PATCH',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_approved: true })
            });
            fetchDashboardData();
        } catch (e) { toast.error("Failed to approve"); }
    };

    const settleCredit = async (id: number) => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/invoices/${id}/mark_paid/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Token ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                setCustomerCredits(prev => prev.filter(credit => credit.id !== id));
                fetchDashboardData();
                toast.success("Account marked as settled! Revenue updated.");
            } else {
                toast.error("Failed to settle account.");
            }
        } catch (e) {
            toast.error("Network error while settling account.");
        }
    };

    const openKhataCustomerModal = (customer: any | null = null) => {
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
                fetchDashboardData();
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
                fetchDashboardData();
            } else {
                toast.error('Failed to delete customer.');
            }
        } catch (error) {
            toast.error('Network error while deleting customer.');
        }
    };

    const loadKhataLedger = async (customer: any) => {
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

    const handleKhataSettle = async () => {
        if (!selectedKhataCustomer || !khataPaymentAmount) return;
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/khata/settle/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ customer_id: selectedKhataCustomer.id, amount: khataPaymentAmount, description: "Admin Dashboard Settlement" })
            });
            if (res.ok) {
                toast.success("Payment received successfully!");
                setIsKhataModalOpen(false);
                setKhataPaymentAmount('');
                fetchDashboardData();
                loadKhataLedger(selectedKhataCustomer);
            } else {
                toast.error("Failed to process payment");
            }
        } catch (e) { toast.error("Network error"); }
    };

    const handleCloseRegister = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8001/api/finance/close-register/`, {
                method: 'POST',
                headers: { 'Authorization': `Token ${localStorage.getItem('auth_token')}`, 'Content-Type': 'application/json' }
            });
            if (res.ok) {
                toast.success('Register successfully closed and financial data locked.');
                fetchDashboardData();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to close register.");
            }
        } catch (e) { toast.error("Network error closing register."); }
    };

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
                fetchDashboardData();
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
                fetchDashboardData(); // Refresh the table!
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

    // Removed full-page loader
    
    return (
        <DashboardProvider>
            <div className="min-h-screen bg-[#050505] text-white flex flex-col lg:flex-row font-jakarta selection:bg-[#FF2A6D]">
                <MobileNavigation />

            {/* SIDEBAR NAVIGATION */}
            <aside className="w-72 bg-[#141518]/60 backdrop-blur-2xl border-r border-white/5 flex-col hidden lg:flex">
                <div className="p-8 border-b border-white/5">
                    <h2 className="text-xl font-syncopate font-bold tracking-widest">KALLAYI<span className="text-[#FF2A6D]">.</span></h2>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#8E939B] mt-2">Admin Portal</p>
                </div>
                <nav className="flex-1 p-6 space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <LayoutDashboard className="w-4 h-4" /> Overview
                    </button>
                    <button onClick={() => setActiveTab('finance')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'finance' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <Wallet className="w-4 h-4" /> Finance Dept
                    </button>
                    <button onClick={() => setActiveTab('staff')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-white/5 text-[#01FFFF] border border-[#01FFFF]/20' : 'text-[#8E939B] hover:text-white'}`}>
                        <Users className="w-4 h-4" /> Staff Ops
                    </button>
                    <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <BarChart2 className="w-4 h-4" /> Analytics & Insights
                    </button>
                    <button onClick={() => setActiveTab('crm')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'crm' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <Search className="w-4 h-4" /> CRM & History
                    </button>
                    <button onClick={() => setActiveTab('eod')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'eod' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <FileText className="w-4 h-4" /> EOD Closing
                    </button>
                    <button onClick={() => setActiveTab('services')} className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === 'services' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-[#8E939B] hover:text-white'}`}>
                        <Wrench className="w-4 h-4" /> Service Menu
                    </button>
                    <button onClick={() => router.push('/admin/queue')} className="w-full flex items-center gap-4 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all text-[#8E939B] hover:text-[#01FFFF] hover:bg-[#01FFFF]/5 hover:border hover:border-[#01FFFF]/20">
                        <Activity className="w-4 h-4" /> Live Queue
                    </button>


                    <div className="pt-4 mt-4 border-t border-white/10">
                        <button onClick={() => router.push('/admin/pos')} className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl bg-[#E52323] text-white font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-[0_0_20px_rgba(229,35,35,0.4)]">
                            Launch Express POS <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </nav>
                <div className="p-6 border-t border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-syncopate font-bold">
                            {adminName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-sm">{adminName}</p>
                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">System Admin</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-[#FF2A6D] hover:border-[#FF2A6D]/50 transition-colors text-xs font-bold uppercase tracking-widest">
                        <LogOut className="w-4 h-4" /> Disconnect
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 p-8 lg:p-12 overflow-y-auto relative">
                
                {/* GLOBAL CRM SEARCH BAR */}
                <div className="mb-8">
                    <form onSubmit={handleCrmSearch} className="relative max-w-2xl">
                        <input 
                            type="text" 
                            placeholder="Search License Plate or Phone Number for CRM Dossier..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#141518]/80 backdrop-blur-xl border border-white/10 focus:border-[#01FFFF] rounded-2xl py-4 pl-14 pr-6 text-white font-syncopate tracking-widest text-xs outline-none transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] focus:shadow-[0_0_30px_rgba(1,255,255,0.15)]"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8E939B]" />
                        <button type="submit" disabled={crmLoading} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#01FFFF]/10 text-[#01FFFF] hover:bg-[#01FFFF] hover:text-black border border-[#01FFFF]/30 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all">
                            {crmLoading ? 'Scanning...' : 'Search'}
                        </button>
                        {vehicleData && (
                            <button 
                                type="button" 
                                onClick={() => { setVehicleData(null); setSearchQuery(''); }}
                                className="absolute -right-24 top-1/2 -translate-y-1/2 text-[#8E939B] hover:text-[#FF2A6D] text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 transition-colors"
                            >
                                ✕ Clear
                            </button>
                        )}
                    </form>
                    {crmError && <p className="text-[#FF2A6D] text-xs mt-3 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {crmError}</p>}
                </div>

                {/* REAL-TIME KPI DASHBOARD (Always Visible) */}
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <Skeleton className="h-[124px]" />
                        <Skeleton className="h-[124px]" />
                        <Skeleton className="h-[124px]" />
                        <Skeleton className="h-[124px]" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/30 p-6 rounded-3xl relative overflow-hidden group shadow-[0_0_30px_rgba(1,255,255,0.05)]">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#01FFFF]/10 rounded-full blur-[50px] group-hover:bg-[#01FFFF]/20 transition-all"></div>
                            <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Net Profit Today</p>
                            <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{kpiData.net_profit_today.toLocaleString()}</h2>
                        </div>
                        <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Total Revenue</p><h2 className="text-3xl font-syncopate font-bold">₹{kpiData.revenue_today.toLocaleString()}</h2></div>
                        <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Labor Cost</p><h2 className="text-3xl font-syncopate font-bold">₹{kpiData.labor_cost_today.toLocaleString()}</h2></div>
                        <div className="bg-[#141518]/60 border border-white/5 p-6 rounded-3xl"><p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">General Expenses</p><h2 className="text-3xl font-syncopate font-bold text-[#FF2A6D]">₹{kpiData.general_expenses_today.toLocaleString()}</h2></div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW A: OVERVIEW TAB */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'overview' && <OverviewTab />}

                {/* ---------------------------------------------------- */}
                {/* VIEW B: FINANCE COMMAND CENTER */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'finance' && <FinanceTab />}

                {/* ---------------------------------------------------- */}
                {/* VIEW C: STAFF OPS & DYNAMIC PAYROLL TAB */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'staff' && <StaffTab />}

                {/* ---------------------------------------------------- */}
                {/* VIEW D: ANALYTICS & INSIGHTS TAB                       */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'analytics' && (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-xl flex items-center gap-3">
                                    <BarChart2 className="w-6 h-6 text-blue-400" /> ANALYTICS & INSIGHTS
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-1">Aggregated from all completed bookings</p>
                            </div>
                        </div>

                        {/* Row 1: Busiest Hours + Package Revenue */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                            {/* Widget 1: Busiest Hours */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(1,255,255,0.04)]">
                                <div className="flex items-center gap-3 mb-1">
                                    <Clock className="w-4 h-4 text-[#01FFFF]" />
                                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF]">BUSIEST HOURS</h4>
                                </div>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-6">Scheduling intelligence — peak demand windows</p>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.busiest_hours} barCategoryGap="30%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                            <XAxis dataKey="hour" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} width={28} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0C0D0F', border: '1px solid rgba(1,255,255,0.2)', borderRadius: '12px' }}
                                                itemStyle={{ color: '#01FFFF' }}
                                                labelStyle={{ color: '#8E939B', fontSize: 11 }}
                                                formatter={(v: any) => [`${v} cars`, 'Volume']}
                                            />
                                            <Bar dataKey="count" fill="#01FFFF" radius={[6, 6, 0, 0]}>
                                                {analyticsData.busiest_hours.map((_: any, i: number) => (
                                                    <Cell key={i} fill={i === analyticsData.busiest_hours.reduce((maxI: number, row: any, idx: number, arr: any[]) => row.count > arr[maxI].count ? idx : maxI, 0) ? '#FF2A6D' : '#01FFFF'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-[#8E939B] mt-3 text-center">🔴 Peak hour highlighted in red</p>
                            </div>

                            {/* Widget 2: Package Revenue */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#FF2A6D]/20 p-6 rounded-3xl shadow-[0_0_30px_rgba(255,42,109,0.04)]">
                                <div className="flex items-center gap-3 mb-1">
                                    <TrendingUp className="w-4 h-4 text-[#FF2A6D]" />
                                    <h4 className="font-syncopate font-bold text-sm tracking-widest text-[#FF2A6D]">REVENUE BY PACKAGE</h4>
                                </div>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-6">Marketing intelligence — highest-value services</p>
                                <div className="h-56">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analyticsData.packages} layout="vertical" barCategoryGap="25%">
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                            <XAxis type="number" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="name" stroke="#8E939B" fontSize={10} tickLine={false} axisLine={false} width={120} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0C0D0F', border: '1px solid rgba(255,42,109,0.2)', borderRadius: '12px' }}
                                                labelStyle={{ color: '#8E939B', fontSize: 11 }}
                                                formatter={(v: any) => [`₹${v.toLocaleString()}`, 'Revenue']}
                                            />
                                            <Bar dataKey="total_revenue" radius={[0, 6, 6, 0]}>
                                                {analyticsData.packages.map((_: any, i: number) => (
                                                    <Cell key={i} fill={i % 2 === 0 ? '#FF2A6D' : '#01FFFF'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Widget 3: Staff Leaderboard */}
                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                <h4 className="font-syncopate font-bold text-sm tracking-widest text-yellow-400">TOP PERFORMING STAFF</h4>
                                <span className="ml-auto text-[10px] text-[#8E939B] uppercase tracking-widest">By jobs completed today</span>
                            </div>
                            <div className="space-y-3">
                                {analyticsData.top_staff.length === 0 ? (
                                    <p className="text-[#8E939B] text-center text-xs py-8">No completed bookings yet today.</p>
                                ) : analyticsData.top_staff.map((staff: any, i: number) => {
                                    const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
                                    const rankBg = ['bg-yellow-500/10 border-yellow-500/30', 'bg-gray-400/10 border-gray-400/20', 'bg-amber-700/10 border-amber-600/20'];
                                    const rankLabel = ['🥇', '🥈', '🥉'];
                                    const isTop = i < 3;
                                    const maxJobs = analyticsData.top_staff[0]?.jobs_completed || 1;
                                    const pct = Math.round((staff.jobs_completed / maxJobs) * 100);
                                    return (
                                        <div key={i} className={`flex items-center gap-5 p-4 rounded-2xl border ${isTop ? rankBg[i] : 'border-white/5 bg-white/2'}`}>
                                            <span className="text-xl w-8 text-center">{isTop ? rankLabel[i] : `#${i + 1}`}</span>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className={`font-bold text-sm ${isTop ? rankColors[i] : 'text-white'}`}>{staff.name}</p>
                                                    <span className="font-syncopate font-black text-sm text-white">{staff.jobs_completed} <span className="text-[10px] text-[#8E939B] font-normal">jobs</span></span>
                                                </div>
                                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : i === 2 ? 'bg-amber-600' : 'bg-white/30'}`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW F: CRM & HISTORY (Digital Garage)                 */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'crm' && (
                  vehicleData ? (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-8">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-2xl flex items-center gap-3">
                                    <BookOpen className="w-6 h-6 text-emerald-400" /> VEHICLE DOSSIER
                                </h3>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.2em] mt-1">Digital Garage CRM</p>
                            </div>
                        </div>

                        {/* SECTION 1: PROFILE ROW & KPIS */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Profile Card */}
                            <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[50px] group-hover:bg-emerald-500/10 transition-all"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="bg-white/10 px-4 py-1 rounded-sm border border-white/20">
                                        <h2 className="text-2xl font-syncopate font-black tracking-[0.1em]">{vehicleData.vehicle_profile.plate_number}</h2>
                                    </div>
                                    {vehicleData.vehicle_profile.outstanding_balance > 0 ? (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-[#FF2A6D]/20 text-[#FF2A6D] border border-[#FF2A6D]/30 px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Dept: ₹{vehicleData.vehicle_profile.outstanding_balance}
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-full flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Clear Account
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Car className="w-5 h-5 text-[#8E939B]" />
                                        <div>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">Vehicle Model</p>
                                            <p className="font-bold text-sm text-white truncate max-w-[200px]">{vehicleData.vehicle_profile.model}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <UserCog className="w-5 h-5 text-[#8E939B]" />
                                        <div>
                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest">Owner</p>
                                            <p className="font-bold text-sm text-white truncate max-w-[200px]">{vehicleData.vehicle_profile.owner_name}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* LTV & KPIs */}
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-emerald-500/20 p-6 rounded-3xl shadow-[0_0_20px_rgba(52,211,153,0.05)] flex flex-col justify-center text-center">
                                    <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <BadgeDollarSign className="w-4 h-4" /> Lifetime Spend
                                    </p>
                                    <h2 className="text-4xl font-syncopate font-bold tracking-tighter text-white">₹{vehicleData.kpis.total_lifetime_spend.toLocaleString()}</h2>
                                </div>
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-6 rounded-3xl flex flex-col justify-center text-center">
                                    <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <MapPin className="w-4 h-4" /> Total Visits
                                    </p>
                                    <h2 className="text-4xl font-syncopate font-bold tracking-tighter text-white">{vehicleData.kpis.total_visits} <span className="text-sm font-normal text-[#8E939B] tracking-normal">times</span></h2>
                                </div>
                                <div className="bg-[#141518]/60 backdrop-blur-xl border border-[#01FFFF]/20 p-6 rounded-3xl flex flex-col justify-center text-center shadow-[0_0_20px_rgba(1,255,255,0.05)]">
                                    <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center justify-center gap-2">
                                        <Star className="w-4 h-4" /> Favorite Service
                                    </p>
                                    <h2 className="text-sm font-bold text-white uppercase tracking-widest leading-relaxed mt-2">{vehicleData.kpis.favorite_service}</h2>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: SERVICE TIMELINE */}
                        <div className="bg-[#141518]/60 backdrop-blur-xl border border-white/5 p-8 rounded-3xl">
                            <h4 className="font-syncopate font-bold text-sm tracking-widest mb-8 border-b border-white/5 pb-4">SERVICE TIMELINE</h4>
                            
                            {vehicleData.timeline.length === 0 ? (
                                <p className="text-[#8E939B] text-center text-sm py-12 border border-dashed border-white/10 rounded-2xl">No completed services found for this vehicle.</p>
                            ) : (
                                <div className="relative pl-4 sm:pl-8 space-y-8 before:content-[''] before:absolute before:left-[11px] sm:before:left-[27px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-emerald-500/50 before:to-white/5">
                                    {vehicleData.timeline.map((event: any, idx: number) => (
                                        <div key={idx} className="relative group">
                                            {/* Timeline Node */}
                                            <div className="absolute -left-[30px] sm:-left-[46px] top-1.5 w-4 h-4 rounded-full border-4 border-[#050505] bg-emerald-400 group-hover:shadow-[0_0_15px_rgba(52,211,153,0.5)] transition-all"></div>
                                            
                                            <div className="bg-white/2 hover:bg-white/5 border border-white/5 group-hover:border-emerald-500/20 transition-all p-5 rounded-2xl">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <Calendar className="w-4 h-4 text-[#8E939B]" />
                                                            <span className="text-[#8E939B] font-mono text-xs">{event.date || 'Unknown Date'}</span>
                                                        </div>
                                                        <h5 className="font-syncopate font-bold text-sm tracking-widest text-[#01FFFF] uppercase">{event.service_package_name}</h5>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-left sm:text-right">
                                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1">Technician</p>
                                                            <p className="text-xs font-bold">{event.technician_name}</p>
                                                        </div>
                                                        <div className="text-left sm:text-right border-l border-white/10 pl-6">
                                                            <p className="text-[10px] text-[#8E939B] uppercase tracking-widest mb-1">Price</p>
                                                            <p className="text-sm font-bold text-emerald-400 font-syncopate">₹{event.price_paid}</p>
                                                        </div>
                                                        {event.booking_id && (
                                                            <button
                                                                onClick={() => downloadInvoice(event.booking_id)}
                                                                title="Download PDF Receipt"
                                                                className="text-[#8E939B] hover:text-[#01FFFF] transition-colors ml-2"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  ) : (
                    <div className="animate-[fadeIn_0.5s_ease-out] space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                            <h3 className="font-syncopate font-bold tracking-widest text-xl">DAILY SHOP LEDGER</h3>
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <label className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E939B] pointer-events-none">
                                        <Calendar className="w-4 h-4" />
                                    </label>
                                    <input 
                                        type="date"
                                        value={globalHistoryDate}
                                        onChange={(e) => setGlobalHistoryDate(e.target.value)}
                                        className="bg-[#141518]/60 border border-white/10 text-white text-xs font-bold font-mono py-2 pl-9 pr-4 rounded-xl outline-none focus:border-[#01FFFF] transition-all cursor-pointer"
                                    />
                                </div>
                            </div>
                        </div>

                        {globalHistory?.stats && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                <div className="bg-[#141518]/60 border border-[#01FFFF]/20 p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(1,255,255,0.05)]">
                                    <div>
                                        <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Total Services</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-white tracking-tighter">{globalHistory.stats.total_services}</h3>
                                    </div>
                                    <Car className="w-8 h-8 text-[#01FFFF]/30" />
                                </div>
                                <div className="bg-[#141518]/60 border border-emerald-500/20 p-5 rounded-2xl flex items-center justify-between shadow-[0_0_15px_rgba(52,211,153,0.05)]">
                                    <div>
                                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Ledger Revenue</p>
                                        <h3 className="text-2xl font-syncopate font-bold text-white tracking-tighter">₹{globalHistory.stats.total_revenue.toLocaleString()}</h3>
                                    </div>
                                    <BadgeDollarSign className="w-8 h-8 text-emerald-400/30" />
                                </div>
                            </div>
                        )}

                        <div className="bg-[#141518]/60 border border-white/5 rounded-3xl p-6 shadow-2xl">
                            {!globalHistory?.feed || globalHistory.feed.length === 0 ? (
                                <p className="text-[#8E939B] text-center py-12 border border-dashed border-white/10 rounded-2xl">No completed services found for {globalHistoryDate}.</p>
                            ) : (
                                <div className="space-y-4">
                                    {globalHistory.feed.map((entry: any, i: number) => (
                                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/2 hover:bg-white/5 border border-white/5 hover:border-white/10 rounded-2xl transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <Car className="w-4 h-4 text-[#8E939B]" />
                                                </div>
                                                <div>
                                                    <p className="font-mono text-white font-bold tracking-wider">{entry.plate_number}</p>
                                                    <p className="text-[#01FFFF] text-[10px] uppercase font-bold tracking-widest mt-1">{entry.service_package_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col sm:items-end gap-1">
                                                <div className="flex items-center gap-2">
                                                    {entry.is_today && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>}
                                                    <p className="text-[#8E939B] text-xs font-mono">{entry.date}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] text-[#8E939B] uppercase tracking-widest">By {entry.technician_name}</span>
                                                    <span className="font-syncopate font-bold text-[#FF2A6D] text-sm hidden sm:inline-block">₹{entry.price}</span>
                                                    {entry.booking_id && (
                                                        <div className="flex items-center gap-2 border-l border-white/10 pl-4 ml-2">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingLedgerEntry(entry);
                                                                    setLedgerForm({
                                                                        technician_id: entry.technician_id || '',
                                                                        status: entry.status || 'COMPLETED'
                                                                    });
                                                                    setIsLedgerModalOpen(true);
                                                                }}
                                                                title="Edit Entry"
                                                                className="text-[#8E939B] hover:text-blue-400 transition-colors p-1"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => deleteLedgerEntry(entry.id || entry.booking_id)}
                                                                title="Delete Entry"
                                                                className="text-[#8E939B] hover:text-red-500 transition-colors p-1"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => downloadInvoice(entry.booking_id)}
                                                                title="Download PDF Receipt"
                                                                className="text-[#8E939B] hover:text-[#01FFFF] transition-colors p-1"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                  )
                )}

                {/* ---------------------------------------------------- */}
                {/* VIEW E: 🔒 END OF DAY SETTLEMENT TAB      */}
                {/* ---------------------------------------------------- */}
                {activeTab === 'eod' && (
                    <div className="animate-[fadeIn_0.5s_ease-out] max-w-5xl mx-auto space-y-8">
                        {!eodData ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Activity className="w-10 h-10 text-[#01FFFF] animate-spin mb-4" />
                                <p className="text-[#8E939B] font-bold tracking-widest text-sm uppercase">Loading EOD Data...</p>
                            </div>
                        ) : (
                            <>
                                <div className="flex justify-between items-end mb-8 border-b border-white/10 pb-6">
                                    <div>
                                        <h3 className="font-syncopate font-bold tracking-widest text-2xl mb-2 flex items-center gap-3">
                                            <Lock className={`w-6 h-6 ${eodData.is_locked ? 'text-emerald-400' : 'text-purple-500'}`} /> 
                                            EOD SETTLEMENT AUDIT
                                        </h3>
                                <p className="text-xs text-[#8E939B] font-mono tracking-widest uppercase">
                                    {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            
                            {/* HERE IS THE CLOSE REGISTER BUTTON */}
                            {eodData.is_locked ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 rounded-xl flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs tracking-widest">
                                    <CheckCircle className="w-4 h-4" /> Register Locked
                                </div>
                            ) : (
                                <button onClick={handleCloseRegister} className="bg-[#E52323] hover:bg-red-700 text-white border border-red-500 px-8 py-4 rounded-xl flex items-center gap-2 font-bold uppercase text-xs tracking-widest shadow-[0_0_30px_rgba(229,35,35,0.4)] transition-all">
                                    <AlertTriangle className="w-4 h-4" /> Close Register & Lock Data
                                </button>
                            )}
                        </div>

                        {/* Top Level Health Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-[#141518]/60 border border-white/5 p-8 rounded-3xl relative overflow-hidden group">
                                <p className="text-[#8E939B] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Query 1: Gross Revenue</p>
                                <h2 className="text-5xl font-syncopate font-bold text-white tracking-tighter">₹{eodData.gross_revenue?.toLocaleString()}</h2>
                                <p className="text-xs text-gray-500 mt-4">Total value of all services completed today.</p>
                            </div>
                            <div className="bg-emerald-900/10 border border-emerald-500/30 p-8 rounded-3xl relative overflow-hidden">
                                <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> True Net Profit</p>
                                <h2 className="text-5xl font-syncopate font-bold text-emerald-400 tracking-tighter">₹{(eodData.gross_revenue - eodData.total_expenses)?.toLocaleString()}</h2>
                                <p className="text-xs text-emerald-400/60 mt-4">[Gross Revenue] - [Shop Expenses]</p>
                            </div>
                        </div>

                        {/* Audits */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Left Column: Payment Split & Deductions */}
                            <div className="space-y-8">
                                <div className="bg-[#141518]/60 border border-white/5 rounded-3xl p-6">
                                    <h4 className="font-bold text-sm uppercase tracking-widest text-[#8E939B] mb-6 border-b border-white/5 pb-4">Query 2: The Payment Split</h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3"><IndianRupee className="w-5 h-5 text-emerald-400"/><span className="font-bold">Physical Cash In</span></div>
                                            <span className="font-mono text-emerald-400 font-bold tracking-widest">₹{(eodData.cash_in_hand || 0).toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                            <div className="flex items-center gap-3"><Landmark className="w-5 h-5 text-blue-400"/><span className="font-bold">Digital / Unpaid</span></div>
                                            <span className="font-mono text-blue-400 font-bold tracking-widest">₹{((eodData.gross_revenue || 0) - (eodData.cash_in_hand || 0)).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: The Cash Drawer Audit */}
                            <div className="bg-[#141518]/60 border border-[#01FFFF]/20 rounded-3xl p-8 relative shadow-[0_0_40px_rgba(1,255,255,0.05)]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[#01FFFF]/5 rounded-full blur-[50px] pointer-events-none"></div>
                                
                                <h4 className="font-syncopate font-bold text-lg uppercase tracking-widest text-[#01FFFF] mb-6 flex items-center gap-2">
                                    <IndianRupee className="w-5 h-5"/> Cash Drawer Audit
                                </h4>
                                <p className="text-xs text-[#8E939B] mb-8 leading-relaxed">
                                    Verifies the physical paper cash in your register. Subtracts cash removed today from total cash collected.
                                </p>

                                <div className="space-y-4 mb-8 text-sm">
                                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                        <span className="text-gray-300">Total Cash Received</span>
                                        <span className="font-mono font-bold text-white">₹{(eodData.cash_in_hand || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#E52323]/10 p-4 rounded-xl border border-[#E52323]/20">
                                        <span className="text-[#E52323]">Minus: Shop Cash Expenses</span>
                                        <span className="font-mono font-bold text-[#E52323]">- ₹{(eodData.total_expenses || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-[#E52323]/10 p-4 rounded-xl border border-[#E52323]/20">
                                        <span className="text-[#E52323]">Minus: Staff Petty Cash</span>
                                        <span className="font-mono font-bold text-[#E52323]">- ₹{(eodData.labor_payouts || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="bg-black/50 border border-[#01FFFF]/30 p-6 rounded-2xl text-center">
                                    <p className="text-[#01FFFF] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Expected Paper Cash in Till</p>
                                    <h2 className="text-4xl font-syncopate font-bold text-white tracking-tighter">₹{(eodData.expected_cash_in_till || 0).toLocaleString()}</h2>
                                </div>
                            </div>

                        </div>
                            </>
                        )}
                    </div>
                )}

                {/* === SERVICE MENU TAB === */}
                {activeTab === 'services' && (
                    <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="font-syncopate font-bold text-xl tracking-widest">SERVICE MENU<span className="text-amber-400">.</span></h2>
                                <p className="text-[10px] text-[#8E939B] uppercase tracking-[0.25em] font-bold mt-1">Configuration & Pricing</p>
                            </div>
                            <button
                                onClick={() => openServiceModal()}
                                className="bg-[#01FFFF] text-black font-syncopate font-bold text-xs tracking-widest px-6 py-3 rounded-xl flex items-center gap-2 shadow-[0_0_20px_rgba(1,255,255,0.3)] hover:bg-white transition-all active:scale-95"
                            >
                                <PlusCircle className="w-4 h-4" /> ADD NEW SERVICE
                            </button>
                        </div>

                        {/* Services Table */}
                        <div className="bg-[#141518]/60 backdrop-blur-xl rounded-[2rem] border border-white/5 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Service Name</th>
                                            <th className="text-left px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B] hidden md:table-cell">Description</th>
                                            <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Duration</th>
                                            <th className="text-right px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Price (₹)</th>
                                            <th className="text-center px-6 py-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E939B]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {services.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-12 text-[#8E939B] text-sm">No services configured yet. Click "Add New Service" to get started.</td></tr>
                                        )}
                                        {services.map((svc: any) => (
                                            <tr key={svc.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                                <td className="px-6 py-5">
                                                    <p className="font-bold text-sm text-white">{svc.name}</p>
                                                </td>
                                                <td className="px-6 py-5 hidden md:table-cell">
                                                    <p className="text-xs text-[#8E939B] max-w-xs truncate">{svc.description || '—'}</p>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="inline-flex items-center gap-1 text-xs text-[#8E939B]">
                                                        <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="font-syncopate font-bold text-emerald-400">₹{parseFloat(svc.price).toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => openServiceModal(svc)}
                                                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#01FFFF] hover:border-[#01FFFF]/30 transition-all"
                                                            title="Edit"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteService(svc.id)}
                                                            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#8E939B] hover:text-[#FF2A6D] hover:border-[#FF2A6D]/30 transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>

                {/* MANUAL KHATA CHARGE MODAL */}
            {isManualKhataOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-purple-400">ADD KHATA CHARGE</h3>
                            <button onClick={() => setIsManualKhataOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Phone Number</label>
                                <input
                                    type="tel" value={manualKhataForm.phone}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Name (Optional if exists)</label>
                                <input
                                    type="text" value={manualKhataForm.name}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="e.g. Rahul Kumar"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Amount (₹)</label>
                                    <input
                                        type="number" value={manualKhataForm.amount}
                                        onChange={(e) => setManualKhataForm({ ...manualKhataForm, amount: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                        placeholder="500"
                                    />
                                </div>
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                    <input
                                        type="text" value={manualKhataForm.description}
                                        onChange={(e) => setManualKhataForm({ ...manualKhataForm, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                        placeholder="Credit"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={submitManualKhataCharge}
                            className="w-full bg-purple-500 text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-400 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusCircle className="w-5 h-5" /> CONFIRM CHARGE
                        </button>
                    </div>
                </div>
            )}

            {/* KHATA PAYMENT MODAL */}
            {isKhataModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">RECEIVE PAYMENT</h3>
                            <button onClick={() => setIsKhataModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <p className="text-sm text-[#8E939B] mb-6">Record a partial or full settlement for <strong className="text-white">{selectedKhataCustomer?.name}</strong>.</p>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Payment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={khataPaymentAmount}
                                    onChange={(e) => setKhataPaymentAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                    placeholder="e.g. 500"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleKhataSettle}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] justify-center hover:bg-white transition-all flex items-center gap-2"
                        >
                            <BadgeDollarSign className="w-5 h-5" /> CONFIRM SETTLEMENT
                        </button>
                    </div>
                </div>
            )}

            {/* KHATA CUSTOMER MODAL */}
            {isKhataCustomerModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518]/95 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#A855F7]">{editingKhataCustomer ? 'EDIT KHATA CUSTOMER' : 'REGISTER KHATA CUSTOMER'}</h3>
                            <button onClick={() => { setIsKhataCustomerModalOpen(false); setEditingKhataCustomer(null); }} className="text-[#8E939B] hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Name</label>
                                <input
                                    type="text"
                                    value={khataCustomerForm.name}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. Anjali Sharma"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Phone Number</label>
                                <input
                                    type="tel"
                                    value={khataCustomerForm.phone_number}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, phone_number: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. 9876543210"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Credit Limit (₹)</label>
                                <input
                                    type="number"
                                    value={khataCustomerForm.credit_limit}
                                    onChange={(e) => setKhataCustomerForm({ ...khataCustomerForm, credit_limit: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#A855F7] focus:ring-1 focus:ring-[#A855F7] transition-all mt-2"
                                    placeholder="e.g. 5000"
                                />
                            </div>
                        </div>
                        <button
                            onClick={saveKhataCustomer}
                            className="w-full bg-[#A855F7] text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:bg-[#C084FC] transition-all flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-5 h-5" /> SAVE CUSTOMER
                        </button>
                    </div>
                </div>
            )}

            {/* KHATA LEDGER HISTORY MODAL */}
            {isKhataLedgerModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518]/95 border border-white/10 p-8 rounded-[2.5rem] w-full max-w-3xl shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">KHATA LEDGER HISTORY</h3>
                                <p className="text-[#8E939B] text-sm">Showing transactions for <strong className="text-white">{selectedKhataCustomer?.name}</strong>.</p>
                            </div>
                            <button onClick={() => setIsKhataLedgerModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors"><PlusCircle className="w-6 h-6 rotate-45" /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-auto rounded-3xl border border-white/10 bg-black/30">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-[#0b0c0f]/95 text-[#8E939B] font-grotesk text-[10px] uppercase tracking-widest">
                                    <tr>
                                        <th className="p-4 pl-6">Date</th>
                                        <th className="p-4">Description</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4 text-right pr-6">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {khataLedger.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-[#8E939B]">No ledger history available for this customer.</td>
                                        </tr>
                                    ) : (
                                        khataLedger.map((entry: any) => (
                                            <tr key={entry.id} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 pl-6 font-mono text-xs text-[#8E939B]">{entry.date}</td>
                                                <td className="p-4 text-gray-300 max-w-[320px] truncate" title={entry.description}>{entry.description}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${entry.transaction_type === 'SETTLEMENT' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[#FF2A6D]/10 text-[#FF2A6D]'}`}>
                                                        {entry.transaction_type === 'SETTLEMENT' ? 'Payment' : 'Credit'}
                                                    </span>
                                                </td>
                                                <td className={`p-4 text-right font-bold ${entry.transaction_type === 'SETTLEMENT' ? 'text-emerald-400' : 'text-[#FF2A6D]'}`}>₹{entry.amount}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* SERVICE CREATE/EDIT MODAL */}
            {isServiceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-amber-400">
                                {editingService ? 'EDIT SERVICE' : 'NEW SERVICE'}
                            </h3>
                            <button onClick={() => setIsServiceModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Service Name</label>
                                <input
                                    type="text" value={serviceForm.name}
                                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all mt-2"
                                    placeholder="e.g. Foam Wash & Wax"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                <textarea
                                    value={serviceForm.description}
                                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all mt-2 resize-none h-24"
                                    placeholder="Brief description of the service"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Price (₹)</label>
                                    <input
                                        type="number" value={serviceForm.price}
                                        onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all mt-2"
                                        placeholder="500"
                                    />
                                </div>
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Duration (min)</label>
                                    <input
                                        type="number" value={serviceForm.duration_minutes}
                                        onChange={(e) => setServiceForm({ ...serviceForm, duration_minutes: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all mt-2"
                                        placeholder="60"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={saveService}
                            className="w-full bg-amber-400 text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.4)] hover:bg-amber-300 transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" /> {editingService ? 'UPDATE SERVICE' : 'CREATE SERVICE'}
                        </button>
                    </div>
                </div>
            )}

            {/* STAFF CREATE/EDIT MODAL - extracted to StaffModal component */}
            <StaffModal />

            {/* MANUAL KHATA CHARGE MODAL */}
            {isManualKhataOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-purple-400">
                                ADD KHATA CHARGE
                            </h3>
                            <button onClick={() => setIsManualKhataOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Phone Number</label>
                                <input
                                    type="tel" value={manualKhataForm.phone}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, phone: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="+91 9876543210"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Customer Name (Optional)</label>
                                <input
                                    type="text" value={manualKhataForm.name}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="Jane Doe"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Charge Amount (₹)</label>
                                <input
                                    type="number" value={manualKhataForm.amount}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, amount: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2"
                                    placeholder="500"
                                />
                            </div>
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                <textarea
                                    value={manualKhataForm.description}
                                    onChange={(e) => setManualKhataForm({ ...manualKhataForm, description: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all mt-2 resize-none h-24"
                                    placeholder="Service or part description"
                                />
                            </div>
                        </div>

                        <button
                            onClick={submitManualKhataCharge}
                            className="w-full bg-purple-500 text-white font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:bg-purple-400 hover:text-black transition-all flex items-center justify-center gap-2"
                        >
                            <BadgeDollarSign className="w-5 h-5" /> SUBMIT CHARGE
                        </button>
                    </div>
                </div>
            )}
            {/* 👇 PASTE THE ADVANCE MODAL HERE 👇 */}
            {isAdvanceModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">RECORD CASH ADVANCE</h3>
                            <button onClick={() => setIsAdvanceModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Select Staff Member</label>
                                <select
                                    value={advanceForm.staff_id}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, staff_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                >
                                    <option value="" className="bg-[#141518]">-- Select Worker --</option>
                                    {payrollData.map(worker => (
                                        <option key={worker.id} value={worker.id} className="bg-[#141518]">{worker.name} ({worker.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Amount (₹)</label>
                                    <input
                                        type="number" value={advanceForm.amount}
                                        onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white font-mono focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                        placeholder="500"
                                    />
                                </div>
                                <div>
                                    <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Description</label>
                                    <input
                                        type="text" value={advanceForm.description}
                                        onChange={(e) => setAdvanceForm({ ...advanceForm, description: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2"
                                        placeholder="Food/Lunch"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleAddAdvance}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2"
                        >
                            <BadgeDollarSign className="w-5 h-5" /> CONFIRM ADVANCE
                        </button>
                    </div>
                </div>
            )}

            {/* LEDGER ENTRY MODAL */}
            {/* LEDGER EDIT MODAL */}
            {isLedgerModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-[fadeIn_0.2s_ease-out] px-4">
                    <div className="bg-[#141518] border border-white/10 p-8 rounded-[2.5rem] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-syncopate font-bold tracking-widest text-[#01FFFF]">EDIT LEDGER ENTRY</h3>
                            <button onClick={() => setIsLedgerModalOpen(false)} className="text-[#8E939B] hover:text-white transition-colors">
                                <PlusCircle className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {editingLedgerEntry && (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                                <p className="text-[10px] uppercase tracking-widest text-[#8E939B] mb-2 font-bold">Vehicle Details</p>
                                <p className="font-mono text-white text-lg font-bold mb-1">{editingLedgerEntry.plate_number}</p>
                                <p className="text-[#01FFFF] text-sm uppercase tracking-widest font-bold">{editingLedgerEntry.service_package_name}</p>
                            </div>
                        )}

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Reassign Technician</label>
                                <select
                                    value={ledgerForm.technician_id}
                                    onChange={(e) => setLedgerForm({ ...ledgerForm, technician_id: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                >
                                    <option value="" className="bg-[#141518]">-- Select Tech --</option>
                                    {staffDirectory.map(tech => (
                                        <option key={tech.id} value={tech.id} className="bg-[#141518]">{tech.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-grotesk text-[10px] uppercase tracking-[0.2em] text-[#8E939B] font-bold ml-2">Status</label>
                                <select
                                    value={ledgerForm.status}
                                    onChange={(e) => setLedgerForm({ ...ledgerForm, status: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 py-4 px-6 rounded-xl text-white focus:outline-none focus:border-[#01FFFF] focus:ring-1 focus:ring-[#01FFFF] transition-all mt-2 appearance-none"
                                >
                                    <option value="COMPLETED" className="bg-[#141518]">COMPLETED</option>
                                    <option value="PENDING" className="bg-[#141518]">PENDING</option>
                                    <option value="CANCELLED" className="bg-[#141518]">CANCELLED</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={updateLedgerEntry}
                            className="w-full bg-[#01FFFF] text-black font-syncopate font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(1,255,255,0.4)] hover:bg-white transition-all flex items-center justify-center gap-2 tracking-widest text-sm"
                        >
                            <CheckCircle className="w-5 h-5" /> UPDATE ENTRY
                        </button>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}} />
            </div>
        </DashboardProvider>
    );
}