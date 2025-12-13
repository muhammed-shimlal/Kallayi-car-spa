from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from .models import NotificationLog
from .services import send_sms, send_email

@receiver(post_save, sender=Booking)
def booking_notification(sender, instance, created, **kwargs):
    if created:
        # New Booking
        message = f"Booking Confirmed! ID: {instance.id}. We will see you on {instance.time_slot}."
        # Assuming customer has a user with email, or we add phone to customer model later.
        # For now, using mock data.
        recipient = instance.customer.user.email if instance.customer.user.email else "customer@example.com"
        
        send_email(recipient, "Booking Confirmation", message)
        NotificationLog.objects.create(booking=instance, type='EMAIL', recipient=recipient, message=message)
        
    else:
        # Status Update
        if instance.status == 'COMPLETED':
            message = f"Your service for Booking {instance.id} is complete! Please pay your invoice."
            recipient = instance.customer.user.email if instance.customer.user.email else "customer@example.com"
            
            send_email(recipient, "Service Completed", message)
            NotificationLog.objects.create(booking=instance, type='EMAIL', recipient=recipient, message=message)
