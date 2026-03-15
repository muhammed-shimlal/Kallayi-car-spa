from django.db.models.signals import pre_save, pre_delete, post_save
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

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Booking)
def notify_customer_on_ready(sender, instance, **kwargs):
    """Fires a mock SMS when a car is moved to READY status on the Kanban board."""
    if instance.status == 'READY':
        try:
            customer_name = str(instance.customer)
            plate = instance.vehicle.plate_number if instance.vehicle else 'your car'
            print(f"📱 MOCK SMS: Hi {customer_name}, your car ({plate}) is shining and ready for pickup at Kallayi Car Spa! See you soon 🚗✨")
        except Exception as e:
            print(f"[Signal Error] Could not send ready SMS: {e}")

    # Broadcast update to Kanban Board
    try:
        channel_layer = get_channel_layer()
        booking_data = {
            "id": instance.id,
            "status": instance.status,
            "plate_number": instance.vehicle.plate_number if instance.vehicle else "",
            "vehicle_model": instance.vehicle.model if instance.vehicle else "",
            "service_name": instance.service_package.name if instance.service_package else "",
            "customer_name": f"{instance.customer.first_name} {instance.customer.last_name}" if instance.customer else "",
            "technician_name": f"{instance.technician.first_name} {instance.technician.last_name}" if instance.technician else None,
            "created_at": instance.created_at.isoformat() if getattr(instance, 'created_at', None) else None,
            "time_slot": instance.time_slot.isoformat() if getattr(instance, 'time_slot', None) else None,
            "bay_assignment": instance.bay_assignment
        }
        async_to_sync(channel_layer.group_send)(
            "live_queue",
            {
                "type": "queue_update",
                "data": booking_data
            }
        )
    except Exception as e:
        print(f"[Signal Error] Could not broadcast queue update: {e}")

