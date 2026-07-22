from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from customers.models import Customer
from fleet.models import TechnicianLocation
from rest_framework.authtoken.models import Token
from staff.models import StaffProfile

class Command(BaseCommand):
    help = 'Creates test users for Customer, Driver, and Manager roles with valid phone numbers'

    def handle(self, *args, **kwargs):
        # 1. Customer
        cust_phone = '+919999999991'
        cust_user, created = User.objects.get_or_create(username=cust_phone, email='customer@example.com')
        cust_user.set_password('password123')
        cust_user.first_name = 'Test Customer'
        cust_user.save()
        Customer.objects.get_or_create(user=cust_user, defaults={'phone_number': cust_phone})
        Token.objects.get_or_create(user=cust_user)
        self.stdout.write(self.style.SUCCESS(f'Customer: phone="{cust_phone}", password="password123"'))

        # 2. Driver / Staff
        driver_phone = '+919999999992'
        driver_user, created = User.objects.get_or_create(username=driver_phone, email='driver@example.com')
        driver_user.set_password('password123')
        driver_user.first_name = 'Ashraf Driver'
        driver_user.save()
        staff_prof, _ = StaffProfile.objects.get_or_create(user=driver_user, defaults={'role': 'DRIVER', 'phone_number': driver_phone, 'salary_type': 'DAILY', 'salary_amount': 700})
        staff_prof.salary_type = 'DAILY'
        staff_prof.salary_amount = 700
        staff_prof.save()

        TechnicianLocation.objects.get_or_create(technician=driver_user, defaults={'latitude': 0, 'longitude': 0})
        Token.objects.get_or_create(user=driver_user)
        self.stdout.write(self.style.SUCCESS(f'Driver:   phone="{driver_phone}",   password="password123"'))

        # Seed sample completed bookings & transactions for staff dashboard demonstration
        from customers.models import CustomerVehicle
        from bookings.models import Booking, ServicePackage
        from finance.models import GeneralExpense
        from django.utils import timezone

        pkg, _ = ServicePackage.objects.get_or_create(name="Full Spa Wash", defaults={"price": 500.00, "description": "Full exterior and interior clean"})
        v1, _ = CustomerVehicle.objects.get_or_create(plate_number="KL-10-A-1234", defaults={"customer": cust_user, "make": "Toyota", "model": "Fortuner", "vehicle_type": "CAR"})
        v2, _ = CustomerVehicle.objects.get_or_create(plate_number="KL-10-B-5678", defaults={"customer": cust_user, "make": "Royal Enfield", "model": "Classic 350", "vehicle_type": "BIKE"})
        
        now = timezone.now()
        Booking.objects.get_or_create(id=9901, defaults={"customer": Customer.objects.get(user=cust_user), "vehicle": v1, "technician": driver_user, "service_package": pkg, "time_slot": now, "end_time": now, "status": "COMPLETED"})
        Booking.objects.get_or_create(id=9902, defaults={"customer": Customer.objects.get(user=cust_user), "vehicle": v2, "technician": driver_user, "service_package": pkg, "time_slot": now, "end_time": now, "status": "COMPLETED"})

        # Sample staff transaction (advance & bonus)
        GeneralExpense.objects.get_or_create(id=9901, defaults={
            "expense_type": "STAFF",
            "transaction_type": "ADVANCE",
            "staff": driver_user,
            "amount": 1000.00,
            "description": "Emergency cash advance",
            "notes": "Medical emergency",
            "payment_method": "CASH",
            "status": "APPROVED"
        })

        # 3. Manager (Admin)
        admin_phone = '+919999999993'
        admin_user, created = User.objects.get_or_create(username=admin_phone, email='admin@example.com')
        admin_user.set_password('password123')
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.first_name = 'Test Admin'
        admin_user.save()
        StaffProfile.objects.get_or_create(user=admin_user, defaults={'role': 'MANAGER', 'phone_number': admin_phone})
        Token.objects.get_or_create(user=admin_user)
        self.stdout.write(self.style.SUCCESS(f'Manager:  phone="{admin_phone}",    password="password123"'))
