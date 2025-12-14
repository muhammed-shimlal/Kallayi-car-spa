from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from staff.models import StaffProfile
from .serializers import UserSerializer, StaffProfileSerializer, StaffCreateSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    # permission_classes = [permissions.IsAuthenticated] # Commented out for easier testing initially

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        user = request.user
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
            data['role'] = 'UNKNOWN'
            
        return Response(data)

class StaffViewSet(viewsets.ModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    # permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def create_staff(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        profile = self.get_object()
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
