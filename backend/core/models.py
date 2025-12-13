from django.db import models
from django.contrib.auth.models import User

class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('MANAGER', 'Manager'),
        ('TECHNICIAN', 'Technician'),
        ('DRIVER', 'Driver'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='staff_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='TECHNICIAN')
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Financial details
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage (0-100)")
    joining_date = models.DateField(auto_now_add=True)
    
    # Real-time Tracking
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.role}"
