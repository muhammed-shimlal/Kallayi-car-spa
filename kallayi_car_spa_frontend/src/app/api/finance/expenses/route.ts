/**
 * KALLAYI CAR SPA & AUTO CARE - FINANCE EXPENSES API ROUTE
 * Next.js 16 Route Handler: GET /api/finance/expenses & POST /api/finance/expenses
 * Manages general shop expenses, staff advances/deductions, receipt file uploads, and custom categories.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { ExpenseType, ExpenseStatus, PaymentMethod, ExpenseTransactionType } from '@/types/database';
import { uploadFileToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);

    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const expenseType = searchParams.get('expense_type') as ExpenseType | null;
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status') as ExpenseStatus | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let query = supabase
      .from('general_expenses')
      .select(`
        *,
        category:expense_categories(id, name, description)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (date) {
      query = query.eq('date', date);
    } else {
      if (startDate) query = query.gte('date', startDate);
      if (endDate) query = query.lte('date', endDate);
    }

    if (expenseType) {
      query = query.eq('expense_type', expenseType);
    }

    if (categoryId) {
      const parsedCatId = parseInt(categoryId, 10);
      if (!isNaN(parsedCatId)) {
        query = query.eq('category_id', parsedCatId);
      }
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: expenses, error } = await query;

    if (error) {
      console.error('[Expense Fetch Error]:', error);
      return NextResponse.json(
        { success: false, error: `Database error: ${error.message}` },
        { status: 500 }
      );
    }

    const list = expenses || [];
    const totalAmount = list.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    return NextResponse.json({
      success: true,
      count: list.length,
      total_amount: Math.round(totalAmount * 100) / 100,
      data: list,
    });
  } catch (err: unknown) {
    console.error('[Expense GET Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    let payload: any = {};
    let receiptFile: File | Blob | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (key === 'receipt_image' || key === 'file' || key === 'receipt') {
          if (typeof value === 'object' && value && 'size' in value && (value as any).size > 0) {
            receiptFile = value as unknown as File;
          } else if (typeof value === 'string' && value.trim() !== '') {
            payload[key] = value;
          }
        } else {
          payload[key] = value;
        }
      });
    } else {
      payload = await request.json().catch(() => ({}));
    }

    const {
      category_id,
      category,
      category_name,
      custom_category,
      expense_type = 'BUSINESS',
      transaction_type = null,
      payment_method = 'CASH',
      staff_id = null,
      amount,
      description = '',
      notes = '',
      date,
      receipt_image = null,
      recorded_by_id = null,
      status = 'APPROVED',
    } = payload;

    const numericAmount = parseFloat(String(amount ?? 0));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Expense amount must be a positive number.' },
        { status: 400 }
      );
    }

    // 1. Resolve category_id safely
    let finalCategoryId: number | null = null;
    const rawCat = (category_id !== undefined && category_id !== '' && category_id !== 'null')
      ? category_id
      : (category !== undefined && category !== '' && category !== 'null' ? category : null);

    if (rawCat !== null && rawCat !== undefined) {
      const parsed = parseInt(String(rawCat), 10);
      if (!isNaN(parsed) && parsed > 0) {
        finalCategoryId = parsed;
      }
    }

    // Handle Custom Category creation (if "OTHER" selected or custom_category/category_name supplied)
    const rawCatName = custom_category || category_name || (
      rawCat && isNaN(Number(rawCat)) && typeof rawCat === 'string' && rawCat !== 'OTHER' ? rawCat : null
    );

    if (rawCatName && String(rawCatName).trim() !== '') {
      const trimmedName = String(rawCatName).trim();
      const { data: existingCat } = await supabase
        .from('expense_categories')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const { data: newCat } = await supabase
          .from('expense_categories')
          .insert({
            name: trimmedName,
            description: 'Custom category created via Expense Manager',
          })
          .select('id')
          .single();

        if (newCat) {
          finalCategoryId = newCat.id;
        }
      }
    }

    // 2. Handle Receipt Image Upload to Supabase Storage
    let finalReceiptImage: string | null = null;

    if (receiptFile) {
      try {
        finalReceiptImage = await uploadFileToStorage(receiptFile, 'receipts');
      } catch (uploadErr: any) {
        console.warn('[Receipt Upload Warning]:', uploadErr.message);
      }
    } else if (typeof receipt_image === 'string') {
      const trimmed = receipt_image.trim();
      if (trimmed !== '' && trimmed !== '[object File]' && trimmed !== 'null' && trimmed !== 'undefined') {
        finalReceiptImage = trimmed;
      }
    }

    // 3. Sanitize fields
    const sanitizedStaffId = typeof staff_id === 'string' && staff_id.trim() !== '' && staff_id.trim() !== 'null' && staff_id.trim() !== 'undefined'
      ? staff_id.trim()
      : null;

    const sanitizedRecordedById = typeof recorded_by_id === 'string' && recorded_by_id.trim() !== '' && recorded_by_id.trim() !== 'null' && recorded_by_id.trim() !== 'undefined'
      ? recorded_by_id.trim()
      : null;

    const finalDate = date && String(date).trim() !== ''
      ? String(date).trim()
      : new Date().toISOString().split('T')[0];

    const finalExpenseType: ExpenseType = (expense_type === 'STAFF' || expense_type === 'BUSINESS')
      ? expense_type
      : 'BUSINESS';

    const validTransactionTypes = ['ADVANCE', 'DEDUCTION', 'BONUS', 'REIMBURSEMENT', 'INCENTIVE'];
    const finalTransactionType: ExpenseTransactionType | null = validTransactionTypes.includes(transaction_type)
      ? transaction_type
      : null;

    const validPaymentMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'];
    const finalPaymentMethod: PaymentMethod = validPaymentMethods.includes(payment_method)
      ? payment_method
      : 'CASH';

    const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
    const finalStatus: ExpenseStatus = validStatuses.includes(status)
      ? status
      : 'APPROVED';

    const finalDescription = description !== undefined && description !== null ? String(description).trim() : '';
    const finalNotes = notes !== undefined && notes !== null ? String(notes).trim() : '';

    // 4. Insert Expense into Database
    const { data: newExpense, error: insertErr } = await supabase
      .from('general_expenses')
      .insert({
        category_id: finalCategoryId,
        expense_type: finalExpenseType,
        transaction_type: finalTransactionType,
        payment_method: finalPaymentMethod,
        staff_id: sanitizedStaffId,
        amount: Math.round(numericAmount * 100) / 100,
        description: finalDescription,
        notes: finalNotes,
        date: finalDate,
        receipt_image: finalReceiptImage,
        recorded_by_id: sanitizedRecordedById,
        status: finalStatus,
      })
      .select(`
        *,
        category:expense_categories(id, name, description)
      `)
      .single();

    if (insertErr || !newExpense) {
      console.error('[Expense Insert Error]:', insertErr);
      return NextResponse.json(
        { success: false, error: insertErr?.message || 'Failed to record expense.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense recorded successfully.',
      data: newExpense,
      ...newExpense,
    });
  } catch (err: unknown) {
    console.error('[Expense Insert Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
