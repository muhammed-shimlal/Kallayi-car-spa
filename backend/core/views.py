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


