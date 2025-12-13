from django.test import TestCase
from django.utils import timezone
from bookings.models import Booking, ServicePackage
from customers.models import Customer
from fleet.models import Vehicle
from finance.models import Invoice
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class InvoiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='driver', password='password')
        self.customer = Customer.objects.create(user=User.objects.create_user(username='cust', password='pwd'))
        self.vehicle = Vehicle.objects.create(owner=self.customer, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Premium Wash', price=50.0, duration_minutes=60, description='Premium')
        self.client = APIClient()

    def test_auto_generate_invoice(self):
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
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            status='COMPLETED'
        )
        invoice = Invoice.objects.create(booking=booking, amount=50.0)

        url = f'/api/invoices/{invoice.id}/'
        response = self.client.patch(url, {'is_paid': True, 'payment_method': 'CASH'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        invoice.refresh_from_db()
        self.assertTrue(invoice.is_paid)
        self.assertEqual(invoice.payment_method, 'CASH')
