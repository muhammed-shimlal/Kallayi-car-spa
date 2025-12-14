from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta
import random

from customers.models import Customer, Review, SubscriptionPlan, MemberSubscription, Coupon
from bookings.models import ServicePackage, Booking
from fleet.models import Vehicle, ServiceVehicle, FleetLog, TechnicianLocation
from finance.models import Invoice, GeneralExpense, ExpenseCategory, RevenueCategory, PayrollEntry
from staff.models import StaffProfile, TimeEntry

class Command(BaseCommand):
    help = 'Seed database with comprehensive realistic data for all features'

    def handle(self, *args, **kwargs):
        self.stdout.write('Starting comprehensive database seeding...')
        
        # Clear existing data (optional - comment out if you want to keep existing)
        self.stdout.write('Clearing existing data...')
        Booking.objects.all().delete()
        Invoice.objects.all().delete()
        GeneralExpense.objects.all().delete()
        FleetLog.objects.all().delete()
        Review.objects.all().delete()
        MemberSubscription.objects.all().delete()
        TimeEntry.objects.all().delete()
        PayrollEntry.objects.all().delete()
        ServiceVehicle.objects.all().delete()
        Vehicle.objects.all().delete()
        Customer.objects.all().delete()
        StaffProfile.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        
        # Create users
        self.stdout.write('Creating users...')
        manager = self.create_manager()
        drivers = self.create_drivers(3)
        customers = self.create_customers(5)
        
        # Create service packages
        self.stdout.write('Creating service packages...')
        packages = self.create_packages()
        
        # Create subscription plans
        self.stdout.write('Creating subscription plans...')
        plans = self.create_subscription_plans()
        
        # Create service vehicles
        self.stdout.write('Creating service vehicles...')
        service_vehicles = self.create_service_vehicles(5)
        
        # Create expense categories
        self.stdout.write('Creating expense categories...')
        categories = self.create_expense_categories()
        
        # Create past bookings (completed)
        self.stdout.write('Creating past bookings...')
        self.create_past_bookings(customers, packages, drivers, 20)
        
        # Create active bookings
        self.stdout.write('Creating active bookings...')
        self.create_active_bookings(customers, packages, drivers, 5)
        
        # Create general expenses
        self.stdout.write('Creating general expenses...')
        self.create_general_expenses(categories, manager, 15)
        
        # Create fleet logs
        self.stdout.write('Creating fleet logs...')
        self.create_fleet_logs(service_vehicles, drivers, 10)
        
        # Create reviews
        self.stdout.write('Creating reviews...')
        self.create_reviews(customers, 8)
        
        # Create subscriptions
        self.stdout.write('Creating subscriptions...')
        self.create_subscriptions(customers, plans, 3)
        
        # Create time entries and payroll
        self.stdout.write('Creating staff time entries...')
        self.create_time_entries(drivers, 10)
        
        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))
        self.stdout.write(f'Created: {len(drivers)} drivers, {len(customers)} customers')
        self.stdout.write(f'Bookings: {Booking.objects.count()} total')
        self.stdout.write(f'Expenses: {GeneralExpense.objects.count()} total')

    def create_manager(self):
        user, created = User.objects.get_or_create(
            username='manager',
            defaults={
                'email': 'manager@kallayi.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if created:
            user.set_password('manager123')
            user.save()
            self.stdout.write(f'  Created manager: manager/manager123')
        return user

    def create_drivers(self, count):
        drivers = []
        for i in range(1, count + 1):
            user, created = User.objects.get_or_create(
                username=f'driver{i}',
                defaults={'email': f'driver{i}@kallayi.com'}
            )
            if created:
                user.set_password('driver123')
                user.save()
                
            StaffProfile.objects.get_or_create(
                user=user,
                defaults={
                    'role': 'DRIVER',
                    'joining_date': timezone.now().date() - timedelta(days=random.randint(30, 365))
                }
            )
            
            # Add location for driver
            TechnicianLocation.objects.update_or_create(
                technician=user,
                defaults={
                    'latitude': 11.2588 + random.uniform(-0.05, 0.05),
                    'longitude': 75.7804 + random.uniform(-0.05, 0.05)
                }
            )
            
            drivers.append(user)
            if created:
                self.stdout.write(f'  Created driver: driver{i}/driver123')
        return drivers

    def create_customers(self, count):
        customers = []
        names = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Williams', 'Tom Brown']
        for i in range(1, count + 1):
            user, created = User.objects.get_or_create(
                username=f'customer{i}',
                defaults={
                    'email': f'customer{i}@example.com',
                    'first_name': names[i-1].split()[0] if i <= len(names) else f'Customer{i}',
                    'last_name': names[i-1].split()[1] if i <= len(names) else f'User{i}'
                }
            )
            if created:
                user.set_password('customer123')
                user.save()
                
            customer, _ = Customer.objects.get_or_create(
                user=user,
                defaults={
                    'phone_number': f'+91-98765-{4321 + i}',
                    'loyalty_points': random.randint(100, 1000)
                }
            )
            
            # Create vehicles for customer
            car_models = [('Toyota', 'Camry'), ('Honda', 'Accord'), ('Ford', 'Mustang'), ('Tesla', 'Model 3')]
            for j in range(random.randint(1, 2)):
                make, model = random.choice(car_models)
                Vehicle.objects.get_or_create(
                    owner=customer,
                    plate_number=f'KL{i}5-{1000+i*10+j}',
                    defaults={'model': f'{make} {model}'}
                )
            
            customers.append(customer)
            if created:
                self.stdout.write(f'  Created customer: customer{i}/customer123')
        return customers

    def create_packages(self):
        packages_data = [
            ('Basic Wash', 'Exterior wash and dry', Decimal('500')),
            ('Premium Wash', 'Exterior + Interior cleaning', Decimal('800')),
            ('Deluxe Wash', 'Premium + Wax + Polish', Decimal('1200')),
            ('Gold Detailing', 'Complete detailing with ceramic coating', Decimal('2500')),
            ('Silver Package', 'Quick wash and vacuum', Decimal('400')),
        ]
        
        packages = []
        for name, desc, price in packages_data:
            pkg, _ = ServicePackage.objects.get_or_create(
                name=name,
                defaults={'description': desc, 'price': price}
            )
            packages.append(pkg)
        return packages

    def create_subscription_plans(self):
        plans_data = [
            ('Gold Plan', 'Unlimited washes monthly', Decimal('2999'), 30),
            ('Silver Plan', '10 washes per month', Decimal('1999'), 30),
            ('Platinum Plan', 'Unlimited premium washes', Decimal('4999'), 30),
        ]
        
        plans = []
        for name, desc, price, days in plans_data:
            plan, _ = SubscriptionPlan.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'price': price,
                    'interval_days': days
                }
            )
            plans.append(plan)
        return plans

    def create_service_vehicles(self, count):
        vehicles_data = [
            ('Ford', 'Transit', 'KL15-SV001', 0, 5000),
            ('Mercedes', 'Sprinter', 'KL15-SV002', 45000, 5000),  # High mileage - triggers alert
            ('Toyota', 'Hiace', 'KL15-SV003', 15000, 5000),
            ('Nissan', 'NV200', 'KL15-SV004', 8000, 5000),
            ('Chevrolet', 'Express', 'KL15-SV005', 22000, 5000),
        ]
        
        vehicles = []
        for make, model, plate, last_service, interval in vehicles_data[:count]:
            vehicle, _ = ServiceVehicle.objects.get_or_create(
                plate_number=plate,
                defaults={
                    'make': make,
                    'model': model,
                    'last_service_odometer': last_service,
                    'service_interval_km': interval
                }
            )
            vehicles.append(vehicle)
        return vehicles

    def create_expense_categories(self):
        categories = ['Rent', 'Utilities', 'Chemicals', 'Salaries', 'Marketing', 'Fuel', 'Maintenance']
        objs = []
        for cat in categories:
            obj, _ = ExpenseCategory.objects.get_or_create(name=cat)
            objs.append(obj)
        return objs

    def create_past_bookings(self, customers, packages, drivers, count):
        for i in range(count):
            customer = random.choice(customers)
            vehicle = random.choice(list(customer.vehicles.all()))
            package = random.choice(packages)
            driver = random.choice(drivers)
            
            # Random date in past 30 days
            days_ago = random.randint(1, 30)
            booking_date = timezone.now() - timedelta(days=days_ago)
            
            booking = Booking.objects.create(
                customer=customer,
                vehicle=vehicle,
                service_package=package,
                time_slot=booking_date,
                address=f'{random.randint(1, 100)} Main St, Kozhikode',
                status='COMPLETED',
                technician=driver,
                points_redeemed=0
            )
            
            # Create invoice
            Invoice.objects.create(
                booking=booking,
                amount=package.price,
                is_paid=True,
                payment_method='CARD'
            )

    def create_active_bookings(self, customers, packages, drivers, count):
        statuses = ['PENDING', 'IN_PROGRESS']
        for i in range(count):
            customer = random.choice(customers)
            vehicle = random.choice(list(customer.vehicles.all()))
            package = random.choice(packages)
            driver = random.choice(drivers)
            
            # Future or today
            days_ahead = random.randint(0, 7)
            booking_date = timezone.now() + timedelta(days=days_ahead)
            
            booking = Booking.objects.create(
                customer=customer,
                vehicle=vehicle,
                service_package=package,
                time_slot=booking_date,
                address=f'{random.randint(1, 100)} Beach Rd, Calicut',
                status=random.choice(statuses),
                technician=driver if random.random() > 0.3 else None
            )
            
            # Create invoice (unpaid for active bookings)
            Invoice.objects.create(
                booking=booking,
                amount=package.price,
                is_paid=False
            )

    def create_general_expenses(self, categories, manager, count):
        for i in range(count):
            category = random.choice(categories)
            days_ago = random.randint(0, 30)
            
            amounts = {
                'Rent': Decimal('25000'),
                'Utilities': Decimal(random.randint(5000, 15000)),
                'Chemicals': Decimal(random.randint(2000, 8000)),
                'Salaries': Decimal(random.randint(15000, 40000)),
                'Marketing': Decimal(random.randint(3000, 10000)),
            }
            
            amount = amounts.get(category.name, Decimal(random.randint(1000, 10000)))
            
            # Mix of approved and pending
            status = random.choice(['APPROVED', 'PENDING', 'APPROVED', 'APPROVED'])  # More approved
            
            GeneralExpense.objects.create(
                category=category,
                amount=amount,
                description=f'{category.name} expense for operations',
                date=timezone.now().date() - timedelta(days=days_ago),
                recorded_by=manager,
                status=status,
                approved_by=manager if status == 'APPROVED' else None,
                approved_at=timezone.now() if status == 'APPROVED' else None
            )

    def create_fleet_logs(self, vehicles, drivers, count):
        for i in range(count):
            vehicle = random.choice(vehicles)
            driver = random.choice(drivers)
            log_type = random.choice(['FUEL', 'MAINTENANCE', 'FUEL', 'FUEL'])  # More fuel
            
            # Odometer increases over time
            base_odometer = vehicle.last_service_odometer
            odometer = base_odometer + random.randint(100, 10000)
            
            FleetLog.objects.create(
                vehicle=vehicle,
                log_type=log_type,
                amount=Decimal(random.randint(2000, 8000)) if log_type == 'FUEL' else Decimal(random.randint(5000, 15000)),
                odometer=odometer,
                notes=f'{log_type} expense on route',
                recorded_by=driver
            )

    def create_reviews(self, customers, count):
        completed_bookings = Booking.objects.filter(status='COMPLETED')[:count]
        
        comments = [
            'Great service! Very professional.',
            'My car looks brand new!',
            'Quick and efficient service.',
            'Excellent attention to detail.',
            'Will definitely come back!',
            'Friendly staff and great work.',
            'Best car wash in town!',
            'Reasonable prices for quality service.'
        ]
        
        for booking in completed_bookings:
            Review.objects.create(
                customer=booking.customer,
                booking=booking,
                rating=random.randint(4, 5),
                comment=random.choice(comments)
            )

    def create_subscriptions(self, customers, plans, count):
        for i in range(count):
            customer = random.choice(customers)
            plan = random.choice(plans)
            
            start_date = timezone.now().date() - timedelta(days=random.randint(0, 15))
            end_date = start_date + timedelta(days=plan.interval_days)
            
            sub = MemberSubscription.objects.create(
                customer=customer,
                plan=plan,
                start_date=start_date,
                end_date=end_date
            )
            
            # Create invoice for subscription
            Invoice.objects.create(
                subscription=sub,
                amount=plan.price,
                is_paid=True,
                payment_method='CARD'
            )

    def create_time_entries(self, drivers, count):
        for driver in drivers:
            staff_profile = StaffProfile.objects.get(user=driver)
            
            for i in range(count):
                days_ago = random.randint(0, 30)
                date = timezone.now().date() - timedelta(days=days_ago)
                
                # Random work hours
                clock_in = timezone.now().replace(hour=random.randint(8, 10), minute=0, second=0) - timedelta(days=days_ago)
                hours_worked = random.randint(6, 10)
                clock_out = clock_in + timedelta(hours=hours_worked)
                
                TimeEntry.objects.create(
                    staff=staff_profile,
                    clock_in_time=clock_in,
                    clock_out_time=clock_out
                )
                
                # Create payroll entry
                PayrollEntry.objects.create(
                    staff_user=driver,
                    date=date,
                    base_wage=Decimal(hours_worked * 150),  # ₹150/hour
                    commission_earned=Decimal(random.randint(200, 1000)),
                    tips_earned=Decimal(random.randint(0, 500))
                )
