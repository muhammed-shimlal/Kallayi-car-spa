from django.db import models
from customers.models import Customer

class Vehicle(models.Model):
    owner = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    model = models.CharField(max_length=100)
    plate_number = models.CharField(max_length=20, unique=True)
    last_wash_date = models.DateField(null=True, blank=True)
    gps_coordinates = models.CharField(max_length=100, blank=True) # Simple string for now

    def __str__(self):
        return f"{self.model} ({self.plate_number})"

from django.contrib.auth.models import User

class TechnicianLocation(models.Model):
    technician = models.OneToOneField(User, on_delete=models.CASCADE, related_name='location')
    latitude = models.FloatField()
    longitude = models.FloatField()
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.technician.username} - {self.latitude}, {self.longitude}"
