import os

page_path = r'd:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\dashboard\page.tsx'
out_dir = r'd:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\tabs'

with open(page_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

overview_lines = "".join(lines[909:945])
finance_lines = "".join(lines[951:1367])
staff_lines = "".join(lines[1373:1562])

o_code = f"""'use client';

import React from 'react';
import {{ ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line }} from 'recharts';
import {{ useDashboard }} from '../context/DashboardContext';

export default function OverviewTab() {{
    const {{ financeState, queueState }} = useDashboard();
    const {{ chartData }} = financeState;
    const {{ recentBookings }} = queueState;

    return (
{overview_lines}
    );
}}
"""

f_code = f"""'use client';

import React, {{ useRef }} from 'react';
import {{ Download, TrendingUp, Clock, PlusCircle, UserPlus, AlertCircle, FileText, Pencil, Trash2, Check, Tag, Calendar, Image as ImageIcon, X }} from 'lucide-react';
import {{ ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line }} from 'recharts';
import {{ useDashboard }} from '../context/DashboardContext';

export default function FinanceTab() {{
    const fileInputRef = useRef<HTMLInputElement>(null);
    const {{ uiState, financeState }} = useDashboard();
    const {{ 
        financeSubTab, setFinanceSubTab, setIsManualKhataOpen,
        setIsKhataCustomerModalOpen, setIsKhataLedgerModalOpen, setIsKhataModalOpen
    }} = uiState;
    
    const {{ 
        chartData, expenses, expenseCategories, isSubmittingExpense, expenseForm,
        receiptFile, receiptPreview, editingExpense, khataCustomers, khataLedger, selectedKhataCustomer,
        editingKhataCustomer, khataCustomerForm, khataPaymentAmount, eodData, manualKhataForm,
        customerCredits, invoiceList, totalOutstandingCredit, setExpenseForm, setReceiptFile, setReceiptPreview, 
        setKhataCustomerForm, setKhataPaymentAmount, setManualKhataForm, handleFileChange, clearFile, 
        handleExpenseSubmit, startEditingExpense, cancelEditingExpense, deleteExpense, downloadTaxReport, 
        downloadInvoice, settleCredit, openKhataCustomerModal, saveKhataCustomer, deleteKhataCustomer, 
        loadKhataLedger, handleKhataSettle, submitManualKhataCharge
    }} = financeState;

    return (
{finance_lines}
    );
}}
"""

s_code = f"""'use client';

import React from 'react';
import {{ PlusCircle, Wallet, UserCog, CheckCircle, BadgeDollarSign, Pencil, UserMinus }} from 'lucide-react';
import {{ useDashboard }} from '../context/DashboardContext';

export default function StaffTab() {{
    const {{ uiState, staffState, financeState }} = useDashboard();
    const {{ staffSubTab, setStaffSubTab, setIsAdvanceModalOpen, openStaffModal }} = uiState;
    const {{ totalDailyPayout }} = financeState;
    const {{ 
        payrollData, staffDirectory, editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
        saveStaff, terminateStaff, settleWorkerPay, handleAddAdvance
    }} = staffState;

    return (
{staff_lines}
    );
}}
"""

os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, 'OverviewTab.tsx'), 'w', encoding='utf-8') as f: f.write(o_code)
with open(os.path.join(out_dir, 'FinanceTab.tsx'), 'w', encoding='utf-8') as f: f.write(f_code)
with open(os.path.join(out_dir, 'StaffTab.tsx'), 'w', encoding='utf-8') as f: f.write(s_code)

new_lines = []
for i in range(len(lines)):
    if i == 908: new_lines.append("                {activeTab === 'overview' && <OverviewTab />}\n")
    elif 908 < i <= 945: pass
    elif i == 950: new_lines.append("                {activeTab === 'finance' && <FinanceTab />}\n")
    elif 950 < i <= 1367: pass
    elif i == 1372: new_lines.append("                {activeTab === 'staff' && <StaffTab />}\n")
    elif 1372 < i <= 1562: pass
    else: new_lines.append(lines[i])

content = "".join(new_lines)
if "import OverviewTab" not in content:
    content = content.replace("import React,", "import OverviewTab from '@/components/admin/dashboard/tabs/OverviewTab';\nimport FinanceTab from '@/components/admin/dashboard/tabs/FinanceTab';\nimport StaffTab from '@/components/admin/dashboard/tabs/StaffTab';\nimport React,")

with open(page_path, 'w', encoding='utf-8') as f: f.write(content)
print('Tabs extracted exactly by line numbers.')
