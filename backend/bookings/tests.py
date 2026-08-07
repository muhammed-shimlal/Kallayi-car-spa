from django.test import TestCase
from django.utils import timezone
from .models import Booking, ServicePackage
from customers.models import Customer, CustomerVehicle
from django.contrib.auth.models import User
from datetime import timedelta
from .serializers import BookingSerializer

class BookingValidationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.customer = Customer.objects.create(user=self.user)
        self.vehicle = CustomerVehicle.objects.create(customer=self.user, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Basic Wash', price=10.0, duration_minutes=60, description='Basic')

    def test_prevent_double_booking(self):
        now = timezone.now()
        
        # Create first booking
        Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=now
        )
        
        # Try to create overlapping booking (same time)
        from .serializers import BookingSerializer
        data = {
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'service_package': self.package.id,
            'time_slot': now
        }
        serializer = BookingSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('This time slot is already booked.', str(serializer.errors))

    def test_allow_non_overlapping_booking(self):
        now = timezone.now()
        
        # Create first booking
        Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=now
        )
        
        # Create second booking after first one ends
        later = now + timedelta(minutes=61)
        data = {
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'service_package': self.package.id,
            'time_slot': later
        }
        serializer = BookingSerializer(data=data)
        self.assertTrue(serializer.is_valid())

class AvailableSlotsApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='slotuser', password='password')
        self.customer = Customer.objects.create(user=self.user)
        self.vehicle = CustomerVehicle.objects.create(customer=self.user, model='Slot Car', plate_number='SLOT-999')
        self.package = ServicePackage.objects.create(name='Deluxe Wash', price=20.0, duration_minutes=60, description='Deluxe')

    def test_available_slots_response_structure_and_availability(self):
        from rest_framework.test import APIClient
        from datetime import datetime, time
        
        client = APIClient()
        client.force_authenticate(user=self.user)

        try:
            from zoneinfo import ZoneInfo
        except ImportError:
            import pytz
            ZoneInfo = lambda tz_name: pytz.timezone(tz_name)

        ist_tz = ZoneInfo('Asia/Kolkata')
        tomorrow = (timezone.now().astimezone(ist_tz) + timedelta(days=1)).date()
        tomorrow_str = tomorrow.strftime("%Y-%m-%d")

        # Create a booking for tomorrow at 10:00 AM IST
        slot_10am_naive = datetime.combine(tomorrow, time(10, 0))
        slot_10am_dt = timezone.make_aware(slot_10am_naive, ist_tz)

        Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=slot_10am_dt
        )

        response = client.get(f'/api/bookings/available_slots/?date={tomorrow_str}')
        self.assertEqual(response.status_code, 200)
        self.assertIn('slots', response.data)
        
        slots = response.data['slots']
        # Check structure
        self.assertTrue(isinstance(slots, list))
        self.assertTrue(len(slots) > 0)
        
        # Check that 10:00 AM slot is marked unavailable
        slot_10am = next((s for s in slots if s['time'] == '10:00 AM'), None)
        self.assertIsNotNone(slot_10am)
        self.assertFalse(slot_10am['is_available'])

        # Check that another slot (e.g., 02:00 PM) is available
        slot_2pm = next((s for s in slots if s['time'] == '02:00 PM'), None)
        self.assertIsNotNone(slot_2pm)
        self.assertTrue(slot_2pm['is_available'])

