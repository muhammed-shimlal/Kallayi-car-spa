from django.db.models.signals import pre_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import GeneralExpense, KhataLedger, DailyRegisterAudit

def check_register_lock(target_date):
    """
    Checks if a DailyRegisterAudit exists and is locked for the given date.
    Raises ValidationError if locked.
    """
    if DailyRegisterAudit.objects.filter(date=target_date, is_locked=True).exists():
        raise ValidationError("Security Alert: The financial register for this date is closed. This record is permanently locked and cannot be modified or deleted.")

@receiver([pre_save, pre_delete], sender=GeneralExpense)
def freeze_general_expense(sender, instance, **kwargs):
    # Depending on model structure, date might be 'date' or 'created_at'
    target_date = getattr(instance, 'date', None) or getattr(instance, 'created_at', timezone.now()).date()
    check_register_lock(target_date)

@receiver([pre_save, pre_delete], sender=KhataLedger)
def freeze_khata_ledger(sender, instance, **kwargs):
    target_date = (getattr(instance, 'created_at', None) or timezone.now()).date()
    check_register_lock(target_date)
