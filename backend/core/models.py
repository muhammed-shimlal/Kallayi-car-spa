from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class PasswordResetOTP(models.Model):
    """
    Stores 6-digit OTP codes generated for WhatsApp phone number password resets.
    Valid for 5 minutes by default.
    """
    phone_number = models.CharField(max_length=20, db_index=True)
    otp_code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def is_valid(self, window_minutes: int = 5) -> bool:
        if self.is_used:
            return False
        now = timezone.now()
        elapsed_seconds = (now - self.created_at).total_seconds()
        return elapsed_seconds <= (window_minutes * 60)

    def __str__(self):
        return f"OTP {self.otp_code} for {self.phone_number} (Used: {self.is_used})"
