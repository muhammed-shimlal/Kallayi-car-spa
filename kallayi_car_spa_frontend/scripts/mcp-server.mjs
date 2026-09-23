#!/usr/bin/env node

/**
 * KALLAYI CAR SPA & AUTO CARE - MODEL CONTEXT PROTOCOL (MCP) STDIO SERVER
 * 
 * Implements the JSON-RPC 2.0 Model Context Protocol over stdio for Google Gemini AI,
 * Claude Desktop, Cursor, and custom AI agents.
 * 
 * Usage:
 *   node --env-file=.env.local scripts/mcp-server.mjs
 */

import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  process.stderr.write('❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

// Normalize Indian phone numbers
function normalizePhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  const tenDigit = digits.length >= 10 ? digits.slice(-10) : digits;
  if (/^[6-9]\d{9}$/.test(tenDigit)) {
    return `+91${tenDigit}`;
  }
  return String(raw).trim();
}

// MCP Tool Definitions
const TOOLS = [
  {
    name: 'fetch_overdue_khata_customers',
    description: 'Fetches customers with unpaid Khata (credit) balances that are past due date for WhatsApp reminders.',
    inputSchema: {
      type: 'object',
      properties: {
        minDaysOverdue: {
          type: 'integer',
          description: 'Minimum days overdue (default 0).',
        },
        limit: {
          type: 'integer',
          description: 'Maximum records to return (default 50).',
        },
      },
    },
  },
  {
    name: 'get_live_wash_queue',
    description: 'Fetches active vehicles in wash bays (Bay 1, Bay 2, Detailing) and queue line.',
    inputSchema: {
      type: 'object',
      properties: {
        statusFilter: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional filter of statuses (e.g. WAITING, IN_BAY_1, IN_BAY_2, READY).',
        },
      },
    },
  },
  {
    name: 'log_customer_reminder',
    description: 'Records that a WhatsApp reminder was sent to an overdue customer, incrementing reminder_count and updating last_reminder_sent_at.',
    inputSchema: {
      type: 'object',
      properties: {
        khataId: {
          type: 'integer',
          description: 'The Khata ledger ID to update.',
        },
        customerId: {
          type: 'string',
          description: 'The customer UUID if updating all open credit lines.',
        },
        channel: {
          type: 'string',
          description: 'Reminder channel (default: WHATSAPP).',
        },
      },
    },
  },
  {
    name: 'get_business_performance_summary',
    description: 'Aggregates business intelligence metrics: revenue split (Cash vs UPI vs Khata), vehicle breakdown, top service packages, and rush hours.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month'],
          description: 'Reporting timeframe.',
        },
      },
    },
  },
];

// Tool Handlers
async function handleToolCall(name, args = {}) {
  const now = new Date();

  switch (name) {
    case 'fetch_overdue_khata_customers': {
      const minDays = Number(args.minDaysOverdue || 0);
      const limit = Math.min(Number(args.limit || 50), 100);

      const { data: records, error } = await supabase
        .from('khata_ledgers')
        .select(`
          id, customer_id, amount, transaction_date, due_date, status,
          reminder_count, last_reminder_sent_at, customer_phone, created_at,
          customer:customers(id, name, phone_number, outstanding_balance)
        `)
        .eq('transaction_type', 'CHARGE')
        .limit(limit);

      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        // Fallback for unmigrated schema
        const fallback = await supabase
          .from('khata_ledgers')
          .select('id, customer_id, amount, created_at, customer:customers(id, name, phone_number)')
          .eq('transaction_type', 'CHARGE')
          .limit(limit);

        const list = (fallback.data || []).map(r => ({
          khataId: r.id,
          customerId: r.customer_id,
          customerName: r.customer?.name || 'Customer',
          customerPhone: normalizePhone(r.customer?.phone_number),
          amount: Number(r.amount),
          daysOverdue: 0,
        }));

        return { content: [{ type: 'text', text: JSON.stringify({ total: list.length, customers: list }, null, 2) }] };
      }

      if (error) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }

      const overdueList = [];
      for (const row of (records || [])) {
        if (row.status === 'SETTLED') continue;
        const txDate = new Date(row.transaction_date || row.created_at || now);
        const dueDate = row.due_date ? new Date(row.due_date) : new Date(txDate.getTime() + 7 * 86400000);

        if (dueDate.getTime() <= now.getTime()) {
          const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
          if (daysOverdue >= minDays) {
            const cust = Array.isArray(row.customer) ? row.customer[0] : row.customer;
            overdueList.push({
              khataId: row.id,
              customerId: row.customer_id,
              customerName: cust?.name || 'Valued Customer',
              customerPhone: normalizePhone(row.customer_phone || cust?.phone_number),
              amount: Number(row.amount || 0),
              transactionDate: txDate.toISOString(),
              dueDate: dueDate.toISOString(),
              daysOverdue,
              reminderCount: Number(row.reminder_count || 0),
              lastReminderSentAt: row.last_reminder_sent_at || null,
            });
          }
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ count: overdueList.length, records: overdueList }, null, 2) }]
      };
    }

    case 'get_live_wash_queue': {
      const statuses = Array.isArray(args.statusFilter) && args.statusFilter.length > 0
        ? args.statusFilter
        : ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'READY'];

      const { data: queueBookings, error } = await supabase
        .from('bookings')
        .select(`
          id, status, bay_assignment, time_slot, created_at, base_price, final_price,
          customer:customers(name, phone_number),
          vehicle:customer_vehicles(plate_number, registration_number, vehicle_type),
          service_package:service_packages(name)
        `)
        .in('status', statuses)
        .order('time_slot', { ascending: true });

      if (error) {
        return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
      }

      const queue = (queueBookings || []).map(b => ({
        bookingId: b.id,
        status: b.status,
        bay: b.bay_assignment || b.status,
        plate: b.vehicle?.plate_number || b.vehicle?.registration_number || 'UNKNOWN',
        customer: b.customer?.name || 'Walk-In',
        service: b.service_package?.name || 'Wash',
        amount: Number(b.final_price || b.base_price || 0),
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify({ activeCount: queue.length, queue }, null, 2) }]
      };
    }

    case 'log_customer_reminder': {
      const { khataId, customerId, channel = 'WHATSAPP' } = args;
      const nowIso = new Date().toISOString();

      if (khataId) {
        const idNum = parseInt(String(khataId), 10);
        const { data: cur } = await supabase.from('khata_ledgers').select('reminder_count').eq('id', idNum).single();
        const next = ((cur?.reminder_count || 0)) + 1;

        await supabase.from('khata_ledgers').update({
          last_reminder_sent_at: nowIso,
          reminder_count: next,
        }).eq('id', idNum);

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, khataId: idNum, reminderCount: next, timestamp: nowIso }) }]
        };
      } else if (customerId) {
        const { data: openCharges } = await supabase.from('khata_ledgers').select('id, reminder_count').eq('customer_id', customerId).neq('status', 'SETTLED');
        for (const c of (openCharges || [])) {
          await supabase.from('khata_ledgers').update({
            last_reminder_sent_at: nowIso,
            reminder_count: (c.reminder_count || 0) + 1,
          }).eq('id', c.id);
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, customerId, updatedEntries: (openCharges || []).length }) }]
        };
      }

      return { isError: true, content: [{ type: 'text', text: 'khataId or customerId required' }] };
    }

    case 'get_business_performance_summary': {
      const period = args.period || 'today';
      const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);
      const startIst = new Date(istNow);

      if (period === 'today') {
        startIst.setUTCHours(0, 0, 0, 0);
      } else if (period === 'this_week') {
        const day = startIst.getUTCDay();
        startIst.setUTCDate(startIst.getUTCDate() + (day === 0 ? -6 : 1) - day);
        startIst.setUTCHours(0, 0, 0, 0);
      } else {
        startIst.setUTCDate(1);
        startIst.setUTCHours(0, 0, 0, 0);
      }

      const startIso = new Date(startIst.getTime() - 5.5 * 3600 * 1000).toISOString();

      const { data: bookings } = await supabase.from('bookings').select('id, base_price, final_price, status').gte('created_at', startIso);
      const { data: invoices } = await supabase.from('invoices').select('final_price, split_cash, split_online, split_khata, payment_method').gte('created_at', startIso);
      const { data: khataCusts } = await supabase.from('customers').select('outstanding_balance').gt('outstanding_balance', 0);

      let cash = 0, online = 0, credit = 0;
      for (const inv of (invoices || [])) {
        cash += Number(inv.split_cash || 0);
        online += Number(inv.split_online || 0);
        credit += Number(inv.split_khata || 0);
      }

      const totalReceivable = (khataCusts || []).reduce((acc, c) => acc + Number(c.outstanding_balance || 0), 0);

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            period,
            totalVehiclesWashed: (bookings || []).length,
            revenueSplit: { cash, online, credit, total: cash + online + credit },
            khataOutstanding: { customerCount: (khataCusts || []).length, totalAmount: totalReceivable }
          }, null, 2)
        }]
      };
    }

    default:
      return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
  }
}

// JSON-RPC 2.0 stdio loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const request = JSON.parse(line);
    const { id, method, params } = request;

    if (method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'kallayi-car-spa-mcp',
            version: '1.0.0',
          },
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (method === 'notifications/initialized') {
      // No response needed for notification
    } else if (method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (method === 'tools/call') {
      const { name, arguments: toolArgs } = params || {};
      const result = await handleToolCall(name, toolArgs);
      const response = {
        jsonrpc: '2.0',
        id,
        result,
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (method === 'ping') {
      process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result: {} }) + '\n');
    } else {
      process.stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` }
      }) + '\n');
    }
  } catch (err) {
    process.stderr.write(`[MCP Error]: ${err.message}\n`);
  }
});

process.stderr.write('🚀 Kallayi Car Spa MCP Server is running over stdio.\n');
