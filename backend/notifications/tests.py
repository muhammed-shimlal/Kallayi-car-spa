from unittest.mock import patch
from django.test import TestCase, override_settings
from django.utils import timezone
from django.contrib.auth.models import User
from bookings.models import Booking, ServicePackage
from customers.models import Customer, CustomerVehicle
from finance.models import Invoice
from notifications.models import NotificationLog
from notifications.services import WhatsAppNotificationService


@override_settings(
    WHATSAPP_API_URL='https://graph.facebook.com/v18.0',
    WHATSAPP_ACCESS_TOKEN='test_access_token',
    WHATSAPP_PHONE_NUMBER_ID='test_phone_id'
)
class WhatsAppNotificationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='9876543210', email='test@example.com', password='pwd')
        self.customer = Customer.objects.create(user=self.user, phone_number='9876543210', outstanding_balance=250.00)
        self.vehicle = CustomerVehicle.objects.create(customer=self.user, make='Test', model='Test Car', plate_number='KL-10-AB-1234')
        self.package = ServicePackage.objects.create(name='Super Wash', price=500.00)

    def test_phone_sanitization(self):
        self.assertEqual(WhatsAppNotificationService.sanitize_phone_number('9876543210'), '919876543210')
        self.assertEqual(WhatsAppNotificationService.sanitize_phone_number('+91 98765 43210'), '919876543210')
        self.assertEqual(WhatsAppNotificationService.sanitize_phone_number('09876543210'), '919876543210')
        self.assertEqual(WhatsAppNotificationService.sanitize_phone_number('919876543210'), '919876543210')

    @patch('requests.post')
    def test_booking_creation_whatsapp_notification(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"messaging_product": "whatsapp", "messages": [{"id": "wamid.123"}]}

        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            address='123 Main Street'
        )

        self.assertTrue(NotificationLog.objects.filter(booking=booking, type='WHATSAPP').exists())
        log = NotificationLog.objects.get(booking=booking)
        self.assertIn("CONFIRMED", log.message)
        self.assertEqual(log.recipient, '919876543210')

    @patch('requests.post')
    def test_booking_status_update_whatsapp_notification(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"messaging_product": "whatsapp", "messages": [{"id": "wamid.124"}]}

        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            address='123 Main Street',
            status='IN_PROGRESS'
        )

        booking.status = 'READY'
        booking.save()

        logs = NotificationLog.objects.filter(booking=booking, type='WHATSAPP')
        self.assertGreaterEqual(logs.count(), 2)
        ready_log = logs.filter(message__contains="READY FOR PICKUP").first()
        self.assertIsNotNone(ready_log)

    @patch('requests.post')
    def test_khata_reminder_whatsapp_notification(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"messaging_product": "whatsapp", "messages": [{"id": "wamid.125"}]}

        success = WhatsAppNotificationService.send_khata_reminder(self.customer, self.customer.outstanding_balance)
        self.assertTrue(success)

        log = NotificationLog.objects.filter(type='WHATSAPP', recipient='919876543210', message__contains='Khata').first()
        self.assertIsNotNone(log)
        self.assertIn('Rs.250.0', log.message)

    @patch('requests.post')
    def test_send_invoice_pdf_on_payment(self, mock_post):
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {"messaging_product": "whatsapp", "messages": [{"id": "wamid.126"}]}

        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            address='123 Main Street'
        )

        invoice = Invoice.objects.create(
            booking=booking,
            amount=500.00,
            is_paid=False,
            payment_method='CASH'
        )

        # Mark paid to trigger signal
        invoice.is_paid = True
        invoice.save()

        pdf_log = NotificationLog.objects.filter(booking=booking, type='WHATSAPP', message__contains='[PDF Invoice Sent]').first()
        self.assertIsNotNone(pdf_log)
