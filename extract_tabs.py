import re
import os

page_path = r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\app\(admin)\admin\dashboard\page.tsx"
out_dir = r"d:\Kallayi-car-spa\kallayi_car_spa_frontend\src\components\admin\dashboard\tabs"

os.makedirs(out_dir, exist_ok=True)

with open(page_path, 'r', encoding='utf-8') as f:
    page_content = f.read()

# Grab Overview Tab
overview_regex = r"(\{activeTab === 'overview' && \(\s*)(<div className=\"animate-\[fadeIn_0\.5s_ease-out\] grid grid-cols-1 lg:grid-cols-3 gap-8\">.*?</div>)(\s*\)\})"
overview_match = re.search(overview_regex, page_content, flags=re.DOTALL)
if overview_match:
    overview_jsx = overview_match.group(2)
    overview_component = f"""'use client';

import React from 'react';
import {{ ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line }} from 'recharts';
import {{ useDashboard }} from '../context/DashboardContext';

export default function OverviewTab() {{
    const {{ financeState, queueState }} = useDashboard();
    const {{ chartData }} = financeState;
    const {{ recentBookings }} = queueState;

    return (
        {overview_jsx}
    );
}}
"""
    with open(os.path.join(out_dir, "OverviewTab.tsx"), 'w', encoding='utf-8') as f:
        f.write(overview_component)
    page_content = page_content.replace(overview_match.group(0), "{activeTab === 'overview' && <OverviewTab />}")

# Grab Finance Tab
finance_regex = r"(\{activeTab === 'finance' && \(\s*)(<div className=\"animate-\[fadeIn_0\.5s_ease-out\]\">.*?</div>\s*</div>)(\s*\)\})"
finance_match = re.search(finance_regex, page_content, flags=re.DOTALL)
if finance_match:
    finance_jsx = finance_match.group(2)
    
    finance_component = f"""'use client';

import React from 'react';
import {{ Download, TrendingUp, Clock, PlusCircle, UserPlus, AlertCircle, FileText, Pencil, Trash2, Check, Tag, Calendar, Image as ImageIcon, X }} from 'lucide-react';
import {{ ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Line }} from 'recharts';
import {{ useDashboard }} from '../context/DashboardContext';

export default function FinanceTab() {{
    const {{ uiState, financeState }} = useDashboard();
    const {{ 
        financeSubTab, setFinanceSubTab, isManualKhataOpen, setIsManualKhataOpen,
        isKhataCustomerModalOpen, setIsKhataCustomerModalOpen, isKhataLedgerModalOpen, setIsKhataLedgerModalOpen
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
        {finance_jsx}
    );
}}
"""
    with open(os.path.join(out_dir, "FinanceTab.tsx"), 'w', encoding='utf-8') as f:
        f.write(finance_component)
    page_content = page_content.replace(finance_match.group(0), "{activeTab === 'finance' && <FinanceTab />}")

# Grab Staff Tab
staff_regex = r"(\{activeTab === 'staff' && \(\s*)(<div className=\"animate-\[fadeIn_0\.5s_ease-out\]\">.*?</div>\s*</div>)(\s*\)\})"
staff_match = re.search(staff_regex, page_content, flags=re.DOTALL)
if staff_match:
    staff_jsx = staff_match.group(2)
    
    staff_component = f"""'use client';

import React from 'react';
import {{ PlusCircle, Wallet, UserCog, CheckCircle, BadgeDollarSign, Pencil, UserMinus }} from 'lucide-react';
import {{ useDashboard }} from '../context/DashboardContext';

export default function StaffTab() {{
    const {{ uiState, staffState, financeState }} = useDashboard();
    const {{ staffSubTab, setStaffSubTab, isAdvanceModalOpen, setIsAdvanceModalOpen, isStaffModalOpen }} = uiState;
    const {{ totalDailyPayout }} = financeState;
    const {{ 
        payrollData, staffDirectory, editingStaff, staffForm, advanceForm, setStaffForm, setAdvanceForm,
        openStaffModal, saveStaff, terminateStaff, settleWorkerPay, handleAddAdvance
    }} = staffState;

    return (
        {staff_jsx}
    );
}}
"""
    with open(os.path.join(out_dir, "StaffTab.tsx"), 'w', encoding='utf-8') as f:
        f.write(staff_component)
    page_content = page_content.replace(staff_match.group(0), "{activeTab === 'staff' && <StaffTab />}")

# Add imports to page.tsx
imports = """import OverviewTab from '@/components/admin/dashboard/tabs/OverviewTab';
import FinanceTab from '@/components/admin/dashboard/tabs/FinanceTab';
import StaffTab from '@/components/admin/dashboard/tabs/StaffTab';
"""
if "import OverviewTab" not in page_content:
    page_content = page_content.replace("import React, { useEffect, useState, useCallback, useRef } from 'react';", "import React, { useEffect, useState, useCallback, useRef } from 'react';\n" + imports)

with open(page_path, 'w', encoding='utf-8') as f:
    f.write(page_content)

print(f"Extracted: Overview={bool(overview_match)} Finance={bool(finance_match)} Staff={bool(staff_match)}")
