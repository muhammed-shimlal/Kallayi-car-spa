/**
 * KALLAYI CAR SPA & AUTO CARE - INDIVIDUAL EXPENSE API ROUTE
 * Next.js 16 Route Handler: GET, PUT, PATCH, DELETE /api/finance/expenses/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { GeneralExpenseRow, ExpenseType, ExpenseStatus, PaymentMethod, ExpenseTransactionType } from '@/types/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const expenseId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(expenseId)) {
      return NextResponse.json({ success: false, error: 'Invalid expense ID.' }, { status: 400 });
    }

    const { data: expense, error } = await supabase
      .from('general_expenses')
      .select(`
        *,
        category:expense_categories(id, name, description)
      `)
      .eq('id', expenseId)
      .single();

    if (error || !expense) {
      return NextResponse.json({ success: false, error: 'Expense not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: expense, ...expense });
  } catch (err: unknown) {
    console.error('[Expense GET ID Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateExpense(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return handleUpdateExpense(request, context);
}

async function handleUpdateExpense(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const expenseId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(expenseId)) {
      return NextResponse.json({ success: false, error: 'Invalid expense ID.' }, { status: 400 });
    }

    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        body[key] = value;
      });
    } else {
      body = await request.json().catch(() => ({}));
    }

    const {
      category_id,
      category,
      category_name,
      expense_type,
      transaction_type,
      payment_method,
      staff_id,
      amount,
      description,
      notes,
      date,
      receipt_image,
      status,
      approved_by_id,
    } = body;

    const updates: Partial<GeneralExpenseRow> = {};

    if (amount !== undefined && amount !== null && amount !== '') {
      const numericAmount = parseFloat(String(amount));
      if (!isNaN(numericAmount) && numericAmount > 0) {
        updates.amount = Math.round(numericAmount * 100) / 100;
      }
    }

    if (description !== undefined) updates.description = String(description).trim();
    if (notes !== undefined) updates.notes = String(notes || '').trim();
    if (date !== undefined && date !== null && String(date).trim() !== '') {
      updates.date = String(date).trim();
    }
    if (receipt_image !== undefined) {
      if (typeof receipt_image === 'string') {
        const trimmed = receipt_image.trim();
        updates.receipt_image = (trimmed !== '' && trimmed !== '[object File]' && trimmed !== 'null' && trimmed !== 'undefined') ? trimmed : null;
      } else {
        updates.receipt_image = null;
      }
    }
    if (status !== undefined) {
      const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
      if (validStatuses.includes(status)) updates.status = status as ExpenseStatus;
    }
    if (expense_type !== undefined) {
      if (expense_type === 'BUSINESS' || expense_type === 'STAFF') {
        updates.expense_type = expense_type as ExpenseType;
      }
    }
    if (transaction_type !== undefined) {
      const validTx = ['ADVANCE', 'DEDUCTION', 'BONUS', 'REIMBURSEMENT', 'INCENTIVE'];
      updates.transaction_type = validTx.includes(transaction_type) ? (transaction_type as ExpenseTransactionType) : null;
    }
    if (payment_method !== undefined) {
      const validPm = ['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE'];
      if (validPm.includes(payment_method)) updates.payment_method = payment_method as PaymentMethod;
    }
    if (staff_id !== undefined) {
      updates.staff_id = (typeof staff_id === 'string' && staff_id.trim() !== '' && staff_id.trim() !== 'null' && staff_id.trim() !== 'undefined') ? staff_id.trim() : null;
    }
    if (approved_by_id !== undefined) {
      updates.approved_by_id = (typeof approved_by_id === 'string' && approved_by_id.trim() !== '' && approved_by_id.trim() !== 'null' && approved_by_id.trim() !== 'undefined') ? approved_by_id.trim() : null;
    }

    const rawCategory = (category_id !== undefined && category_id !== '' && category_id !== 'null')
      ? category_id
      : (category !== undefined && category !== '' && category !== 'null' ? category : null);

    if (rawCategory !== undefined) {
      if (rawCategory === null) {
        updates.category_id = null;
      } else {
        const parsedCatId = parseInt(String(rawCategory), 10);
        if (!isNaN(parsedCatId)) {
          updates.category_id = parsedCatId;
        } else if (category_name && String(category_name).trim() !== '') {
          const trimmedName = String(category_name).trim();
          const { data: existingCat } = await supabase
            .from('expense_categories')
            .select('id')
            .ilike('name', trimmedName)
            .maybeSingle();

          if (existingCat) {
            updates.category_id = existingCat.id;
          } else {
            const { data: newCat } = await supabase
              .from('expense_categories')
              .insert({ name: trimmedName, description: 'Created via Expenses Edit' })
              .select('id')
              .single();
            if (newCat) updates.category_id = newCat.id;
          }
        }
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('general_expenses')
      .update(updates)
      .eq('id', expenseId)
      .select(`
        *,
        category:expense_categories(id, name, description)
      `)
      .single();

    if (updateErr || !updated) {
      console.error('[Expense Update Error]:', updateErr);
      return NextResponse.json(
        { success: false, error: updateErr?.message || 'Failed to update expense.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully.',
      data: updated,
      ...updated,
    });
  } catch (err: unknown) {
    console.error('[Expense Update Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const expenseId = parseInt(id, 10);
    const supabase = getSupabaseAdmin();

    if (isNaN(expenseId)) {
      return NextResponse.json({ success: false, error: 'Invalid expense ID.' }, { status: 400 });
    }

    const { error: delErr } = await supabase
      .from('general_expenses')
      .delete()
      .eq('id', expenseId);

    if (delErr) {
      console.error('[Expense Delete Error]:', delErr);
      return NextResponse.json(
        { success: false, error: `Failed to delete expense: ${delErr.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully.',
    });
  } catch (err: unknown) {
    console.error('[Expense DELETE Error]:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
