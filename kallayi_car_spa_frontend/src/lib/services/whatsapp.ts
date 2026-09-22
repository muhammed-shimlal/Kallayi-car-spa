/**
 * KALLAYI CAR SPA & AUTO CARE - WHATSAPP NOTIFICATION SERVICE
 * Server-side WhatsApp notification dispatcher with Strict Output Verification Guard.
 * Dispatches to Node.js whatsapp-bridge and logs every interaction into Supabase.
 */

import { getSupabaseAdmin } from '@/lib/supabaseServer';

export interface WhatsAppVerificationInput {
  phone: string;
  bookingId?: number | null;
  invoiceId?: number | null;
  amount?: number | null;
  customerName?: string | null;
}

export interface WhatsAppVerificationResult {
  isValid: boolean;
  sanitizedPhone: string;
  error?: string;
}

import {
  extractTenDigitPhone,
  normalizePhone,
  getPhoneVariants as getUnifiedPhoneVariants,
  isValidIndianMobile,
} from '@/lib/phone';

export {
  extractTenDigitPhone,
  normalizePhone,
  isValidIndianMobile,
};

/**
 * Sanitizes and standardizes phone number to standard digits with 91 prefix.
 * e.g. 9847123456 -> 919847123456
 */
export function sanitizePhoneNumber(rawPhone: string): string {
  if (!rawPhone) return '';
  const tenDigit = extractTenDigitPhone(rawPhone);
  if (tenDigit) {
    return `91${tenDigit}`;
  }
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.substring(1)}`;
  }
  return digits;
}

/**
 * Normalizes phone number into all standard representation variants for database queries:
 * e.g. ['+919847123456', '919847123456', '9847123456', '09847123456']
 */
export function getPhoneVariants(rawPhone: string) {
  return getUnifiedPhoneVariants(rawPhone);
}


/**
 * Strict Output Verification Guard:
 * Asserts all essential invoice / booking invariants before attempting network dispatch.
 */
export function verifyWhatsAppPayload(input: WhatsAppVerificationInput): WhatsAppVerificationResult {
  const sanitized = sanitizePhoneNumber(input.phone);
  
  if (!sanitized || sanitized.length < 10) {
    return {
      isValid: false,
      sanitizedPhone: '',
      error: `Invalid phone number '${input.phone}'. Must contain at least 10 valid digits.`,
    };
  }

  if (!input.bookingId && !input.invoiceId) {
    return {
      isValid: false,
      sanitizedPhone: sanitized,
      error: 'Either bookingId or invoiceId must be provided for audit tracking.',
    };
  }

  if (input.amount != null && (isNaN(input.amount) || input.amount < 0)) {
    return {
      isValid: false,
      sanitizedPhone: sanitized,
      error: `Invalid financial amount '${input.amount}'. Amount cannot be negative.`,
    };
  }

  return {
    isValid: true,
    sanitizedPhone: sanitized,
  };
}

export interface DispatchStatusUpdateParams {
  bookingId: number;
  customerPhone: string;
  customerName?: string;
  plateNumber: string;
  status: 'IN_PROGRESS' | 'IN_BAY_1' | 'IN_BAY_2' | 'DETAILING' | 'READY';
  bayName?: string;
  packageName?: string;
  amount?: number;
}

export interface DispatchInvoiceParams {
  bookingId: number;
  invoiceId: number;
  customerPhone: string;
  customerName?: string;
  plateNumber: string;
  packageName: string;
  amount: number;
  paymentMethod: string;
}

export class WhatsAppService {
  private static getBridgeUrl(): string {
    return process.env.WHATSAPP_BRIDGE_URL || process.env.WHATSAPP_LOCAL_BRIDGE_URL || 'http://127.0.0.1:3000';
  }

  private static getFrontendUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Dispatches arbitrary text message through WhatsApp Bridge and records log in Supabase.
   */
  public static async sendMessage(
    phone: string,
    message: string,
    bookingId?: number | null
  ): Promise<{ success: boolean; error?: string }> {
    const sanitized = sanitizePhoneNumber(phone);
    if (!sanitized) {
      return { success: false, error: 'Empty or invalid phone number' };
    }

    const bridgeUrl = this.getBridgeUrl();
    let dispatchSuccess = false;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${bridgeUrl}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: sanitized,
          message,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        dispatchSuccess = data.success === true;
      } else {
        errorMessage = `Bridge returned HTTP ${response.status}`;
      }
    } catch (err: unknown) {
      errorMessage = err instanceof Error ? err.message : 'Network error';
      console.warn(`[WhatsApp Service] Bridge dispatch error for ${sanitized}:`, errorMessage);
    }

    // Always log to Supabase notification_logs (silent failover safe)
    try {
      const supabase = getSupabaseAdmin();
      await supabase.from('notification_logs').insert({
        booking_id: bookingId || null,
        type: 'WHATSAPP',
        recipient: sanitized,
        message,
        status: dispatchSuccess ? 'SENT' : 'FAILED',
      });
    } catch (logErr) {
      console.error('[WhatsApp Service] Failed to insert notification_log row:', logErr);
    }

    return {
      success: dispatchSuccess,
      error: errorMessage || undefined,
    };
  }

  /**
   * Dispatches Malayalam formatted status change notifications.
   */
  public static async notifyStatusChange(
    params: DispatchStatusUpdateParams
  ): Promise<{ success: boolean; error?: string }> {
    const verification = verifyWhatsAppPayload({
      phone: params.customerPhone,
      bookingId: params.bookingId,
      amount: params.amount,
      customerName: params.customerName,
    });

    if (!verification.isValid) {
      console.warn('[WhatsApp Service] Status change verification failed:', verification.error);
      return { success: false, error: verification.error };
    }

    let message = '';
    const name = params.customerName || 'Customer';
    const plate = params.plateNumber || 'വാഹനം';
    const pkg = params.packageName || 'Car Spa Service';

    if (params.status === 'READY') {
      const amtStr = params.amount != null ? `\n💵 തുക: *₹${params.amount.toFixed(2)}*` : '';
      message = [
        `✨ *KALLAYI CAR SPA & AUTO CARE*`,
        `നമസ്കാരം *${name}*,`,
        ``,
        `നിങ്ങളുടെ വാഹനം (*${plate}*) വാഷ് കംപ്ലീറ്റായി റെഡിയാണ്! 🌟${amtStr}`,
        ``,
        `വാഹനം കൈപ്പറ്റുന്നതിനായി നിങ്ങൾക്ക് എത്തിച്ചേരാവുന്നതാണ്.`,
        `നന്ദി!`,
        `📍 മഞ്ചേരി, മലപ്പുറം`,
      ].join('\n');
    } else {
      const bay = params.bayName || (params.status === 'IN_BAY_2' ? 'Bay 2' : 'Bay 1');
      message = [
        `🚗 *KALLAYI CAR SPA & AUTO CARE*`,
        `നമസ്കാരം *${name}*,`,
        ``,
        `നിങ്ങളുടെ വാഹനം (*${plate}*) വാഷിംഗിനായി *${bay}*-ലേക്ക് കയറ്റിയിട്ടുണ്ട്.`,
        `📋 സർവീസ്: *${pkg}*`,
        `ഞങ്ങളുടെ വിദഗ്ദ്ധ ടീം ഉടൻ സർവീസ് പൂർത്തിയാക്കുന്നതാണ്.`,
        ``,
        `📍 മഞ്ചേരി, മലപ്പുറം`,
      ].join('\n');
    }

    return this.sendMessage(verification.sanitizedPhone, message, params.bookingId);
  }

  /**
   * Dispatches Malayalam POS billing receipt with direct public invoice preview link.
   */
  public static async notifyPOSCheckout(
    params: DispatchInvoiceParams
  ): Promise<{ success: boolean; error?: string }> {
    const verification = verifyWhatsAppPayload({
      phone: params.customerPhone,
      bookingId: params.bookingId,
      invoiceId: params.invoiceId,
      amount: params.amount,
      customerName: params.customerName,
    });

    if (!verification.isValid) {
      console.warn('[WhatsApp Service] POS Checkout verification failed:', verification.error);
      return { success: false, error: verification.error };
    }

    const frontendUrl = this.getFrontendUrl();
    const invoicePreviewUrl = `${frontendUrl}/invoice-preview?id=${params.invoiceId}`;
    const name = params.customerName || 'Customer';

    const message = [
      `🧾 *KALLAYI CAR SPA & AUTO CARE*`,
      `*INVOICE & PAYMENT RECEIPT*`,
      ``,
      `നമസ്കാരം *${name}*,`,
      `ഞങ്ങളുടെ സർവീസ് തിരഞ്ഞെടുത്തതിന് നന്ദി!`,
      ``,
      `📄 ഇൻവോയ്സ് നമ്പർ: *#INV-${params.invoiceId}*`,
      `🚗 വാഹനം: *${params.plateNumber}*`,
      `📋 സർവീസ്: *${params.packageName}*`,
      `💰 അടച്ച തുക: *₹${params.amount.toFixed(2)}* (${params.paymentMethod})`,
      ``,
      `🔗 ഡിജിറ്റൽ ഇൻവോയ്സ് കാണാൻ:`,
      `${invoicePreviewUrl}`,
      ``,
      `📍 കല്ലായി കാർ സ്പാ, മഞ്ചേരി`,
    ].join('\n');

    return this.sendMessage(verification.sanitizedPhone, message, params.bookingId);
  }

  /**
   * Dispatches Malayalam Khata settlement confirmation.
   */
  public static async notifyKhataSettlement(params: {
    customerPhone: string;
    customerName?: string;
    amountPaid: number;
    remainingBalance: number;
  }): Promise<{ success: boolean; error?: string }> {
    const sanitized = sanitizePhoneNumber(params.customerPhone);
    if (!sanitized) {
      return { success: false, error: 'Invalid customer phone number.' };
    }

    const name = params.customerName || 'പ്രിയ സുഹൃത്തേ';
    const message = [
      `✨ *KALLAYI CAR SPA & AUTO CARE*`,
      `*ഡിജിറ്റൽ ഖാത്ത പേയ്‌മെന്റ് സ്ഥിരീകരണം*`,
      ``,
      `പ്രിയ *${name}*,`,
      `നിങ്ങൾ അടച്ച *₹${params.amountPaid.toFixed(2)}* വിജയകരമായി സ്വീകരിച്ചിരിക്കുന്നു. നന്ദി!`,
      ``,
      `💳 ഇനി നൽകാനുള്ള ബാക്കി തുക: *₹${params.remainingBalance.toFixed(2)}*`,
      ``,
      `📍 കല്ലായി കാർ സ്പാ, മഞ്ചേരി`,
      `📞 ഹെൽപ്പ്‌ലൈൻ: +91 98470 00000`,
    ].join('\n');

    return this.sendMessage(sanitized, message);
  }

  /**
   * Dispatches polite Malayalam Khata payment reminder.
   */
  public static async notifyKhataReminder(params: {
    customerPhone: string;
    customerName?: string;
    outstandingBalance: number;
  }): Promise<{ success: boolean; error?: string }> {
    const sanitized = sanitizePhoneNumber(params.customerPhone);
    if (!sanitized) {
      return { success: false, error: 'Invalid customer phone number.' };
    }

    const name = params.customerName || 'പ്രിയ ഉപഭോക്താവേ';
    const message = [
      `🔔 *KALLAYI CAR SPA & AUTO CARE*`,
      `*ഡിജിറ്റൽ ഖാത്ത കുടിശ്ശിക അറിയിപ്പ്*`,
      ``,
      `പ്രിയ *${name}*,`,
      `കല്ലായി കാർ സ്പായിൽ നിങ്ങളുടെ അക്കൗണ്ടിൽ *₹${params.outstandingBalance.toFixed(2)}* കുടിശ്ശിക ഉള്ളതായി കാണുന്നു.`,
      ``,
      `ദയവായി ഈ തുക എത്രയും വേഗം നേരിട്ടോ UPI വഴിയോ അടച്ചു തീർക്കാൻ അഭ്യർത്ഥിക്കുന്നു.`,
      ``,
      `സഹായങ്ങൾക്ക് ബന്ധപ്പെടുക: +91 98470 00000`,
      `നന്ദി!`,
      `📍 കല്ലായി കാർ സ്പാ, മഞ്ചേരി`,
    ].join('\n');

    return this.sendMessage(sanitized, message);
  }
}

