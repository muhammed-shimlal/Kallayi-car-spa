import logging
import os
from io import BytesIO
from django.conf import settings
from django.template.loader import get_template

logger = logging.getLogger(__name__)


def render_invoice_pdf_to_file(invoice) -> str:
    """
    Renders invoice HTML template using xhtml2pdf and saves it to MEDIA_ROOT / 'invoices' / 'Invoice_<id>.pdf'.
    Returns absolute local file path string for local WhatsApp Web bridge attachment.
    """
    try:
        from xhtml2pdf import pisa
    except ImportError:
        logger.error("xhtml2pdf is not installed.")
        return ""

    try:
        invoices_dir = settings.MEDIA_ROOT / 'invoices'
        os.makedirs(invoices_dir, exist_ok=True)

        pdf_path = invoices_dir / f"Invoice_{invoice.id}.pdf"

        booking = getattr(invoice, 'booking', None)
        subscription = getattr(invoice, 'subscription', None)

        customer_phone = ""
        if booking and getattr(booking, 'customer', None):
            customer_phone = booking.customer.phone_number
        elif subscription and getattr(subscription, 'customer', None):
            customer_phone = subscription.customer.phone_number

        context = {
            'invoice': invoice,
            'booking': booking,
            'customer_phone': customer_phone,
        }

        template = get_template('finance/invoice_pdf.html')
        html_string = template.render(context)

        result = BytesIO()
        pdf = pisa.CreatePDF(BytesIO(html_string.encode('utf-8')), dest=result)

        if pdf.err:
            logger.error(f"PISA error rendering PDF for Invoice #{invoice.id}")
            return ""

        with open(pdf_path, 'wb') as f:
            f.write(result.getvalue())

        return str(pdf_path.resolve())
    except Exception as e:
        logger.error(f"Failed to render invoice PDF to file for Invoice #{invoice.id}: {e}")
        return ""
