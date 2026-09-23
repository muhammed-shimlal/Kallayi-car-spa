from datetime import timedelta
from unittest.mock import patch
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from core.models import PasswordResetOTP
from customers.models import Customer


class OTPPasswordResetTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='9876543210', password='OldPassword123')
        self.customer = Customer.objects.create(user=self.user, phone_number='9876543210')
        self.client = APIClient()

    @patch('notifications.services.WhatsAppNotificationService.send_message')
    def test_request_otp_success_and_invalidation(self, mock_send):
        mock_send.return_value = {"success": True}

        # First request
        res1 = self.client.post('/api/password-reset/request-otp/', {'phone_number': '9876543210'}, format='json')
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        otp1 = PasswordResetOTP.objects.filter(phone_number='919876543210').order_by('-created_at').first()
        self.assertIsNotNone(otp1)
        self.assertFalse(otp1.is_used)

        # Second request for same phone number -> Should invalidate first OTP
        res2 = self.client.post('/api/password-reset/request-otp/', {'phone_number': '9876543210'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        otp1.refresh_from_db()
        self.assertTrue(otp1.is_used)

        otp2 = PasswordResetOTP.objects.filter(phone_number='919876543210', is_used=False).first()
        self.assertIsNotNone(otp2)
        self.assertNotEqual(otp1.id, otp2.id)

    @patch('notifications.services.WhatsAppNotificationService.send_message')
    def test_verify_otp_success_and_password_update(self, mock_send):
        mock_send.return_value = {"success": True}

        # Request OTP
        self.client.post('/api/password-reset/request-otp/', {'phone_number': '9876543210'}, format='json')
        otp_record = PasswordResetOTP.objects.filter(phone_number='919876543210', is_used=False).first()

        # Verify OTP & Reset Password
        verify_res = self.client.post('/api/password-reset/verify-otp/', {
            'phone_number': '9876543210',
            'otp_code': otp_record.otp_code,
            'new_password': 'NewPassword123'
        }, format='json')

        self.assertEqual(verify_res.status_code, status.HTTP_200_OK)
        otp_record.refresh_from_db()
        self.assertTrue(otp_record.is_used)

        # Verify user can authenticate with new password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewPassword123'))

    def test_expired_otp_rejection(self):
        # Create an expired OTP (older than 5 minutes)
        expired_time = timezone.now() - timedelta(minutes=6)
        otp_record = PasswordResetOTP.objects.create(
            phone_number='919876543210',
            otp_code='123456',
            is_used=False
        )
        PasswordResetOTP.objects.filter(id=otp_record.id).update(created_at=expired_time)

        verify_res = self.client.post('/api/password-reset/verify-otp/', {
            'phone_number': '9876543210',
            'otp_code': '123456',
            'new_password': 'NewPassword123'
        }, format='json')

        self.assertEqual(verify_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid or expired OTP', verify_res.data.get('error', ''))


class ChangePasswordAPITest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='9207320065', password='OldPassword@123')
        self.client = APIClient()

    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)

        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'OldPassword@123',
            'new_password': 'SuperNewPass@2026',
            'confirm_password': 'SuperNewPass@2026',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))
        self.assertIn('token', res.data)

        # Check DB reflects updated password
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('SuperNewPass@2026'))
        self.assertFalse(self.user.check_password('OldPassword@123'))

    def test_change_password_wrong_current(self):
        self.client.force_authenticate(user=self.user)

        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'WrongPassword@999',
            'new_password': 'SuperNewPass@2026',
            'confirm_password': 'SuperNewPass@2026',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res.data.get('success', True))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldPassword@123'))

    def test_change_password_mismatch(self):
        self.client.force_authenticate(user=self.user)

        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'OldPassword@123',
            'new_password': 'SuperNewPass@2026',
            'confirm_password': 'DifferentPass@2026',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_same_as_current(self):
        self.client.force_authenticate(user=self.user)

        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'OldPassword@123',
            'new_password': 'OldPassword@123',
            'confirm_password': 'OldPassword@123',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_too_short(self):
        self.client.force_authenticate(user=self.user)

        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'OldPassword@123',
            'new_password': 'Short1',
            'confirm_password': 'Short1',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_unauthenticated(self):
        res = self.client.post('/api/v1/core/change-password/', {
            'current_password': 'OldPassword@123',
            'new_password': 'SuperNewPass@2026',
            'confirm_password': 'SuperNewPass@2026',
        }, format='json')

        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

