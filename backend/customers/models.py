from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    interval_days = models.IntegerField(default=30) # 30 for monthly, 365 for yearly
    description = models.TextField(blank=True)
    
    def __str__(self):
        return f"{self.name} (₹{self.price})"

class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    loyalty_points = models.IntegerField(default=0)

    def __str__(self):
        return self.user.username

class MemberSubscription(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.RESTRICT)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    auto_renew = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.customer} - {self.plan}"

class FleetAccount(models.Model):
    company_name = models.CharField(max_length=100)
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    vehicles = models.ManyToManyField('fleet.Vehicle', related_name='fleet_accounts')
    billing_cycle_days = models.IntegerField(default=30)
    
    def __str__(self):
        return self.company_name

class Review(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE, related_name='review')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review {self.id} - {self.rating} stars"

class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2) # e.g. 10.00 for 10%
    expiry_date = models.DateField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.code} ({self.discount_percentage}%)"
