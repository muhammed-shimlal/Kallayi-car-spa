from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.models import User
from staff.models import StaffProfile
from .serializers import (
    UserSerializer, StaffProfileSerializer, StaffCreateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    ChangePasswordSerializer
)
from .permissions import IsAdmin, IsStaffUser, IsOwnerOrAdmin, get_user_role


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        user = request.user
        
        # Auto-claim/link guest Customer profile if customer user
        if not user.is_staff and not user.is_superuser:
            from customers.views import claim_or_link_customer
            claim_or_link_customer(user)

        data = UserSerializer(user).data
        data['is_superuser'] = bool(user.is_superuser)
        data['is_staff'] = bool(user.is_staff)
        data['is_staff_user'] = bool(user.is_staff)
        
        # Attach Role Info from centralized get_user_role logic
        data['role'] = get_user_role(user)

        if hasattr(user, 'staff_profile'):
            data['staff_profile_id'] = user.staff_profile.id
        if hasattr(user, 'customer'):
            data['customer_id'] = user.customer.id
            data['outstanding_balance'] = float(user.customer.outstanding_balance or 0.0)
            data['credit_limit'] = float(user.customer.credit_limit or 0.0)
            data['phone_number'] = user.customer.phone_number or ""
            
        return Response(data)


class StaffViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.filter(is_active=True, user__is_active=True)
    serializer_class = StaffProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdmin])
    def create_staff(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsStaffUser])
    def update_location(self, request, pk=None):
        profile = self.get_object()
        # Ensure user can only update their own location unless Admin
        if request.user != profile.user and get_user_role(request.user) not in ['ADMIN', 'MANAGER']:
            return Response({'error': 'You can only update your own location.'}, status=status.HTTP_403_FORBIDDEN)

        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        
        if lat is not None and lng is not None:
            profile.current_latitude = lat
            profile.current_longitude = lng
            from django.utils import timezone
            profile.last_location_update = timezone.now()
            profile.save()
            return Response({'status': 'location updated'})
        return Response({'error': 'latitude and longitude required'}, status=status.HTTP_400_BAD_REQUEST)


from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import get_user_model
from django.db.models import Q
from core.backends import normalize_phone

UserModel = get_user_model()

class CustomObtainAuthToken(ObtainAuthToken):
    """
    Custom Token Auth View that differentiates between:
    1) User Not Found (404 response with error="user_not_found")
    2) Incorrect Password (400 response with error="invalid_credentials")
    """
    def post(self, request, *args, **kwargs):
        username = request.data.get('username') or request.data.get('phone')

        if username:
            clean_phone = normalize_phone(str(username))
            q_filter = Q(username__iexact=username) | Q(email__iexact=username)
            if clean_phone and len(clean_phone) >= 7:
                q_filter |= Q(username__icontains=clean_phone)
                q_filter |= Q(customer__phone_number__icontains=clean_phone)
                q_filter |= Q(username=clean_phone)
                q_filter |= Q(username=f"+91{clean_phone}")

            user_exists = UserModel.objects.filter(q_filter).exists()
            if not user_exists:
                return Response(
                    {"error": "user_not_found", "message": "Phone number or email is not registered."},
                    status=status.HTTP_404_NOT_FOUND
                )

        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "invalid_credentials", "message": "Incorrect access password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user_id': user.pk, 'username': user.username})


from django.contrib.auth.tokens import default_token_generator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.conf import settings
from notifications.services import WhatsAppNotificationService
import logging

import secrets
from .models import PasswordResetOTP
from .serializers import (
    UserSerializer, StaffProfileSerializer, StaffCreateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer,
    PasswordResetOTPRequestSerializer, PasswordResetOTPVerifySerializer
)

@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset_otp(request):
    """
    Endpoint: POST /api/password-reset/request-otp/
    Generates a cryptographically secure 6-digit numeric OTP, invalidates previous unverified OTPs
    for the phone number, saves a new PasswordResetOTP (5-min validity), and dispatches it via WhatsApp.
    """
    serializer = PasswordResetOTPRequestSerializer(data=request.data)
    if not serializer.is_valid():
        first_err = list(serializer.errors.values())[0]
        if isinstance(first_err, list):
            first_err = first_err[0]
        return Response({'error': first_err, 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    phone_input = serializer.validated_data['phone_number']
    clean_phone = WhatsAppNotificationService.sanitize_phone_number(phone_input)
    raw_digits = normalize_phone(phone_input)

    if not clean_phone or len(clean_phone) < 7:
        return Response({'error': 'Please enter a valid phone number (at least 7 digits).'}, status=status.HTTP_400_BAD_REQUEST)

    q_phone = (
        Q(username__icontains=raw_digits) |
        Q(customer__phone_number__icontains=raw_digits) |
        Q(staff_profile__phone_number__icontains=raw_digits) |
        Q(username=raw_digits) |
        Q(username=clean_phone) |
        Q(username=f"+{clean_phone}")
    )
    users = UserModel.objects.filter(q_phone).distinct()

    if not users.exists():
        return Response({'error': 'No account found matching this phone number.'}, status=status.HTTP_400_BAD_REQUEST)

    # Invalidate any previous unverified OTPs for this phone number
    PasswordResetOTP.objects.filter(Q(phone_number=clean_phone) | Q(phone_number=raw_digits), is_used=False).update(is_used=True)

    # Generate cryptographically secure 6-digit OTP
    otp_code = f"{secrets.SystemRandom().randint(100000, 999999)}"

    # Save new OTP record
    PasswordResetOTP.objects.create(
        phone_number=clean_phone,
        otp_code=otp_code
    )

    # Dispatch WhatsApp OTP message
    success = WhatsAppNotificationService.send_password_reset_otp(clean_phone, otp_code)

    return Response({
        'message': 'A 6-digit password reset OTP code has been dispatched to your WhatsApp number.',
        'details': {
            'phone_number': clean_phone,
            'otp_dispatched': bool(success),
            'valid_minutes': 5
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_otp(request):
    """
    Endpoint: POST /api/password-reset/verify-otp/
    Verifies phone number and 6-digit OTP code within 5-minute validity window,
    resets user password, and marks OTP as used.
    """
    serializer = PasswordResetOTPVerifySerializer(data=request.data)
    if not serializer.is_valid():
        first_err = list(serializer.errors.values())[0]
        if isinstance(first_err, list):
            first_err = first_err[0]
        return Response({'error': first_err, 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    phone_input = serializer.validated_data['phone_number']
    otp_code = serializer.validated_data['otp_code']
    new_password = serializer.validated_data['new_password']

    clean_phone = WhatsAppNotificationService.sanitize_phone_number(phone_input)
    raw_digits = normalize_phone(phone_input)

    # Query recent unused OTP for this phone number
    otp_entry = PasswordResetOTP.objects.filter(
        Q(phone_number=clean_phone) | Q(phone_number=raw_digits),
        otp_code=otp_code,
        is_used=False
    ).first()

    if not otp_entry or not otp_entry.is_valid(window_minutes=5):
        return Response({'error': 'Invalid or expired OTP code. Please request a new OTP.'}, status=status.HTTP_400_BAD_REQUEST)

    # Find matching user account(s)
    q_phone = (
        Q(username__icontains=raw_digits) |
        Q(customer__phone_number__icontains=raw_digits) |
        Q(staff_profile__phone_number__icontains=raw_digits) |
        Q(username=raw_digits) |
        Q(username=clean_phone) |
        Q(username=f"+{clean_phone}")
    )
    users = UserModel.objects.filter(q_phone).distinct()

    if not users.exists():
        return Response({'error': 'No user account found matching this phone number.'}, status=status.HTTP_400_BAD_REQUEST)

    for user in users:
        user.set_password(new_password)
        user.save()

    # Flag OTP as used
    otp_entry.is_used = True
    otp_entry.save()

    return Response({
        'message': 'Password has been reset successfully! You may now log in with your new password.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """
    Endpoint: POST /api/password-reset/
    Wrapper delegating to request_password_reset_otp.
    """
    return request_password_reset_otp(request)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """
    Endpoint: POST /api/password-reset-confirm/
    Supports both OTP verification and link verification.
    """
    if 'otp_code' in request.data:
        return verify_password_reset_otp(request)

    serializer = PasswordResetConfirmSerializer(data=request.data)
    if not serializer.is_valid():
        first_err = list(serializer.errors.values())[0][0] if serializer.errors else 'Invalid parameters.'
        return Response({'error': first_err, 'details': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    uidb64 = serializer.validated_data.get('uidb64')
    token = serializer.validated_data.get('token')
    new_password = serializer.validated_data.get('new_password')

    if not uidb64 or not token:
        return Response({'error': 'Missing reset parameters.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = UserModel.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        return Response({'error': 'Invalid reset link or user does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'The password reset link is invalid or has expired.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()

    return Response({
        'message': 'Password has been updated successfully! You may now log in with your new password.'
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def change_password_view(request):
    """
    Endpoint: POST /api/v1/core/change-password/
    Securely updates the authenticated user's password with old-password verification,
    complexity validation, and session token renewal.
    """
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first_err = list(serializer.errors.values())[0]
        if isinstance(first_err, list):
            first_err = first_err[0]
        return Response({
            'success': False,
            'error': str(first_err),
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

    new_password = serializer.validated_data['new_password']
    user = request.user
    user.set_password(new_password)
    user.save()

    from rest_framework.authtoken.models import Token
    Token.objects.filter(user=user).delete()
    new_token = Token.objects.create(user=user)

    return Response({
        'success': True,
        'message': 'Your password has been changed successfully.',
        'token': new_token.key
    }, status=status.HTTP_200_OK)




