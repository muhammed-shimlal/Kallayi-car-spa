import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from .services import WhatsAppNotificationService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Booking)
def booking_notification(sender, instance, created, **kwargs):
    """
    Triggers WhatsApp notifications on Booking creation or status updates without blocking transactions.
    """
    try:
        if created:
            # New Booking -> Send WhatsApp confirmation
            WhatsAppNotificationService.send_booking_confirmation(instance)
        else:
            # Status Transition Check
            old_status = getattr(instance, '_old_status', None)
            if instance.status != old_status and instance.status in ['IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'COMPLETED']:
                WhatsAppNotificationService.send_status_update(instance, instance.status)
    except Exception as e:
        logger.error(f"[Booking Signal Error] WhatsApp notification failed: {e}")
