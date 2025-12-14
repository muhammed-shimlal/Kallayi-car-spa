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

class ServiceVehicle(models.Model):
    make = models.CharField(max_length=50) # e.g. Ford
    model = models.CharField(max_length=50) # e.g. Transit Connect
    plate_number = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    last_service_odometer = models.IntegerField(default=0, help_text="Odometer reading at last service")
    service_interval_km = models.IntegerField(default=5000, help_text="Service due every X kilometers")
    
    def __str__(self):
        return f"{self.make} {self.model} ({self.plate_number})"
    
    def needs_service(self, current_odometer):
        """Check if vehicle needs service based on odometer"""
        return (current_odometer - self.last_service_odometer) >= self.service_interval_km

class VehicleAssignment(models.Model):
    vehicle = models.ForeignKey(ServiceVehicle, on_delete=models.CASCADE)
    technician = models.ForeignKey(User, on_delete=models.CASCADE, unique=True) # One vehicle per tech at a time
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.technician.username} -> {self.vehicle}"

class FleetLog(models.Model):
    LOG_TYPES = [
        ('FUEL', 'Fuel'),
        ('MAINTENANCE', 'Maintenance'),
        ('OTHER', 'Other'),
    ]
    
    vehicle = models.ForeignKey(ServiceVehicle, on_delete=models.CASCADE)
    log_type = models.CharField(max_length=20, choices=LOG_TYPES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    odometer = models.IntegerField(help_text="Current Odometer Reading")
    receipt_photo = models.ImageField(upload_to='fleet_receipts/', null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle} - {self.log_type} - ${self.amount}"
