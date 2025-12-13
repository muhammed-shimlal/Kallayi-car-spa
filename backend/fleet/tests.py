from django.test import TestCase
from django.contrib.auth.models import User
from fleet.models import TechnicianLocation
from rest_framework.test import APIClient
from rest_framework import status

class LocationTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='driver', password='password')
        self.client = APIClient()

    def test_update_location(self):
        # Create new location
        url = '/api/locations/'
        data = {
            'technician': self.user.id,
            'latitude': 12.9716,
            'longitude': 77.5946
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(TechnicianLocation.objects.filter(technician=self.user).exists())

        # Update existing location (via PUT/PATCH or just check if model supports it)
        # Our API is standard ModelViewSet, so it supports update.
        location = TechnicianLocation.objects.get(technician=self.user)
        url = f'/api/locations/{location.id}/'
        data = {
            'technician': self.user.id,
            'latitude': 13.0,
            'longitude': 78.0
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        location.refresh_from_db()
        self.assertEqual(location.latitude, 13.0)

    def test_get_location(self):
        TechnicianLocation.objects.create(technician=self.user, latitude=10.0, longitude=20.0)
        
        url = f'/api/locations/?technician_id={self.user.id}'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['latitude'], 10.0)
