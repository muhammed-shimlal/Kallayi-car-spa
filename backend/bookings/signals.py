from django.db.models.signals import pre_save, pre_delete, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import Booking
# Need to securely import DailyRegisterAudit for the lock check
from finance.models import DailyRegisterAudit
from notifications.services import send_customer_notification

def check_register_lock(target_date):
    if DailyRegisterAudit.objects.filter(date=target_date, is_locked=True).exists():
        raise ValidationError("Security Alert: The financial register for this date is closed. This record is permanently locked and cannot be modified or deleted.")

@receiver([pre_save, pre_delete], sender=Booking)
def freeze_booking(sender, instance, **kwargs):
    target_date = (instance.created_at or timezone.now()).date()
    check_register_lock(target_date)


@receiver(pre_save, sender=Booking)
def cache_old_booking_status(sender, instance, **kwargs):
    """Cache the old status before save so post_save can detect actual transitions."""
    if instance.pk:
        try:
            old = Booking.objects.filter(pk=instance.pk).values_list('status', flat=True).first()
            instance._old_status = old
        except Exception:
            instance._old_status = None
    else:
        instance._old_status = None


from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@receiver(post_save, sender=Booking)
def notify_customer_on_ready(sender, instance, created, **kwargs):
    """Fires WhatsApp notification ONLY when status transitions to READY (not on every save)."""
    if created:
        return

    old_status = getattr(instance, '_old_status', None)

    # Only trigger when the status *actually changed* to READY
    if instance.status == 'READY' and old_status != 'READY':
        try:
            plate = instance.vehicle.plate_number if instance.vehicle else 'your car'
            phone = instance.customer.phone_number if instance.customer else None

            message = (
                f"Hi! Your vehicle ({plate}) is shining and ready for pickup "
                f"at Kallayi Car Spa. View your receipt here: "
                f"https://kallayi.com/receipt/{instance.id}"
            )

            if phone:
                send_customer_notification(phone, message)
            else:
                print(f"[Signal] No phone number for customer on Booking #{instance.id}, skipping SMS.")
        except Exception as e:
            print(f"[Signal Error] Could not send ready notification: {e}")

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

