from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from customers.models import Customer, CustomerVehicle
from bookings.models import Booking, ServicePackage
from django.utils import timezone

class CustomerAccountClaimingTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.phone = '9876543210'
        
        # 1. Admin creates a walk-in guest user and customer profile
        self.guest_user = User.objects.create(username=f"guest_{self.phone}", first_name="Walkin Guest")
        self.guest_customer = Customer.objects.create(user=self.guest_user, phone_number=self.phone, loyalty_points=50)
        
        # 2. Admin adds a vehicle for this guest
        self.vehicle = CustomerVehicle.objects.create(
            customer=self.guest_user,
            make="Toyota",
            model="Camry",
            plate_number="KL-10-AA-9999"
        )
        
        # 3. Admin creates a service package & booking for this guest
        self.package = ServicePackage.objects.create(name="Express Wash", price=300)
        self.booking = Booking.objects.create(
            customer=self.guest_customer,
            vehicle=self.vehicle,
            service_package=self.package,
            time_slot=timezone.now(),
            status="COMPLETED"
        )

    def test_guest_account_claimed_on_registration(self):
        # Register new customer with SAME phone number
        response = self.client.post('/api/customers/register/', {
            'name': 'Real Customer',
            'phone': self.phone,
            'password': 'SecurePassword123!'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        token = response.data['token']
        
        # Verify the new user account was created
        new_user = User.objects.get(username=self.phone)
        
        # Verify Customer profile was claimed (linked to new_user)
        claimed_customer = Customer.objects.get(id=self.guest_customer.id)
        self.assertEqual(claimed_customer.user, new_user)
        self.assertEqual(claimed_customer.loyalty_points, 80)
        
        # Verify CustomerVehicle was re-linked to new_user
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.customer, new_user)
        
        # Verify My Garage API returns the claimed vehicle
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token}')
        garage_res = self.client.get('/api/customer-vehicles/')
        self.assertEqual(garage_res.status_code, status.HTTP_200_OK)
        vehicles = garage_res.data.get('results', garage_res.data) if isinstance(garage_res.data, dict) else garage_res.data
        self.assertEqual(len(vehicles), 1)
        self.assertEqual(vehicles[0]['plate_number'], "KL-10-AA-9999")
        
        # Verify My Bookings returns the past booking
        bookings_res = self.client.get('/api/bookings/')
        self.assertEqual(bookings_res.status_code, status.HTTP_200_OK)
        bookings = bookings_res.data.get('results', bookings_res.data) if isinstance(bookings_res.data, dict) else bookings_res.data
        self.assertEqual(len(bookings), 1)
        self.assertEqual(bookings[0]['id'], self.booking.id)

class CustomerAuthenticationTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_and_login_with_phone_variants(self):
        # 1. Register user with phone "+91 98765 43210"
        reg_res = self.client.post('/api/customers/register/', {
            'name': 'John Doe',
            'phone': '+91 98765 43210',
            'password': 'MyStrongPassword123!'
        })
        self.assertEqual(reg_res.status_code, status.HTTP_201_CREATED)

        # 2. Login with 10-digit format "9876543210"
        login_res_1 = self.client.post('/api/api-token-auth/', {
            'username': '9876543210',
            'password': 'MyStrongPassword123!'
        })
        self.assertEqual(login_res_1.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res_1.data)

        # 3. Login with "+919876543210"
        login_res_2 = self.client.post('/api/api-token-auth/', {
            'username': '+919876543210',
            'password': 'MyStrongPassword123!'
        })
        self.assertEqual(login_res_2.status_code, status.HTTP_200_OK)
        self.assertIn('token', login_res_2.data)

        # 4. Verify incorrect password returns invalid_credentials (HTTP 400)
        login_res_bad = self.client.post('/api/api-token-auth/', {
            'username': '9876543210',
            'password': 'WrongPassword'
        })
        self.assertEqual(login_res_bad.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(login_res_bad.data.get('error'), 'invalid_credentials')

    def test_login_unregistered_user_returns_user_not_found(self):
        # Login with phone that is not in the system
        res = self.client.post('/api/api-token-auth/', {
            'username': '9111122222',
            'password': 'AnyPassword123!'
        })
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res.data.get('error'), 'user_not_found')


