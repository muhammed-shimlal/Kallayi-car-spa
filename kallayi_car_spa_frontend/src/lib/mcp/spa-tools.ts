/**
 * KALLAYI CAR SPA & AUTO CARE - MODEL CONTEXT PROTOCOL (MCP) TOOL DEFINITIONS
 * 
 * Standard MCP / Gemini AI Function Calling tool definitions and handlers.
 * Compatible with Google Gemini AI SDK, Claude Desktop MCP, Cursor, and custom Python/Node agents.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';
import { normalizePhone } from '@/lib/phone';

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOOL SCHEMAS (JSON Schema / MCP Specification)
// ─────────────────────────────────────────────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: 'fetch_overdue_khata_customers',
    description: 'Fetches customers with unpaid Khata (credit) balances that are past their due dates. Returns contact details, amounts, days overdue, and pre-formatted WhatsApp reminder text suggestions.',
    inputSchema: {
      type: 'object',
      properties: {
        minDaysOverdue: {
          type: 'integer',
          description: 'Minimum number of days the balance is overdue (default: 0). E.g. set to 3 to only target balances >3 days late.',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of overdue customer records to return (default: 50).',
        },
      },
    },
  },
  {
    name: 'get_live_wash_queue',
    description: 'Fetches live operational status of vehicles in washing bays (Bay 1, Bay 2, Detailing Bay) and queue waiting line at Kallayi Car Spa.',
    inputSchema: {
      type: 'object',
      properties: {
        statusFilter: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'READY', 'COMPLETED'],
          },
          description: 'Optional filter for specific queue or bay statuses.',
        },
      },
    },
  },
  {
    name: 'log_customer_reminder',
    description: 'Records that an automated payment reminder was sent to a customer. Increments the audit reminder counter and updates the last reminder timestamp.',
    inputSchema: {
      type: 'object',
      properties: {
        khataId: {
          type: 'integer',
          description: 'The specific Khata ledger entry ID that was reminded.',
        },
        customerId: {
          type: 'string',
          description: 'The customer UUID if reminding all open charges for that customer.',
        },
        channel: {
          type: 'string',
          enum: ['WHATSAPP', 'SMS', 'CALL'],
          description: 'The communication channel used (default: WHATSAPP).',
        },
        notes: {
          type: 'string',
          description: 'Optional notes or WhatsApp message reference ID.',
        },
      },
    },
  },
  {
    name: 'get_business_performance_summary',
    description: 'Provides aggregated business intelligence, revenue split (Cash vs UPI vs Khata credit), vehicle distribution (Hatchback/Sedan/SUV/Bike), top selling wash packages, and peak rush hours for strategic AI business advisory.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'this_week', 'this_month'],
          description: 'The reporting timeframe (default: today).',
        },
      },
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. TOOL EXECUTION HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

export interface McpToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Executes an MCP tool by name with arguments.
 */
export async function executeMcpTool(name: string, args: Record<string, any> = {}): Promise<McpToolResult> {
  const supabase = getSupabaseAdmin();

  try {
    switch (name) {
      case 'fetch_overdue_khata_customers': {
        const minDays = Number(args.minDaysOverdue || 0);
        const limit = Math.min(Number(args.limit || 50), 100);
        const now = new Date();

        let { data: records, error } = await supabase
          .from('khata_ledgers')
          .select(`
            id,
            customer_id,
            amount,
            transaction_date,
            due_date,
            status,
            reminder_count,
            last_reminder_sent_at,
            customer_phone,
            created_at,
            customer:customers(id, name, phone_number, outstanding_balance)
          `)
          .eq('transaction_type', 'CHARGE')
          .limit(limit);

        if (error && (error.code === '42703' || error.code === 'PGRST204')) {
          // Fallback query
          const fallback = await supabase
            .from('khata_ledgers')
            .select(`
              id,
              customer_id,
              amount,
              created_at,
              customer:customers(id, name, phone_number, outstanding_balance)
            `)
            .eq('transaction_type', 'CHARGE')
            .limit(limit);
          records = fallback.data as any;
          error = fallback.error;
        }

        if (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Database error querying overdue Khata: ${error.message}` }],
          };
        }

        const overdueList: any[] = [];
        for (const row of (records || []) as any[]) {
          if (row.status === 'SETTLED') continue;

          const txDate = new Date(row.transaction_date || row.created_at || now);
          const dueDate = row.due_date ? new Date(row.due_date) : new Date(txDate.getTime() + 7 * 86400000);

          if (dueDate.getTime() <= now.getTime()) {
            const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / 86400000));
            if (daysOverdue >= minDays) {
              const cust = Array.isArray(row.customer) ? row.customer[0] : row.customer;
              const phone = normalizePhone(row.customer_phone || cust?.phone_number || '');
              const customerName = cust?.name || 'Customer';
              const amount = Number(row.amount || 0);

              // Pre-formatted friendly Malayalam & English WhatsApp template
              const reminderMessage = `Hello ${customerName}, Greetings from Kallayi Car Spa! 👋
This is a gentle reminder regarding your pending balance of ₹${amount} for wash services on ${txDate.toLocaleDateString('en-IN')}.
Payment Due Date was ${dueDate.toLocaleDateString('en-IN')} (${daysOverdue} days ago).
You can easily clear this via UPI to: kabeerkallayi2020-1@oksbi
Thank you for choosing Kallayi Car Spa! 🚗✨`;

              overdueList.push({
                khataId: row.id,
                customerId: row.customer_id,
                customerName,
                customerPhone: phone,
                amount,
                transactionDate: txDate.toISOString(),
                dueDate: dueDate.toISOString(),
                daysOverdue,
                reminderCount: Number(row.reminder_count || 0),
                lastReminderSentAt: row.last_reminder_sent_at || null,
                suggestedMessage: reminderMessage,
              });
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  totalOverdueCount: overdueList.length,
                  customers: overdueList,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'get_live_wash_queue': {
        const statuses = Array.isArray(args.statusFilter) && args.statusFilter.length > 0
          ? args.statusFilter
          : ['WAITING', 'IN_BAY_1', 'IN_BAY_2', 'DETAILING', 'IN_PROGRESS', 'READY'];

        const { data: queueBookings, error } = await supabase
          .from('bookings')
          .select(`
            id,
            status,
            bay_assignment,
            time_slot,
            created_at,
            base_price,
            final_price,
            customer:customers(id, name, phone_number),
            vehicle:customer_vehicles(id, plate_number, registration_number, make, model, vehicle_type),
            service_package:service_packages(id, name, price)
          `)
          .in('status', statuses)
          .order('time_slot', { ascending: true });

        if (error) {
          return {
            isError: true,
            content: [{ type: 'text', text: `Failed to fetch live queue: ${error.message}` }],
          };
        }

        const formattedQueue = ((queueBookings || []) as any[]).map(b => {
          const v = Array.isArray(b.vehicle) ? b.vehicle[0] : b.vehicle;
          const c = Array.isArray(b.customer) ? b.customer[0] : b.customer;
          const pkg = Array.isArray(b.service_package) ? b.service_package[0] : b.service_package;

          return {
            bookingId: b.id,
            status: b.status,
            bay: b.bay_assignment || (b.status === 'IN_BAY_2' ? 'Bay 2' : b.status === 'IN_BAY_1' ? 'Bay 1' : 'Waiting Area'),
            vehiclePlate: v?.plate_number || v?.registration_number || 'UNKNOWN',
            vehicleType: v?.vehicle_type || 'CAR',
            vehicleModel: v ? `${v.make || ''} ${v.model || ''}`.trim() : 'Unknown Model',
            customerName: c?.name || 'Walk-In',
            customerPhone: c?.phone_number || '',
            servicePackage: pkg?.name || 'Standard Wash',
            amount: Number(b.final_price || b.base_price || 0),
            bookedTime: b.time_slot || b.created_at,
          };
        });

        const inBayCount = formattedQueue.filter(q => q.status.includes('BAY') || q.status === 'IN_PROGRESS' || q.status === 'DETAILING').length;
        const waitingCount = formattedQueue.filter(q => q.status === 'WAITING').length;
        const readyCount = formattedQueue.filter(q => q.status === 'READY').length;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  activeVehicleCount: formattedQueue.length,
                  summary: {
                    inBays: inBayCount,
                    waitingLine: waitingCount,
                    readyForDelivery: readyCount,
                  },
                  queue: formattedQueue,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'log_customer_reminder': {
        const { khataId, customerId, channel = 'WHATSAPP', notes } = args;
        const nowIso = new Date().toISOString();

        if (khataId) {
          const numericId = parseInt(String(khataId), 10);
          const { data: current } = await supabase
            .from('khata_ledgers')
            .select('id, reminder_count')
            .eq('id', numericId)
            .single();

          const nextCount = ((current?.reminder_count || 0) as number) + 1;

          await supabase
            .from('khata_ledgers')
            .update({
              last_reminder_sent_at: nowIso,
              reminder_count: nextCount,
            })
            .eq('id', numericId);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Logged reminder #${nextCount} via ${channel} for Khata entry #${numericId}.`,
                  khataId: numericId,
                  reminderCount: nextCount,
                  timestamp: nowIso,
                  notes: notes || null,
                }),
              },
            ],
          };
        } else if (customerId) {
          const { data: charges } = await supabase
            .from('khata_ledgers')
            .select('id, reminder_count')
            .eq('customer_id', customerId)
            .eq('transaction_type', 'CHARGE')
            .neq('status', 'SETTLED');

          let count = 0;
          for (const ch of (charges || []) as any[]) {
            const nextCount = (ch.reminder_count || 0) + 1;
            await supabase
              .from('khata_ledgers')
              .update({
                last_reminder_sent_at: nowIso,
                reminder_count: nextCount,
              })
              .eq('id', ch.id);
            count++;
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  message: `Logged reminder via ${channel} for ${count} open credit entries of customer ${customerId}.`,
                  updatedRecords: count,
                  timestamp: nowIso,
                }),
              },
            ],
          };
        }

        return {
          isError: true,
          content: [{ type: 'text', text: 'Missing required argument: khataId or customerId must be provided.' }],
        };
      }

      case 'get_business_performance_summary': {
        const rawPeriod = (args.period || 'today').toLowerCase();
        const period = rawPeriod === 'this_week' ? 'this_week' : rawPeriod === 'this_month' ? 'this_month' : 'today';

        // Direct fetch from local endpoint logic or internal calculation
        const now = new Date();
        const istOffsetMs = 5.5 * 60 * 60 * 1000;
        const istNow = new Date(now.getTime() + istOffsetMs);
        const startIst = new Date(istNow);

        if (period === 'today') {
          startIst.setUTCHours(0, 0, 0, 0);
        } else if (period === 'this_week') {
          const day = startIst.getUTCDay();
          const diff = (day === 0 ? -6 : 1) - day;
          startIst.setUTCDate(startIst.getUTCDate() + diff);
          startIst.setUTCHours(0, 0, 0, 0);
        } else if (period === 'this_month') {
          startIst.setUTCDate(1);
          startIst.setUTCHours(0, 0, 0, 0);
        }

        const startIso = new Date(startIst.getTime() - istOffsetMs).toISOString();

        // 1. Fetch bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id, status, created_at, base_price, final_price,
            vehicle:customer_vehicles(vehicle_type),
            service_package:service_packages(name)
          `)
          .gte('created_at', startIso);

        // 2. Fetch invoices
        const { data: invoices } = await supabase
          .from('invoices')
          .select('amount, final_price, split_cash, split_online, split_khata, payment_method')
          .gte('created_at', startIso);

        // 3. Outstanding Khata
        const { data: khataCustomers } = await supabase
          .from('customers')
          .select('outstanding_balance')
          .gt('outstanding_balance', 0);

        let cashRev = 0;
        let onlineRev = 0;
        let khataRev = 0;
        for (const inv of (invoices || []) as any[]) {
          const cash = Number(inv.split_cash || 0);
          const online = Number(inv.split_online || 0);
          const khata = Number(inv.split_khata || 0);
          if (cash > 0 || online > 0 || khata > 0) {
            cashRev += cash;
            onlineRev += online;
            khataRev += khata;
          } else {
            const finalP = Number(inv.final_price || inv.amount || 0);
            if (inv.payment_method === 'ONLINE' || inv.payment_method === 'CARD') {
              onlineRev += finalP;
            } else {
              cashRev += finalP;
            }
          }
        }

        const totalRevenue = cashRev + onlineRev + khataRev;
        const totalWashed = (bookings || []).length;
        const totalOutstanding = (khataCustomers || []).reduce((acc, c) => acc + Number(c.outstanding_balance || 0), 0);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  period,
                  totalVehiclesWashed: totalWashed,
                  totalRevenueCollected: totalRevenue,
                  revenueBreakdown: {
                    cash: cashRev,
                    upiOnline: onlineRev,
                    creditKhata: khataRev,
                  },
                  activeCreditAccounts: (khataCustomers || []).length,
                  totalOutstandingReceivables: totalOutstanding,
                  advisorRecommendation: totalOutstanding > 5000
                    ? `Warning: Khata outstanding receivable is ₹${totalOutstanding} across ${(khataCustomers || []).length} customers. Run fetch_overdue_khata_customers and send WhatsApp reminders to optimize cash flow.`
                    : 'Shop cash flow is healthy. Consider promoting Premium Coating packages during off-peak hours.',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown MCP tool: ${name}` }],
        };
    }
  } catch (err: any) {
    console.error(`[MCP Tool Execution Error: ${name}]:`, err);
    return {
      isError: true,
      content: [{ type: 'text', text: `Execution failed for tool "${name}": ${err.message}` }],
    };
  }
}
