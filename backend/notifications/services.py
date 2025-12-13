import logging

logger = logging.getLogger(__name__)

def send_sms(phone, message):
    # Mock SMS sending
    logger.info(f"Sending SMS to {phone}: {message}")
    print(f"--- SMS SENT TO {phone} ---\n{message}\n---------------------------")
    return True

def send_email(to, subject, body):
    # Mock Email sending
    logger.info(f"Sending Email to {to}: {subject}")
    print(f"--- EMAIL SENT TO {to} ---\nSubject: {subject}\n{body}\n---------------------------")
    return True
