from django.test import TestCase
from django.utils import timezone
from .models import Booking, ServicePackage
from customers.models import Customer
from fleet.models import Vehicle
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

class DriverAppTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='driver', password='password')
        self.customer = Customer.objects.create(user=User.objects.create_user(username='cust', password='pwd'))
        self.vehicle = Vehicle.objects.create(owner=self.customer, model='Test Car', plate_number='TEST-123')
        self.package = ServicePackage.objects.create(name='Basic Wash', price=10.0, duration_minutes=60, description='Basic')
        self.client = APIClient()

    def test_get_driver_jobs(self):
        # Create a job assigned to the driver
        Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            technician=self.user,
            status='PENDING'
        )
        
        # Create a job NOT assigned to the driver
        Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            status='PENDING'
        )

        response = self.client.get(f'/api/driver-jobs/?technician_id={self.user.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['technician'], self.user.id)

    def test_update_job_status(self):
        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            technician=self.user,
            status='PENDING'
        )

        url = f'/api/driver-jobs/{booking.id}/update_status/'
        response = self.client.post(url, {'status': 'IN_PROGRESS'}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        booking.refresh_from_db()
        self.assertEqual(booking.status, 'IN_PROGRESS')
