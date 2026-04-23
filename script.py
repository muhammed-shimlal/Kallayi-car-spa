import os
import re

files_to_process = [
    r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\context\DashboardContext.tsx",
    r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\pos\page.tsx",
    r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\queue\page.tsx"
]

replacements_dashboard = {
    "createContext<any>": "createContext<any>", # leave Context itself as any for now to avoid breaking useDashboard types
    "useState<any[]>([])": "useState<any[]>([])", # placeholder to check if logic is right
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "DashboardContext.tsx" in filepath:
        # Add imports
        import_statement = """import {
    ServicePackage, StaffMember, KhataCustomer, KhataLedgerEntry,
    PayrollWorker, RecentBooking, Invoice, KpiSummary, ChartDataPoint,
    Expense, ExpenseCategory, EodData, AnalyticsData, GenericData
} from '@/types/admin';\n"""
        if "import { createContext, useContext } from 'react';" in content:
            content = content.replace("import { createContext, useContext } from 'react';", import_statement + "\nimport { createContext, useContext } from 'react';")

        content = content.replace("useState<any[]>(generateDemoChartData())", "useState<ChartDataPoint[]>(generateDemoChartData())")
        content = content.replace("useState<any[]>([])", "useState<any[]>([])") # We'll replace individually below
        content = re.sub(r'const \[recentBookings, setRecentBookings\] = useState<any\[\]>\(\[\]\);', r'const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);', content)
        content = re.sub(r'const \[expenses, setExpenses\] = useState<any\[\]>\(\[\]\);', r'const [expenses, setExpenses] = useState<Expense[]>([]);', content)
        content = re.sub(r'const \[expenseCategories, setExpenseCategories\] = useState<any\[\]>\(\[\]\);', r'const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);', content)
        content = re.sub(r'const \[editingExpense, setEditingExpense\] = useState<any \| null>\(null\);', r'const [editingExpense, setEditingExpense] = useState<Expense | null>(null);', content)
        content = re.sub(r'const \[payrollData, setPayrollData\] = useState<any\[\]>\(\[\]\);', r'const [payrollData, setPayrollData] = useState<PayrollWorker[]>([]);', content)
        content = re.sub(r'const \[khataCustomers, setKhataCustomers\] = useState<any\[\]>\(\[\]\);', r'const [khataCustomers, setKhataCustomers] = useState<KhataCustomer[]>([]);', content)
        content = re.sub(r'const \[khataLedger, setKhataLedger\] = useState<any\[\]>\(\[\]\);', r'const [khataLedger, setKhataLedger] = useState<KhataLedgerEntry[]>([]);', content)
        content = re.sub(r'const \[selectedKhataCustomer, setSelectedKhataCustomer\] = useState<any \| null>\(null\);', r'const [selectedKhataCustomer, setSelectedKhataCustomer] = useState<KhataCustomer | null>(null);', content)
        content = re.sub(r'const \[editingKhataCustomer, setEditingKhataCustomer\] = useState<any \| null>\(null\);', r'const [editingKhataCustomer, setEditingKhataCustomer] = useState<KhataCustomer | null>(null);', content)
        content = re.sub(r'const \[eodData, setEodData\] = useState<any>\(null\);', r'const [eodData, setEodData] = useState<EodData | null>(null);', content)
        content = re.sub(r'const \[services, setServices\] = useState<any\[\]>\(\[\]\);', r'const [services, setServices] = useState<ServicePackage[]>([]);', content)
        content = re.sub(r'const \[editingService, setEditingService\] = useState<any \| null>\(null\);', r'const [editingService, setEditingService] = useState<ServicePackage | null>(null);', content)
        content = re.sub(r'const \[staffDirectory, setStaffDirectory\] = useState<any\[\]>\(\[\]\);', r'const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>([]);', content)
        content = re.sub(r'const \[editingStaff, setEditingStaff\] = useState<any \| null>\(null\);', r'const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);', content)
        content = re.sub(r'const \[customerCredits, setCustomerCredits\] = useState<any\[\]>\(\[\]\);', r'const [customerCredits, setCustomerCredits] = useState<KhataCustomer[]>([]);', content)
        content = re.sub(r'const \[analyticsData, setAnalyticsData\] = useState<any>\(\{', r'const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({', content)
        content = re.sub(r'const \[vehicleData, setVehicleData\] = useState<any \| null>\(null\);', r'const [vehicleData, setVehicleData] = useState<GenericData | null>(null);', content)
        content = re.sub(r'const \[globalHistory, setGlobalHistory\] = useState<any \| null>\(null\);', r'const [globalHistory, setGlobalHistory] = useState<GenericData | null>(null);', content)
        content = re.sub(r'const \[editingLedgerEntry, setEditingLedgerEntry\] = useState<any \| null>\(null\);', r'const [editingLedgerEntry, setEditingLedgerEntry] = useState<GenericData | null>(null);', content)
        content = re.sub(r'const \[invoiceList, setInvoiceList\] = useState<any\[\]>\(\[\]\);', r'const [invoiceList, setInvoiceList] = useState<Invoice[]>([]);', content)
        
        # params
        content = content.replace("(d: any)", "(d: ChartDataPoint)")
        content = content.replace("(c: any)", "(c: KhataCustomer)")
        content = content.replace("openServiceModal = (service: any | null = null)", "openServiceModal = (service: ServicePackage | null = null)")
        content = content.replace("openStaffModal = (staff: any | null = null)", "openStaffModal = (staff: StaffMember | null = null)")
        content = content.replace("startEditingExpense = (expense: any)", "startEditingExpense = (expense: Expense)")
        content = content.replace("openKhataCustomerModal = (customer: any | null = null)", "openKhataCustomerModal = (customer: KhataCustomer | null = null)")
        content = content.replace("loadKhataLedger = async (customer: any)", "loadKhataLedger = async (customer: KhataCustomer)")

        # Any catch-all for remaining ": any" we can leave or change GenericData, but we shouldn't change blindly.
        # Let's check Context creation: DashboardContext = createContext<any>(null);
        # We can create a DashboardContextType but `any` for context is sometimes okay to avoid a massive interface typing all nested objects. Or maybe change to createContext<any>(null). 

    elif "queue\\page.tsx" in filepath:
        import_statement = """import { StaffMember, ServicePackage } from '@/types/admin';\n"""
        content = content.replace("import toast from 'react-hot-toast';", "import toast from 'react-hot-toast';\n" + import_statement)
        content = content.replace("staffMembers?: any[];", "staffMembers?: StaffMember[];")
        content = content.replace("useState<any[]>([])", "useState<any[]>([])") # just checking
        content = re.sub(r'const \[staffMembers, setStaffMembers\] = useState<any\[\]>\(\[\]\);', r'const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);', content)
        content = re.sub(r'const \[servicePackages, setServicePackages\] = useState<any\[\]>\(\[\]\);', r'const [servicePackages, setServicePackages] = useState<ServicePackage[]>([]);', content)
        content = content.replace("(s: any)", "(s: StaffMember)")

    elif "pos\\page.tsx" in filepath:
        import_statement = """import { ServicePackage } from '@/types/admin';\n"""
        content = content.replace('import toast from "react-hot-toast";', 'import toast from "react-hot-toast";\n' + import_statement)
        content = content.replace("useState<any[]>([])", "useState<ServicePackage[]>([])")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

for file in files_to_process:
    process_file(file)

print("Replacement complete.")
