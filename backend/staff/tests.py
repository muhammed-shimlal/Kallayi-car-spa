from decimal import Decimal
from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

from staff.models import StaffProfile
from customers.models import Customer, CustomerVehicle
from bookings.models import ServicePackage, Booking
from finance.models import Invoice


class StaffDashboardStatsAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # 1. Create Staff User & Profile with 40% commission
        self.staff_user = User.objects.create_user(
            username='9207320065',
            password='StaffPassword@123',
            first_name='Shimlal',
            is_staff=True
        )
        self.staff_profile = StaffProfile.objects.create(
            user=self.staff_user,
            role='WASHER',
            phone_number='9207320065',
            salary_type='COMMISSION',
            commission_type='PERCENTAGE',
            commission_rate=Decimal('40.00'),
            is_active=True
        )

        # 2. Create Customer & Vehicle
        self.cust_user = User.objects.create_user(
            username='9876543210',
            password='CustPassword@123'
        )
        self.customer = Customer.objects.create(
            user=self.cust_user,
            phone_number='9876543210'
        )
        self.vehicle = CustomerVehicle.objects.create(
            customer=self.cust_user,
            plate_number='KL 11 AZ 9999',
            make='Maruti Suzuki',
            model='Swift',
            vehicle_type='HATCHBACK'
        )

        # 3. Create Service Package
        self.pkg = ServicePackage.objects.create(
            name='Premium Foam Wash',
            price=Decimal('400.00'),
            duration_minutes=45
        )

        # 4. Completed Booking Today with Counter Negotiated Final Price: ₹350 (bargained down from ₹400)
        self.completed_today = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            technician=self.staff_user,
            service_package=self.pkg,
            time_slot=timezone.now(),
            start_time=timezone.now() - timedelta(minutes=40),
            end_time=timezone.now() - timedelta(minutes=5),
            status='COMPLETED',
            base_price=Decimal('400.00'),
            final_price=Decimal('350.00')
        )

        # Cash invoice for this completed wash (explicitly collected by staff member)
        self.invoice_today = Invoice.objects.create(
            booking=self.completed_today,
            amount=Decimal('350.00'),
            base_price=Decimal('400.00'),
            final_price=Decimal('350.00'),
            payment_method='CASH',
            cash_collected_by_staff=self.staff_user,
            collector_type='STAFF',
            is_paid=True
        )

        # 5. In-Progress Booking Today (Should NOT count towards revenue/commission yet)
        self.in_progress_today = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            technician=self.staff_user,
            service_package=self.pkg,
            time_slot=timezone.now(),
            start_time=timezone.now(),
            status='IN_PROGRESS',
            base_price=Decimal('400.00'),
            final_price=Decimal('400.00')
        )

        # 6. Completed Booking from Yesterday (Must NOT be counted in today's stats)
        yesterday_time = timezone.now() - timedelta(days=1)
        self.completed_yesterday = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            technician=self.staff_user,
            service_package=self.pkg,
            time_slot=yesterday_time,
            end_time=yesterday_time + timedelta(minutes=40),
            status='COMPLETED',
            base_price=Decimal('400.00'),
            final_price=Decimal('400.00')
        )
        Invoice.objects.create(
            booking=self.completed_yesterday,
            amount=Decimal('400.00'),
            final_price=Decimal('400.00'),
            payment_method='CASH',
            is_paid=True
        )

    def test_dashboard_stats_success(self):
        self.client.force_authenticate(user=self.staff_user)

        res = self.client.get('/api/v1/staff/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        data = res.data
        # 1. Cars washed today count & list
        self.assertEqual(data['cars_washed_today']['count'], 1)
        self.assertEqual(len(data['cars_washed_today']['list']), 1)
        self.assertEqual(data['completed_count'], 1)
        self.assertEqual(data['in_progress_count'], 1)

        # 2. Total revenue today must strictly match final_price (₹350, not base ₹400)
        self.assertEqual(data['total_revenue_today'], 350.0)

        # 3. Commission must strictly be based on final_price (40% of ₹350 = ₹140, NOT 40% of ₹400 = ₹160)
        self.assertEqual(data['labor_cost_commission'], 140.0)

        # 4. Cash in hand must strictly reflect the ₹350 collected cash
        self.assertEqual(data['cash_in_hand'], 350.0)

        # Verify completed vehicle itemized dossier
        car_item = data['cars_washed_today']['list'][0]
        self.assertEqual(car_item['plate_number'], 'KL 11 AZ 9999')
        self.assertEqual(car_item['vehicle_model'], 'Maruti Suzuki Swift')
        self.assertEqual(car_item['service_package'], 'Premium Foam Wash')
        self.assertEqual(car_item['final_price'], 350.0)
        self.assertEqual(car_item['commission_earned'], 140.0)

    def test_dashboard_stats_direct_route_alias(self):
        """Verify both /api/v1/staff/dashboard-stats/ and /api/staff/dashboard-stats/ work identically"""
        self.client.force_authenticate(user=self.staff_user)

        res = self.client.get('/api/staff/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['completed_count'], 1)
        self.assertEqual(res.data['total_revenue_today'], 350.0)

    def test_dashboard_stats_unauthenticated(self):
        res = self.client.get('/api/v1/staff/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_stats_customer_forbidden(self):
        self.client.force_authenticate(user=self.cust_user)
        res = self.client.get('/api/v1/staff/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_counter_checkout_does_not_inflate_staff_cash_in_hand(self):
        """Verify that when cash is collected at the counter/admin, staff cash_in_hand is 0"""
        self.invoice_today.collector_type = 'ADMIN'
        self.invoice_today.cash_collected_by_staff = None
        self.invoice_today.save()

        self.client.force_authenticate(user=self.staff_user)
        res = self.client.get('/api/v1/staff/dashboard-stats/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Cash in hand for this staff member must be 0, even though booking was washed by this staff
        self.assertEqual(res.data['cash_in_hand'], 0.0)
        self.assertEqual(res.data['payable_by_staff'], 0.0)
        # Commission and revenue are still credited properly
        self.assertEqual(res.data['labor_cost_commission'], 140.0)
        self.assertEqual(res.data['total_revenue_today'], 350.0)
