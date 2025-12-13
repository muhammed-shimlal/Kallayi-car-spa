from django.test import TestCase
from django.utils import timezone
from .models import Booking, ServicePackage
from customers.models import Customer
from fleet.models import Vehicle
from django.contrib.auth.models import User
from datetime import timedelta
from .serializers import BookingSerializer

class BookingValidationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.customer = Customer.objects.create(user=self.user)
        self.vehicle = Vehicle.objects.create(owner=self.customer, model='Test Car', plate_number='TEST-123')
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
