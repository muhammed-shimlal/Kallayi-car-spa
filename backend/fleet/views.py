from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from core.permissions import IsAdmin, IsStaffUser, IsOwnerOrAdmin, get_user_role
from .models import Vehicle, TechnicianLocation, ServiceVehicle, FleetLog
from .serializers import VehicleSerializer, TechnicianLocationSerializer, ServiceVehicleSerializer, FleetLogSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in ['ADMIN', 'MANAGER', 'WASHER', 'DRIVER', 'TECHNICIAN']:
            return Vehicle.objects.all()
        if hasattr(user, 'customer'):
            return Vehicle.objects.filter(owner__user=user)
        return Vehicle.objects.none()

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Lookup a vehicle by plate number to auto-fill customer phone."""
        plate = request.query_params.get('plate', '').strip()
        if not plate:
            return Response({'error': 'No plate provided'}, status=400)
        
        # Search for exact plate match (case-insensitive)
        vehicle = Vehicle.objects.filter(plate_number__iexact=plate).select_related('owner__user').first()
        
        if vehicle and vehicle.owner:
            customer_name = vehicle.owner.user.first_name or vehicle.owner.user.username if vehicle.owner.user else "Customer"
            return Response({
                'phone': vehicle.owner.phone_number,
                'customer_name': customer_name
            })
        return Response({'error': 'Not found'}, status=404)


class TechnicianLocationViewSet(viewsets.ModelViewSet):
    queryset = TechnicianLocation.objects.all()
    serializer_class = TechnicianLocationSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]
    
    def get_queryset(self):
        technician_id = self.request.query_params.get('technician_id')
        if technician_id:
            return TechnicianLocation.objects.filter(technician_id=technician_id)
        return TechnicianLocation.objects.all()


class ServiceVehicleViewSet(viewsets.ModelViewSet):
    queryset = ServiceVehicle.objects.all()
    serializer_class = ServiceVehicleSerializer
    permission_classes = [IsAuthenticated, IsAdmin]


class FleetLogViewSet(viewsets.ModelViewSet):
    queryset = FleetLog.objects.all()
    serializer_class = FleetLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def perform_create(self, serializer):
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(recorded_by=self.request.user)
        else:
            serializer.save()
