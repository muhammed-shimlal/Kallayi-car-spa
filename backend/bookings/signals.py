from django.db.models.signals import pre_save, pre_delete
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Booking
# Need to securely import DailyRegisterAudit for the lock check
from finance.models import DailyRegisterAudit

def check_register_lock(target_date):
    if DailyRegisterAudit.objects.filter(date=target_date, is_locked=True).exists():
        raise ValidationError("Security Alert: The financial register for this date is closed. This record is permanently locked and cannot be modified or deleted.")

@receiver([pre_save, pre_delete], sender=Booking)
def freeze_booking(sender, instance, **kwargs):
    target_date = getattr(instance, 'created_at', timezone.now()).date()
    check_register_lock(target_date)
