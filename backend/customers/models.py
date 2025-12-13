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
