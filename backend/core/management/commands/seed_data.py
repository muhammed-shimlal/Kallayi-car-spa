from django.core.management.base import BaseCommand
from django.utils import timezone
from bookings.models import ServicePackage, Booking
from finance.models import ExpenseCategory, GeneralExpense
from fleet.models import Vehicle
from django.contrib.auth.models import User
import random
from datetime import timedelta

class Command(BaseCommand):
    help = 'Seeds the database with initial data for demo'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting data seed...")

        # 1. Service Packages
        if not ServicePackage.objects.exists():
            ServicePackage.objects.create(name="Gold Wash", price=50.00, description="Exterior wash + Wax + Interior Vacuum", duration_minutes=60, chemical_recipe={'soap': 0.5, 'wax': 0.2})
            ServicePackage.objects.create(name="Silver Wash", price=30.00, description="Exterior wash + Interior Vacuum", duration_minutes=45, chemical_recipe={'soap': 0.4})
            ServicePackage.objects.create(name="Platinum Detail", price=120.00, description="Full Detail + Polish + Steam Clean", duration_minutes=120, chemical_recipe={'soap': 1.0, 'polish': 0.5, 'shampoo': 0.5})
            self.stdout.write(self.style.SUCCESS("Created Service Packages"))
        
        # 2. Expense Categories
        categories = ['Rent', 'Chemicals', 'Labor', 'Utilities', 'Maintenance']
        cat_objs = []
        for c in categories:
            obj, created = ExpenseCategory.objects.get_or_create(name=c)
            cat_objs.append(obj)
        self.stdout.write(self.style.SUCCESS("Created Expense Categories"))

        # 3. Mock Expenses (Last 30 days)
        if not GeneralExpense.objects.exists():
            for _ in range(20):
                GeneralExpense.objects.create(
                    category=random.choice(cat_objs),
                    amount=random.randint(50, 500),
                    description="Demo Expense",
                    date=timezone.now().date() - timedelta(days=random.randint(0, 30))
                )
            self.stdout.write(self.style.SUCCESS("Created Mock Expenses"))

        # 4. Vehicles (Assigned to first user found)
        first_user = User.objects.first()
        if first_user:
            from customers.models import Customer
            customer_profile, _ = Customer.objects.get_or_create(user=first_user, defaults={'phone_number': '555-0100', 'address': '123 Demo Ln'})
            
            if not Vehicle.objects.filter(owner=customer_profile).exists():
                Vehicle.objects.create(owner=customer_profile, plate_number="ABC-1234", model="Toyota Camry") # Removed vehicle_type default? 
                # Checking models fleet/models.py: only model and plate_number are required (last_wash_date, gps optional). No vehicle_type in model shown.
                Vehicle.objects.create(owner=customer_profile, plate_number="XYZ-9876", model="Honda CR-V")
                self.stdout.write(self.style.SUCCESS(f"Created Vehicles for {first_user.username}"))
        
        self.stdout.write(self.style.SUCCESS("Data seeding complete!"))
