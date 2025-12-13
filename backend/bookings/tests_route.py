from django.test import TestCase
from django.utils import timezone
from bookings.models import Booking, ServicePackage
from customers.models import Customer
from fleet.models import Vehicle
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class RouteOptimizationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='driver', password='password')
        self.customer = Customer.objects.create(user=User.objects.create_user(username='cust', password='pwd'))
        self.vehicle = Vehicle.objects.create(owner=self.customer, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Wash', price=10.0, duration_minutes=30)
        self.client = APIClient()

    def test_booking_address_storage(self):
        # Create booking with address
        url = '/api/bookings/'
        data = {
            'customer': self.customer.id,
            'vehicle': self.vehicle.id,
            'service_package': self.package.id,
            'time_slot': timezone.now(),
            'address': '123 Test St',
            'latitude': 10.0,
            'longitude': 20.0
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        booking = Booking.objects.get(id=response.data['id'])
        self.assertEqual(booking.address, '123 Test St')
        self.assertEqual(booking.latitude, 10.0)
        self.assertEqual(booking.longitude, 20.0)

    def test_driver_jobs_sorted_by_time(self):
        # Create two bookings at different times
        time1 = timezone.now()
        time2 = time1 + timezone.timedelta(hours=2)
        
        b1 = Booking.objects.create(
            customer=self.customer, vehicle=self.vehicle, service_package=self.package,
            time_slot=time2, technician=self.user, address='Job 2'
        )
        b2 = Booking.objects.create(
            customer=self.customer, vehicle=self.vehicle, service_package=self.package,
            time_slot=time1, technician=self.user, address='Job 1'
        )
        
        url = f'/api/driver-jobs/?technician_id={self.user.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Should be sorted by time, so b2 (time1) comes before b1 (time2)
        self.assertEqual(response.data[0]['id'], b2.id)
        self.assertEqual(response.data[1]['id'], b1.id)
