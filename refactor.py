import re
import sys

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

# Remove fetchDashboardData
fetcher_pattern = r"// --- Data Fetching ---.*?const fetchDashboardData = useCallback\(async \(\) => \{.*?\n    \}, \[router\]\);\n"
content = re.sub(fetcher_pattern, "", content, flags=re.DOTALL)

# Add useQueries
queries_code = """
    const queryClient = useQueryClient();
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const fetchHeaders = { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' };

    // --- Queries ---
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
        initialData: generateDemoChartData()
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

# Inject queries after demo generator
content = content.replace("const generateDemoChartData = () => {", queries_code + "\n    const generateDemoChartData = () => {")

# Remove redundant fetches
fetch_pats = [
    r"const fetchServices = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"const fetchStaffDirectory = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"const fetchExpenseCategories = useCallback\(async \(\) => \{.*?\n    \}, \[\]\);\n",
    r"useEffect\(\(\) => \{ fetchDashboardData\(\); fetchServices\(\); fetchStaffDirectory\(\); fetchExpenseCategories\(\); \}, \[fetchDashboardData, fetchServices, fetchStaffDirectory, fetchExpenseCategories\]\);\n"
]
for pat in fetch_pats:
    content = re.sub(pat, "", content, flags=re.DOTALL)

# Refactor Mutations
# We will just replace fetchDashboardData() calls with invalidations
content = content.replace("fetchDashboardData();", "queryClient.invalidateQueries();")
content = content.replace("fetchServices();", "queryClient.invalidateQueries({ queryKey: ['services'] });")
content = content.replace("fetchStaffDirectory();", "queryClient.invalidateQueries({ queryKey: ['staff'] });")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement complete.")
