import logging

logger = logging.getLogger(__name__)

def send_sms(phone, message):
    # Mock SMS sending
    logger.info(f"Sending SMS to {phone}: {message}")
    print(f"--- SMS SENT TO {phone} ---\n{message}\n---------------------------")
    return True

from django.core.mail import send_mail
from django.conf import settings

def send_email(to, subject, body):
    logger.info(f"Sending Email to {to}: {subject}")
    # Print for debug log visibility
    print(f"--- EMAIL SENT TO {to} ---\nSubject: {subject}\n{body}\n---------------------------")
    
    try:
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL if hasattr(settings, 'DEFAULT_FROM_EMAIL') else 'noreply@kallayicarspa.com',
            [to],
            fail_silently=True, # Don't crash if SMTP not configured
        )
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
