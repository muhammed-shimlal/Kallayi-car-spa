from django.test import TestCase
from django.utils import timezone
from bookings.models import Booking, ServicePackage
from customers.models import Customer, CustomerVehicle
from finance.models import Invoice
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class InvoiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='driver', password='password', is_staff=True)
        self.cust_user = User.objects.create_user(username='cust', password='pwd')
        self.customer = Customer.objects.create(user=self.cust_user)
        self.vehicle = CustomerVehicle.objects.create(customer=self.cust_user, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Premium Wash', price=50.0, duration_minutes=60, description='Premium')
        self.client = APIClient()

    def test_auto_generate_invoice(self):
        self.client.force_authenticate(user=self.user)
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            technician=self.user,
            status='IN_PROGRESS'
        )

        # Complete the job via API
        url = f'/api/driver-jobs/{booking.id}/update_status/'
        response = self.client.post(url, {'status': 'COMPLETED'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if invoice was created
        self.assertTrue(Invoice.objects.filter(booking=booking).exists())
        invoice = Invoice.objects.get(booking=booking)
        self.assertEqual(invoice.amount, 50.0)
        self.assertFalse(invoice.is_paid)

    def test_pay_invoice(self):
        self.client.force_authenticate(user=self.user)
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            status='COMPLETED'
        )
        invoice = Invoice.objects.create(booking=booking, amount=50.0)

        url = f'/api/finance/invoices/{invoice.id}/'
        response = self.client.patch(url, {'is_paid': True, 'payment_method': 'CASH'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invoice.refresh_from_db()
        self.assertTrue(invoice.is_paid)
        self.assertEqual(invoice.payment_method, 'CASH')

from decimal import Decimal
from staff.models import StaffProfile
from finance.logic import calculate_staff_booking_commission, process_payroll_event
from finance.models import PayrollEntry

class DynamicCommissionAndDiscountTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='admin_test', password='password', is_staff=True, is_superuser=True)
        self.tech_user = User.objects.create_user(username='tech1', password='password', is_staff=True)
        self.staff_profile = StaffProfile.objects.create(
            user=self.tech_user,
            role='TECHNICIAN',
            commission_type='PERCENTAGE',
            commission_rate=Decimal('15.00')
        )
        self.cust_user = User.objects.create_user(username='customer1', password='password')
        self.customer = Customer.objects.create(user=self.cust_user, phone_number='9876543210')
        self.vehicle = CustomerVehicle.objects.create(
            customer=self.cust_user,
            make='Hyundai',
            model='Creta',
            plate_number='KL-55-A-9999',
            vehicle_type='SUV'
        )
        self.suv_package = ServicePackage.objects.create(
            name='SUV Full Detail',
            price=Decimal('500.00'),
            vehicle_type='SUV',
            description='SUV detailing'
        )

    def test_single_field_negotiated_discount_derivation(self):
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.suv_package,
            time_slot=timezone.now(),
            base_price=Decimal('500.00'),
            final_price=Decimal('400.00')
        )
        self.assertEqual(booking.discount_amount, Decimal('100.00'))
        self.assertEqual(booking.discount_percentage, Decimal('20.00'))

        invoice = Invoice.objects.create(booking=booking, amount=booking.final_price)
        self.assertEqual(invoice.base_price, Decimal('500.00'))
        self.assertEqual(invoice.final_price, Decimal('400.00'))
        self.assertEqual(invoice.discount_amount, Decimal('100.00'))
        self.assertEqual(invoice.discount_percentage, Decimal('20.00'))

    def test_dynamic_per_staff_commission(self):
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.suv_package,
            time_slot=timezone.now(),
            technician=self.tech_user,
            base_price=Decimal('500.00'),
            final_price=Decimal('400.00'),
            status='COMPLETED'
        )
        commission = calculate_staff_booking_commission(self.staff_profile, booking)
        # 15% of ₹400 collected final price = ₹60.00
        self.assertEqual(commission, Decimal('60.00'))

        process_payroll_event(booking)
        today = timezone.localdate()
        entry = PayrollEntry.objects.get(staff_user=self.tech_user, date=today)
        self.assertEqual(entry.commission_earned, Decimal('60.00'))

    def test_service_package_body_type_filtering(self):
        self.client.force_authenticate(user=self.user)
        hatchback_pkg = ServicePackage.objects.create(
            name='Hatchback Express',
            price=Decimal('300.00'),
            vehicle_type='HATCHBACK',
            description='Hatchback wash'
        )
        res = self.client.get('/api/service-packages/?vehicle_type=SUV')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        results = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
        pkg_ids = [p['id'] for p in results]
        self.assertIn(self.suv_package.id, pkg_ids)
        self.assertNotIn(hatchback_pkg.id, pkg_ids)
