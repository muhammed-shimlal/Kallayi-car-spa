from django.db import models
from bookings.models import Booking

class NotificationLog(models.Model):
    TYPE_CHOICES = [
        ('SMS', 'SMS'),
        ('EMAIL', 'Email'),
        ('WHATSAPP', 'WhatsApp'),
    ]
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='WHATSAPP')
    recipient = models.CharField(max_length=255)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='SENT')

    def __str__(self):
        booking_id = self.booking.id if self.booking else 'N/A'
        return f"{self.type} to {self.recipient} for Booking {booking_id}"

