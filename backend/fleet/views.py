from rest_framework import viewsets
from .models import Vehicle, TechnicianLocation
from .serializers import VehicleSerializer, TechnicianLocationSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

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
