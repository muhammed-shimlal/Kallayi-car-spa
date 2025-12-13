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
        technician_id = self.request.query_params.get('technician_id')
        if technician_id:
            return TechnicianLocation.objects.filter(technician_id=technician_id)
        return TechnicianLocation.objects.all()
