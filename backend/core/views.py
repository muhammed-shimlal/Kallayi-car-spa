from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from staff.models import StaffProfile
from .serializers import UserSerializer, StaffProfileSerializer, StaffCreateSerializer
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
        # Attach Role Info
        data['is_staff_user'] = user.is_staff
        
        # Check Staff App Profile
        if hasattr(user, 'staff_profile'):
            data['role'] = user.staff_profile.role
            data['staff_profile_id'] = user.staff_profile.id
        elif hasattr(user, 'customer'):
            data['role'] = 'CUSTOMER'
            data['customer_id'] = user.customer.id
        elif user.is_superuser:
            data['role'] = 'ADMIN'
        elif user.is_staff:
            data['role'] = 'MANAGER'
        else:
            data['role'] = 'CUSTOMER'
            
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
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

import smtplib
import traceback
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request(request):
    """
    Endpoint: POST /api/password-reset/
    Generates a secure password reset token (using default_token_generator and uidb64),
    constructs the frontend reset URL, and emails the user.
    """
    print("\n==================================================")
    print("🔒 [PASSWORD RESET API] Incoming Request Received")
    print(f"👉 Request Payload: {request.data}")

    email_input = request.data.get('email') or request.data.get('username') or request.data.get('phone', '')
    email_input = str(email_input).strip()
    
    if not email_input:
        print("❌ [PASSWORD RESET ERROR] Email input is blank.")
        return Response({'error': 'Please provide a valid email address or phone number.'}, status=status.HTTP_400_BAD_REQUEST)

    # Domain Validation: Restrict to @gmail.com to prevent temp/disposable emails
    if '@' in email_input:
        domain = email_input.split('@')[-1].lower().strip()
        if domain != 'gmail.com':
            print(f"❌ [PASSWORD RESET ERROR] Disallowed domain '{domain}'. Must be @gmail.com.")
            return Response({
                'error': 'Please use a valid Gmail address (@gmail.com). Temp mails are not allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)

    clean_phone = normalize_phone(email_input)
    q_filter = Q(email__iexact=email_input) | Q(username__iexact=email_input)
    if clean_phone and len(clean_phone) >= 7:
        q_filter |= Q(username__icontains=clean_phone)
        q_filter |= Q(customer__phone_number__icontains=clean_phone)

    users = UserModel.objects.filter(q_filter)
    print(f"🔍 [PASSWORD RESET DB SEARCH] Query filter: {q_filter}")
    print(f"📊 [PASSWORD RESET DB RESULT] Found {users.count()} matching user(s).")

    email_sent_count = 0
    smtp_errors = []

    if users.exists():
        for user in users:
            target_email = user.email
            if not target_email and '@' in email_input:
                user.email = email_input
                user.save()
                target_email = email_input

            print(f"👤 [USER MATCH] ID: {user.pk} | Username: {user.username} | Email: {target_email}")

            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
            reset_url = f"{frontend_url}/reset-password/{uidb64}/{token}"

            print(f"🔗 [RESET URL GENERATED] {reset_url}")

            if target_email:
                subject = "Password Reset Request - Kallayi Car Spa"
                message = f"Hello {user.get_full_name() or user.username},\n\nYou requested a password reset for your Kallayi Car Spa account.\n\nPlease click the link below to reset your password:\n{reset_url}\n\nIf you did not request this, please ignore this email."
                html_content = f"""
                <div style="font-family: Arial, sans-serif; background-color: #070709; color: #ffffff; padding: 30px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid rgba(255,255,255,0.1);">
                    <h2 style="color: #01FFFF; margin-top: 0; font-size: 20px;">Kallayi Car Spa — Password Reset</h2>
                    <p style="color: #ccc; font-size: 14px;">Hello <strong>{user.get_full_name() or user.username}</strong>,</p>
                    <p style="color: #aaa; font-size: 13px; line-height: 1.5;">We received a request to reset your account password. Click the button below to establish a new password:</p>
                    <p style="margin: 25px 0; text-align: center;">
                        <a href="{reset_url}" style="background-color: #E52323; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
                    </p>
                    <p style="font-size: 11px; color: #8E939B;">Or copy and paste this URL into your browser:<br/><a href="{reset_url}" style="color: #01FFFF;">{reset_url}</a></p>
                    <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;"/>
                    <p style="font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px;">KALLAYI CAR SPA // MANJERI</p>
                </div>
                """
                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Kallayi Car Spa <kallayicarspa@gmail.com>')
                print(f"✉️ [ATTEMPTING EMAIL DISPATCH] From: {from_email} -> To: {target_email}")
                
                try:
                    msg = EmailMultiAlternatives(subject, message, from_email, [target_email])
                    msg.attach_alternative(html_content, "text/html")
                    # Set fail_silently=False so errors throw exceptions for logging!
                    msg.send(fail_silently=False)
                    email_sent_count += 1
                    print(f"✅ [EMAIL SENT SUCCESS] Password reset email successfully dispatched to {target_email}!")
                except smtplib.SMTPAuthenticationError as e:
                    err_msg = f"Gmail SMTP Authentication Failed: Invalid EMAIL_HOST_USER or App Password. Detail: {e}"
                    print(f"❌ [SMTP AUTH ERROR] {err_msg}")
                    smtp_errors.append(err_msg)
                except smtplib.SMTPException as e:
                    err_msg = f"SMTP Transmission Error: {e}"
                    print(f"❌ [SMTP ERROR] {err_msg}")
                    smtp_errors.append(err_msg)
                except Exception as e:
                    err_msg = f"Email Sending Failed: {str(e)}"
                    print(f"❌ [EMAIL FAILED] {err_msg}")
                    print(traceback.format_exc())
                    smtp_errors.append(err_msg)
            else:
                print(f"⚠️ [NO EMAIL ON USER] User ID {user.pk} does not have an email address associated.")
    else:
        print("⚠️ [NO USER MATCH] No registered user found matching query.")

    print("==================================================\n")

    if smtp_errors and email_sent_count == 0:
        return Response({
            'error': f"Failed to send reset email due to server mail configuration: {smtp_errors[0]}"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({
        'message': 'If an account exists matching that email, a password reset link has been sent to your inbox.',
        'details': {
            'email_sent': email_sent_count > 0,
            'match_found': users.exists()
        }
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm(request):
    """
    Endpoint: POST /api/password-reset-confirm/
    Verifies the uidb64 and token, and securely sets the new password.
    """
    uidb64 = request.data.get('uidb64') or request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password') or request.data.get('password')

    if not uidb64 or not token or not new_password:
        return Response({'error': 'Missing required parameters (uidb64, token, new_password).'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = UserModel.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, UserModel.DoesNotExist):
        return Response({'error': 'Invalid reset link or user does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({'error': 'The password reset link is invalid or has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

    if len(str(new_password).strip()) < 6:
        return Response({'error': 'Password must be at least 6 characters long.'}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(str(new_password).strip())
    user.save()

    return Response({
        'message': 'Password has been updated successfully! You may now log in with your new password.'
    }, status=status.HTTP_200_OK)


