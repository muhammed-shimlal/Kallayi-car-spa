/**
 * KALLAYI CAR SPA & AUTO CARE - BANK MANAGEMENT & BALANCE TRACKING API
 * Next.js 16 Route Handler: GET & POST /api/finance/bank
 * Manages bank deposits, cash withdrawals, and real-time net balance calculations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getAuthUserFromRequest } from '@/lib/supabaseServer';
import { uploadFileToStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/finance/bank
 * Computes live Net Balance, Total Deposited, Total Withdrawn, and transaction history.
 */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // 1. Query bank_transactions table
    let transactions: any[] = [];
    let isLegacyFallback = false;

    const { data: bankTxns, error: bankErr } = await supabase
      .from('bank_transactions')
      .select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (bankErr) {
      console.warn('[Bank API Warning]: bank_transactions query failed or not yet migrated, trying collection_banks fallback:', bankErr.message);
      // Fallback to legacy collection_banks if bank_transactions is not yet migrated in Supabase
      const { data: legacyDeposits, error: legacyErr } = await supabase
        .from('collection_banks')
        .select('*')
        .order('date', { ascending: false });

      if (legacyErr) {
        console.error('[Bank API Error]: Both bank_transactions and collection_banks failed:', legacyErr);
        return NextResponse.json(
          { success: false, error: `Failed to load bank records: ${bankErr.message}` },
          { status: 500 }
        );
      }

      isLegacyFallback = true;
      transactions = [];
      (legacyDeposits || []).forEach((item) => {
        const rawNotes = String(item.notes || '');
        if (rawNotes.includes(' | ')) {
          const parts = rawNotes.split(' | ');
          parts.forEach((part, pIdx) => {
            const cleanPart = part.trim();
            if (!cleanPart) return;

            const match = cleanPart.match(/^\[(DEPOSIT|WITHDRAWAL)(?::([0-9.]+))?(?::([^\]]+))?\]\s*(.*)$/);
            if (match) {
              const isWithdrawal = match[1] === 'WITHDRAWAL';
              const parsedAmt = match[2] ? parseFloat(match[2]) : (Number(item.amount || 0) / parts.length);
              const parsedRef = match[3] ? match[3].trim() : null;
              const parsedPurpose = match[4]?.trim() || (isWithdrawal ? 'Cash Withdrawal' : 'Daily Reserved Savings Deposit');

              transactions.push({
                id: `${item.id}-${pIdx}`,
                amount: Math.round(parsedAmt * 100) / 100,
                transaction_type: isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
                bank_name: 'Primary Bank Account',
                purpose: parsedPurpose,
                reference_number: parsedRef,
                receipt_image: null,
                recorded_by_id: item.recorded_by_id,
                recorded_by_name: 'Admin Manager',
                transaction_date: item.date ? `${item.date}T10:00:00.000Z` : item.created_at,
                created_at: item.created_at,
              });
            } else {
              const isWithdrawal = cleanPart.includes('[WITHDRAWAL]');
              const refMatch = cleanPart.match(/\(Ref:\s*([^)]+)\)/i);
              const cleanPurpose = cleanPart
                .replace(/^\[(DEPOSIT|WITHDRAWAL)\]\s*/, '')
                .replace(/\(Ref:\s*[^)]+\)/i, '')
                .trim() || (isWithdrawal ? 'Cash Withdrawal' : 'Daily Reserved Savings Deposit');

              transactions.push({
                id: `${item.id}-${pIdx}`,
                amount: Math.round((Number(item.amount || 0) / parts.length) * 100) / 100,
                transaction_type: isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
                bank_name: 'Primary Bank Account',
                purpose: cleanPurpose,
                reference_number: refMatch ? refMatch[1].trim() : null,
                receipt_image: null,
                recorded_by_id: item.recorded_by_id,
                recorded_by_name: 'Admin Manager',
                transaction_date: item.date ? `${item.date}T10:00:00.000Z` : item.created_at,
                created_at: item.created_at,
              });
            }
          });
        } else {
          const cleanPart = rawNotes.trim();
          const match = cleanPart.match(/^\[(DEPOSIT|WITHDRAWAL)(?::([0-9.]+))?(?::([^\]]+))?\]\s*(.*)$/);
          if (match) {
            const isWithdrawal = match[1] === 'WITHDRAWAL';
            const parsedAmt = match[2] ? parseFloat(match[2]) : Number(item.amount || 0);
            const parsedRef = match[3] ? match[3].trim() : null;
            const parsedPurpose = match[4]?.trim() || (isWithdrawal ? 'Cash Withdrawal' : 'Daily Reserved Savings Deposit');

            transactions.push({
              id: item.id,
              amount: Math.round(parsedAmt * 100) / 100,
              transaction_type: isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
              bank_name: 'Primary Bank Account',
              purpose: parsedPurpose,
              reference_number: parsedRef,
              receipt_image: null,
              recorded_by_id: item.recorded_by_id,
              recorded_by_name: 'Admin Manager',
              transaction_date: item.date ? `${item.date}T10:00:00.000Z` : item.created_at,
              created_at: item.created_at,
            });
          } else {
            const isWithdrawal = cleanPart.includes('[WITHDRAWAL]');
            const refMatch = cleanPart.match(/\(Ref:\s*([^)]+)\)/i);
            const cleanPurpose = cleanPart
              .replace(/^\[(DEPOSIT|WITHDRAWAL)\]\s*/, '')
              .replace(/\(Ref:\s*[^)]+\)/i, '')
              .trim() || (isWithdrawal ? 'Cash Withdrawal' : 'Daily Reserved Savings Deposit');

            transactions.push({
              id: item.id,
              amount: Number(item.amount || 0),
              transaction_type: isWithdrawal ? 'WITHDRAWAL' : 'DEPOSIT',
              bank_name: 'Primary Bank Account',
              purpose: cleanPurpose,
              reference_number: refMatch ? refMatch[1].trim() : null,
              receipt_image: null,
              recorded_by_id: item.recorded_by_id,
              recorded_by_name: 'Admin Manager',
              transaction_date: item.date ? `${item.date}T10:00:00.000Z` : item.created_at,
              created_at: item.created_at,
            });
          }
        }
      });
    } else {
      transactions = bankTxns || [];
    }

    // 2. Aggregate metrics
    const todayStr = new Date().toISOString().split('T')[0];

    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let todayDeposited = 0;
    let todayWithdrawn = 0;

    const formattedHistory = transactions.map((t) => {
      const amt = Number(t.amount || 0);
      const isDeposit = String(t.transaction_type || '').toUpperCase() === 'DEPOSIT';
      const txnDateStr = t.transaction_date ? String(t.transaction_date).split('T')[0] : '';

      if (isDeposit) {
        totalDeposited += amt;
        if (txnDateStr === todayStr) todayDeposited += amt;
      } else {
        totalWithdrawn += amt;
        if (txnDateStr === todayStr) todayWithdrawn += amt;
      }

      return {
        id: t.id,
        amount: amt,
        transaction_type: isDeposit ? 'DEPOSIT' : 'WITHDRAWAL',
        bank_name: t.bank_name || 'Primary Bank Account',
        purpose: t.purpose || (isDeposit ? 'Cash Deposit' : 'Cash Withdrawal'),
        reference_number: t.reference_number || null,
        receipt_image: t.receipt_image || null,
        recorded_by_id: t.recorded_by_id || null,
        recorded_by_name: t.recorded_by_name || 'Admin Manager',
        transaction_date: t.transaction_date || t.created_at,
        created_at: t.created_at,
      };
    });

    const currentBalance = Math.round((totalDeposited - totalWithdrawn) * 100) / 100;

    const summary = {
      current_balance: currentBalance,
      net_balance: currentBalance,
      total_deposited: Math.round(totalDeposited * 100) / 100,
      total_withdrawn: Math.round(totalWithdrawn * 100) / 100,
      today_deposited: Math.round(todayDeposited * 100) / 100,
      today_withdrawn: Math.round(todayWithdrawn * 100) / 100,
      transaction_count: formattedHistory.length,
      is_legacy_fallback: isLegacyFallback,
    };

    return NextResponse.json({
      success: true,
      summary,
      transactions: formattedHistory,
      data: formattedHistory,
      history: formattedHistory, // Backward compatibility
      total_deposited: summary.total_deposited,
      total_withdrawn: summary.total_withdrawn,
      current_balance: summary.current_balance,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Bank GET API Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/finance/bank
 * Records either a DEPOSIT or WITHDRAWAL with optional slip image upload.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required to manage bank transactions.' },
        { status: 401 }
      );
    }
    const role = (user.role || (user as any).user_metadata?.role || '').toUpperCase();
    if (role === 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient privileges for banking operations.' },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const contentType = request.headers.get('content-type') || '';

    let amount = 0;
    let transaction_type: 'DEPOSIT' | 'WITHDRAWAL' = 'DEPOSIT';
    let bank_name = 'Primary Bank Account';
    let purpose = '';
    let reference_number: string | null = null;
    let transaction_date = new Date().toISOString();
    let slipFile: File | null = null;
    let receipt_image: string | null = null;

    // Handle Multipart Form Data or JSON
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      amount = parseFloat(String(formData.get('amount') || '0'));
      const rawType = String(formData.get('transaction_type') || formData.get('type') || 'DEPOSIT').toUpperCase();
      transaction_type = rawType === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT';
      bank_name = String(formData.get('bank_name') || 'Primary Bank Account').trim();
      purpose = String(formData.get('purpose') || formData.get('notes') || '').trim();
      reference_number = formData.get('reference_number') ? String(formData.get('reference_number')).trim() : null;
      if (formData.get('transaction_date')) {
        transaction_date = String(formData.get('transaction_date'));
      }

      const fileEntry = formData.get('receipt_image') || formData.get('slip_image') || formData.get('file');
      if (fileEntry && fileEntry instanceof File && fileEntry.size > 0) {
        slipFile = fileEntry;
      }
    } else {
      const body = await request.json();
      amount = parseFloat(String(body.amount || '0'));
      const rawType = String(body.transaction_type || body.type || 'DEPOSIT').toUpperCase();
      transaction_type = rawType === 'WITHDRAWAL' ? 'WITHDRAWAL' : 'DEPOSIT';
      bank_name = String(body.bank_name || 'Primary Bank Account').trim();
      purpose = String(body.purpose || body.notes || '').trim();
      reference_number = body.reference_number ? String(body.reference_number).trim() : null;
      receipt_image = body.receipt_image || null;
      if (body.transaction_date) {
        transaction_date = String(body.transaction_date);
      }
    }

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Transaction amount must be a positive number greater than zero.' },
        { status: 400 }
      );
    }

    // Default purpose if blank
    if (!purpose) {
      purpose = transaction_type === 'DEPOSIT' ? 'Cash Bank Deposit' : 'Cash Bank Withdrawal';
    }

    // Upload receipt/slip photo if attached
    if (slipFile) {
      try {
        receipt_image = await uploadFileToStorage(slipFile, 'bank-slips');
      } catch (uploadErr) {
        console.warn('[Bank Slip Upload Warning]:', uploadErr);
      }
    }

    // Resolve current user name & ID if available
    let recordedById: string | null = null;
    let recordedByName = 'Admin Manager';
    try {
      const authUser = await getAuthUserFromRequest(request);
      if (authUser) {
        recordedById = authUser.id;
        const meta = authUser.user_metadata || {};
        recordedByName = meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Admin Manager';
      }
    } catch {
      // Fallback to default
    }

    const newRecord = {
      amount: Math.round(amount * 100) / 100,
      transaction_type,
      bank_name,
      purpose,
      reference_number,
      receipt_image,
      recorded_by_id: recordedById,
      recorded_by_name: recordedByName,
      transaction_date,
    };

    // 1. Insert into bank_transactions table
    let insertedTransaction: any = null;
    const { data: inserted, error: insertErr } = await supabase
      .from('bank_transactions')
      .insert(newRecord)
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('[Bank Insert Warning]: bank_transactions table not available, using collection_banks:', insertErr.message);
      // Fallback: If bank_transactions table doesn't exist yet, insert/update in collection_banks
      const dateOnly = transaction_date.split('T')[0];
      const entryNote = `[${transaction_type}:${amount.toFixed(2)}${reference_number ? `:${reference_number}` : ''}] ${purpose}`;

      const { data: existingDateRow } = await supabase
        .from('collection_banks')
        .select('id, amount, notes')
        .eq('date', dateOnly)
        .maybeSingle();

      if (existingDateRow) {
        const currentAmt = Number(existingDateRow.amount || 0);
        const updatedAmt = transaction_type === 'DEPOSIT'
          ? currentAmt + amount
          : Math.max(0, currentAmt - amount);

        const { data: updatedLegacy, error: updateErr } = await supabase
          .from('collection_banks')
          .update({
            amount: Math.round(updatedAmt * 100) / 100,
            notes: `${existingDateRow.notes ? existingDateRow.notes + ' | ' : ''}${entryNote}`,
          })
          .eq('id', existingDateRow.id)
          .select()
          .maybeSingle();

        if (updateErr) {
          return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 });
        }
        insertedTransaction = {
          id: existingDateRow.id,
          ...newRecord,
          created_at: new Date().toISOString(),
        };
      } else {
        const { data: legacyInserted, error: legacyInsertErr } = await supabase
          .from('collection_banks')
          .insert({
            amount: Math.round(amount * 100) / 100,
            date: dateOnly,
            notes: entryNote,
            recorded_by_id: recordedById,
          })
          .select()
          .maybeSingle();

        if (legacyInsertErr) {
          return NextResponse.json(
            { success: false, error: `Failed to record transaction: ${legacyInsertErr.message}` },
            { status: 500 }
          );
        }

        insertedTransaction = {
          id: legacyInserted?.id || Date.now(),
          ...newRecord,
          created_at: legacyInserted?.created_at || new Date().toISOString(),
        };
      }
    } else {
      insertedTransaction = inserted;

      // 2. If DEPOSIT, also mirror into legacy collection_banks so overview KPIs never break
      if (transaction_type === 'DEPOSIT') {
        const dateOnly = transaction_date.split('T')[0];
        try {
          const { data: existingDate } = await supabase
            .from('collection_banks')
            .select('id, amount, notes')
            .eq('date', dateOnly)
            .maybeSingle();

          if (existingDate) {
            const updatedAmt = Number(existingDate.amount || 0) + Number(amount);
            await supabase
              .from('collection_banks')
              .update({
                amount: Math.round(updatedAmt * 100) / 100,
                notes: `${existingDate.notes ? existingDate.notes + ' | ' : ''}${purpose}`,
              })
              .eq('id', existingDate.id);
          } else {
            await supabase.from('collection_banks').insert({
              date: dateOnly,
              amount: Math.round(amount * 100) / 100,
              notes: purpose,
              recorded_by_id: recordedById,
            });
          }
        } catch (mirrorErr) {
          console.warn('[Collection Bank Mirroring Notice]:', mirrorErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${transaction_type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} of ₹${amount.toFixed(2)} recorded successfully.`,
      transaction: insertedTransaction,
      data: insertedTransaction,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[Bank POST API Exception]:', err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
