import logging
from django.db.models.signals import pre_save, pre_delete, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import GeneralExpense, KhataLedger, DailyRegisterAudit, Invoice
from notifications.services import WhatsAppNotificationService

logger = logging.getLogger(__name__)


def check_register_lock(target_date):
    """
    Checks if a DailyRegisterAudit exists and is locked for the given date.
    Raises ValidationError if locked.
    """
    if DailyRegisterAudit.objects.filter(date=target_date, is_locked=True).exists():
        raise ValidationError("Security Alert: The financial register for this date is closed. This record is permanently locked and cannot be modified or deleted.")


@receiver([pre_save, pre_delete], sender=GeneralExpense)
def freeze_general_expense(sender, instance, **kwargs):
    target_date = getattr(instance, 'date', None) or getattr(instance, 'created_at', timezone.now()).date()
    check_register_lock(target_date)


@receiver([pre_save, pre_delete], sender=KhataLedger)
def freeze_khata_ledger(sender, instance, **kwargs):
    target_date = (getattr(instance, 'created_at', None) or timezone.now()).date()
    check_register_lock(target_date)


@receiver(pre_save, sender=Invoice)
def cache_old_invoice_paid_status(sender, instance, **kwargs):
    """Cache the old is_paid status before save to detect transitions."""
    if instance.pk:
        try:
            old_is_paid = Invoice.objects.filter(pk=instance.pk).values_list('is_paid', flat=True).first()
            instance._old_is_paid = bool(old_is_paid)
        except Exception:
            instance._old_is_paid = False
    else:
        instance._old_is_paid = False


@receiver(post_save, sender=Invoice)
def send_invoice_pdf_on_payment(sender, instance, created, **kwargs):
    """
    Triggers WhatsApp PDF Invoice document dispatch when an invoice payment is completed.
    """
    old_is_paid = getattr(instance, '_old_is_paid', False)
    if instance.is_paid and (created or not old_is_paid):
        try:
            WhatsAppNotificationService.send_invoice_pdf(instance)
        except Exception as e:
            logger.error(f"[Invoice Signal Error] Failed to send WhatsApp PDF invoice: {e}")
