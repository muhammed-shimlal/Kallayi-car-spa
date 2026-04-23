import re

filepath = r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\context\DashboardContext.tsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if "from '@tanstack/react-query'" not in content:
    content = content.replace("import { createContext, useContext } from 'react';", 
                              "import { createContext, useContext } from 'react';\nimport { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';")

# 2. Removes States
states_to_remove = [
    r"const \[kpiData, setKpiData\].*?\n",
    r"const \[chartData, setChartData\].*?\n",
    r"const \[recentBookings, setRecentBookings\].*?\n",
    r"const \[expenses, setExpenses\].*?\n",
    r"const \[expenseCategories, setExpenseCategories\].*?\n",
    r"const \[payrollData, setPayrollData\].*?\n",
    r"const \[khataCustomers, setKhataCustomers\].*?\n",
    r"const \[eodData, setEodData\].*?\n",
    r"const \[services, setServices\].*?\n",
    r"const \[staffDirectory, setStaffDirectory\].*?\n",
    r"const \[customerCredits, setCustomerCredits\].*?\n",
    r"const \[analyticsData, setAnalyticsData\].*?\}\);\n",
]

for pat in states_to_remove:
    content = re.sub(pat, "", content, flags=re.DOTALL)

# Remove fetchDashboardData entirely.
fetcher_pattern = r"    // --- Data Fetching ---.*?const fetchDashboardData = useCallback\(async \(\) => \{.*?\n    \}, \[router\]\);\n"
content = re.sub(fetcher_pattern, "", content, flags=re.DOTALL)

queries_code = """
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

    const isGlobalLoading = userQuery.isLoading || kpiQuery.isLoading || chartQuery.isLoading || bookingsQuery.isLoading || expensesQuery.isLoading || khataQuery.isLoading || customerCreditsQuery.isLoading || payrollQuery.isLoading || servicesQuery.isLoading || staffQuery.isLoading || eodQuery.isLoading || analyticsQuery.isLoading;

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

"""

content = content.replace("    const generateDemoChartData = () => {", queries_code + "\n    const generateDemoChartData = () => {")

redundant_fetchers = [
    r"    const fetchServices = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"    const fetchStaffDirectory = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"    const fetchExpenseCategories = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"    useEffect\(\(\) => \{ fetchDashboardData\(\); fetchServices\(\); fetchStaffDirectory\(\); fetchExpenseCategories\(\); \}, \[fetchDashboardData, fetchServices, fetchStaffDirectory, fetchExpenseCategories\]\);\n"
]
for p in redundant_fetchers:
    content = re.sub(p, "", content, flags=re.DOTALL)

# Refactor Mutations using regex substitute
# EXPENSE SUBMIT
expense_submit_old = r"    const handleExpenseSubmit = async \(e: React\.FormEvent\) => \{.*?\n    \};\n"
expense_submit_new = """    const expenseMutation = useMutation({
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
    };\n"""
content = re.sub(expense_submit_old, expense_submit_new, content, flags=re.DOTALL)


# CLOSE REGISTER
close_register_old = r"    const handleCloseRegister = async \(\) => \{.*?\n    \};\n"
close_register_new = """    const closeRegisterMutation = useMutation({
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

    const handleCloseRegister = () => closeRegisterMutation.mutate();\n"""
content = re.sub(close_register_old, close_register_new, content, flags=re.DOTALL)


# SUBMIT PAYMENT (which is handleKhataSettle inside context)
khata_settle_old = r"    const handleKhataSettle = async \(\) => \{.*?\n    \};\n"
khata_settle_new = """    const khataSettleMutation = useMutation({
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

    const handleKhataSettle = () => khataSettleMutation.mutate();\n"""
content = re.sub(khata_settle_old, khata_settle_new, content, flags=re.DOTALL)


# Delete old unneeded state loading overrides
content = content.replace("const [isLoading, setIsLoading] = useState(true);", "// isLoading replaced by isGlobalLoading")
content = content.replace("isLoading, setIsLoading, activeTab, setActiveTab", "isLoading: isGlobalLoading, isGlobalLoading, activeTab, setActiveTab")

# Inject isPending flags
content = content.replace("isSubmittingExpense,", "isSubmittingExpense: expenseMutation.isPending,")

# Also fix the legacy fetchDashboardData references
content = content.replace("fetchDashboardData();", "queryClient.invalidateQueries();")
content = content.replace("fetchServices();", "queryClient.invalidateQueries({ queryKey: ['services'] });")
content = content.replace("fetchStaffDirectory();", "queryClient.invalidateQueries({ queryKey: ['staff'] });")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
