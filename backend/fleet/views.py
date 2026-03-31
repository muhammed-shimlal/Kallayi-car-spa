from rest_framework import viewsets
from rest_framework.decorators import action # <-- ADD THIS IMPORT
from rest_framework.response import Response # <-- ADD THIS IMPORT
from .models import Vehicle, TechnicianLocation
from .serializers import VehicleSerializer, TechnicianLocationSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
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
    
    def get_queryset(self):
        # Filter by technician if provided
        if technician_id:
            return TechnicianLocation.objects.filter(technician_id=technician_id)
        return TechnicianLocation.objects.all()

from .models import ServiceVehicle, FleetLog
from .serializers import ServiceVehicleSerializer, FleetLogSerializer

class ServiceVehicleViewSet(viewsets.ModelViewSet):
    queryset = ServiceVehicle.objects.all()
    serializer_class = ServiceVehicleSerializer

class FleetLogViewSet(viewsets.ModelViewSet):
    queryset = FleetLog.objects.all()
    serializer_class = FleetLogSerializer
    
    def perform_create(self, serializer):
        # Assign current user if logged in
        if self.request.user and self.request.user.is_authenticated:
            serializer.save(recorded_by=self.request.user)
        else:
            serializer.save()
