from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from customers.models import Customer
from fleet.models import TechnicianLocation
from rest_framework.authtoken.models import Token

class Command(BaseCommand):
    help = 'Creates test users for Customer, Driver, and Manager roles'

    def handle(self, *args, **kwargs):
        # 1. Customer
        cust_user, created = User.objects.get_or_create(username='customer', email='customer@example.com')
        cust_user.set_password('password123')
        cust_user.save()
        Customer.objects.get_or_create(user=cust_user)
        Token.objects.get_or_create(user=cust_user)
        self.stdout.write(self.style.SUCCESS(f'Customer: username="customer", password="password123"'))

        # 2. Driver
        driver_user, created = User.objects.get_or_create(username='driver', email='driver@example.com')
        driver_user.set_password('password123')
        driver_user.save()
        # Ensure TechnicianLocation exists for him (Technician ID matches User ID usually or we link it)
        # In our fleet model, TechnicianLocation links to User (technician field).
        TechnicianLocation.objects.get_or_create(technician=driver_user, defaults={'latitude': 0, 'longitude': 0})
        Token.objects.get_or_create(user=driver_user)
        self.stdout.write(self.style.SUCCESS(f'Driver:   username="driver",   password="password123"'))

        # 3. Manager (Admin)
        admin_user, created = User.objects.get_or_create(username='admin', email='admin@example.com')
        admin_user.set_password('password123')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        Token.objects.get_or_create(user=admin_user)
        self.stdout.write(self.style.SUCCESS(f'Manager:  username="admin",    password="password123"'))
