from decimal import Decimal
from django.db import models
from customers.models import Customer, CustomerVehicle
from django.contrib.auth.models import User

class ServicePackage(models.Model):
    VEHICLE_TYPE_CHOICES = [
        ('ALL', 'All Vehicle Types'),
        ('HATCHBACK', 'Hatchback'),
        ('SEDAN', 'Sedan'),
        ('COMPACT_SUV', 'Compact SUV'),
        ('SUV', 'Full SUV'),
        ('MUV', 'MUV'),
        ('BIKE', 'Bike'),
        ('VAN', 'Van'),
        ('LUXURY', 'Luxury'),
        ('AUTO', 'Auto'),
        ('TRUCK', 'Truck'),
    ]

    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    duration_minutes = models.IntegerField(default=60)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='ALL', db_index=True)
    
    # Financial Links
    chemical_recipe = models.JSONField(default=dict, help_text="Dictionary of chemical names and amounts (e.g. {'soap': 0.5})")
    commission_rule = models.ForeignKey('finance.CommissionRule', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.vehicle_type})"

class ServicePackagePrice(models.Model):
    package = models.ForeignKey(ServicePackage, related_name='tiered_prices', on_delete=models.CASCADE)
    vehicle_type = models.CharField(max_length=30, choices=ServicePackage.VEHICLE_TYPE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ('package', 'vehicle_type')

    def __str__(self):
        return f"{self.package.name} - {self.vehicle_type}: ₹{self.price}"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('WAITING', 'Waiting'),
        ('IN_BAY_1', 'In Bay 1'),
        ('IN_BAY_2', 'In Bay 2'),
        ('DETAILING', 'Detailing'),
        ('READY', 'Ready for Pickup'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bookings')
    vehicle = models.ForeignKey(CustomerVehicle, on_delete=models.CASCADE, related_name='bookings')
    technician = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_bookings')
    service_package = models.ForeignKey(ServicePackage, on_delete=models.SET_NULL, null=True)
    time_slot = models.DateTimeField(db_index=True)
    end_time = models.DateTimeField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='WAITING', db_index=True)
    bay_assignment = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    points_redeemed = models.IntegerField(default=0)

    # Financial & Discount Derivation Fields
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_reason = models.CharField(max_length=255, blank=True, default='')

    # Location details
    address = models.TextField(default="123 Main St, City")
    latitude = models.FloatField(default=0.0)
    longitude = models.FloatField(default=0.0)

    def save(self, *args, **kwargs):
        if self.service_package and self.time_slot:
            from datetime import timedelta
            self.end_time = self.time_slot + timedelta(minutes=self.service_package.duration_minutes)

        if self.service_package and (self.base_price is None or Decimal(str(self.base_price)) <= Decimal('0.00')):
            self.base_price = Decimal(str(self.service_package.price or 0))

        b_price = Decimal(str(self.base_price or 0))
        f_price = Decimal(str(self.final_price or 0)) if self.final_price is not None else Decimal('0.00')

        # If discount_amount was provided but final_price was not explicitly set or equals base_price:
        if self.discount_amount and Decimal(str(self.discount_amount)) > Decimal('0.00') and (f_price <= Decimal('0.00') or f_price == b_price):
            f_price = max(Decimal('0.00'), b_price - Decimal(str(self.discount_amount)))

        if f_price <= Decimal('0.00') and b_price > Decimal('0.00'):
            f_price = b_price

        if b_price > Decimal('0.00'):
            if f_price > b_price:
                f_price = b_price
            
            diff = b_price - f_price
            disc_amt = max(diff, Decimal('0.00'))
            disc_pct = round((disc_amt / b_price) * Decimal('100.0'), 2)
            
            self.base_price = b_price
            self.final_price = f_price
            self.discount_amount = disc_amt
            self.discount_percentage = disc_pct
        else:
            self.base_price = b_price
            self.final_price = f_price
            self.discount_amount = Decimal('0.00')
            self.discount_percentage = Decimal('0.00')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Booking {self.id} - {self.customer} - {self.status}"
