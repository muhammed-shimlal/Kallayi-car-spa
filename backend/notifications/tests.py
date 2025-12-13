from django.test import TestCase
from django.utils import timezone
from bookings.models import Booking, ServicePackage
from customers.models import Customer
from fleet.models import Vehicle
from notifications.models import NotificationLog
from django.contrib.auth.models import User

class NotificationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cust', email='test@example.com', password='pwd')
        self.customer = Customer.objects.create(user=self.user)
        self.vehicle = Vehicle.objects.create(owner=self.customer, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Wash', price=10.0)

    def test_booking_creation_notification(self):
        # Create booking should trigger signal
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            address='123 St'
        )
        
        # Check log
        self.assertTrue(NotificationLog.objects.filter(booking=booking, type='EMAIL').exists())
        log = NotificationLog.objects.get(booking=booking)
        self.assertIn("Booking Confirmed", log.message)
        self.assertEqual(log.recipient, 'test@example.com')

    def test_booking_completion_notification(self):
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            address='123 St',
            status='IN_PROGRESS'
        )
        
        # Update status to COMPLETED
        booking.status = 'COMPLETED'
        booking.save()
        
        # Check log (should have 2 logs now: creation and completion)
        logs = NotificationLog.objects.filter(booking=booking)
        self.assertEqual(logs.count(), 2)
        completion_log = logs.filter(message__contains="is complete").first()
        self.assertIsNotNone(completion_log)
