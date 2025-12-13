from django.db import models
from customers.models import Customer
from fleet.models import Vehicle
from django.contrib.auth.models import User

class ServicePackage(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    duration_minutes = models.IntegerField(default=60)
    
    # Financial Links
    chemical_recipe = models.JSONField(default=dict, help_text="Dictionary of chemical names and amounts (e.g. {'soap': 0.5})")
    commission_rule = models.ForeignKey('finance.CommissionRule', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.name

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='bookings')
    technician = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_bookings')
    service_package = models.ForeignKey(ServicePackage, on_delete=models.SET_NULL, null=True)
    time_slot = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    # Location details
    address = models.TextField(default="123 Main St, City")
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)

    def save(self, *args, **kwargs):
        if self.service_package and self.time_slot:
            from datetime import timedelta
            self.end_time = self.time_slot + timedelta(minutes=self.service_package.duration_minutes)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking {self.id} - {self.customer} - {self.status}"
