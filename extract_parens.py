import os

page_path = r'd:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\dashboard\page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    content = f.read()

def extract_jsx(start_marker):
    start = content.find(start_marker)
    if start == -1: return "", ""
    inner_start = start + len(start_marker)
    
    paren_count = 1
    end = inner_start
    in_string = False
    string_char = ''
    while paren_count > 0 and end < len(content):
        char = content[end]
        
        # very basic string skipping
        if not in_string and char in ("'", '"', '`'):
            in_string = True
            string_char = char
        elif in_string and char == string_char:
            # check if previous is not backslash
            if content[end-1] != '\\':
                in_string = False
            
        if not in_string:
            if char == '(':
                paren_count += 1
            elif char == ')':
                paren_count -= 1
                
        end += 1
        
    return content[start:end], content[inner_start:end-1]

o_full, o_jsx = extract_jsx("{activeTab === 'overview' && (")
f_full, f_jsx = extract_jsx("{activeTab === 'finance' && (")
s_full, s_jsx = extract_jsx("{activeTab === 'staff' && (")

out_dir = r'd:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\tabs'
os.makedirs(out_dir, exist_ok=True)

o_code = f"""'use client';

import React from 'react';
import {{ ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line }} from 'recharts';
import {{ useDashboard }} from '../context/DashboardContext';

export default function OverviewTab() {{
    const {{ financeState, queueState }} = useDashboard();
    const {{ chartData }} = financeState;
    const {{ recentBookings }} = queueState;

    return (
        {o_jsx.strip()}
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
        {f_jsx.strip()}
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
        {s_jsx.strip()}
    );
}}
"""

with open(os.path.join(out_dir, 'OverviewTab.tsx'), 'w', encoding='utf-8') as f: f.write(o_code)
with open(os.path.join(out_dir, 'FinanceTab.tsx'), 'w', encoding='utf-8') as f: f.write(f_code)
with open(os.path.join(out_dir, 'StaffTab.tsx'), 'w', encoding='utf-8') as f: f.write(s_code)

content = content.replace(o_full, "{activeTab === 'overview' && <OverviewTab />}")
content = content.replace(f_full, "{activeTab === 'finance' && <FinanceTab />}")
content = content.replace(s_full, "{activeTab === 'staff' && <StaffTab />}")

if "import OverviewTab" not in content:
    content = content.replace("import React,", "import OverviewTab from '@/components/admin/dashboard/tabs/OverviewTab';\nimport FinanceTab from '@/components/admin/dashboard/tabs/FinanceTab';\nimport StaffTab from '@/components/admin/dashboard/tabs/StaffTab';\nimport React,")

with open(page_path, 'w', encoding='utf-8') as f: f.write(content)

print("Parenthesis based extraction completed successfully!")
