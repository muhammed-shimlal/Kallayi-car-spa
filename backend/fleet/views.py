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
        """Lookup a vehicle by plate number across CustomerVehicle & Fleet models."""
        plate = request.query_params.get('plate', '').strip()
        if not plate:
            return Response({'error': 'No plate provided'}, status=400)
        
        clean_plate = plate.replace('-', '').replace(' ', '').upper()

        # 1. Search CustomerVehicle
        from customers.models import CustomerVehicle
        cv = CustomerVehicle.objects.filter(plate_number__iexact=plate).select_related('customer').first()
        if not cv:
            for cand in CustomerVehicle.objects.all()[:200]:
                if cand.plate_number and cand.plate_number.replace('-', '').replace(' ', '').upper() == clean_plate:
                    cv = cand
                    break

        if cv:
            customer_name = "Walk-In Customer"
            customer_phone = ""
            if cv.customer:
                customer_name = cv.customer.get_full_name() or cv.customer.first_name or cv.customer.username
                if hasattr(cv.customer, 'customer') and cv.customer.customer.phone_number:
                    customer_phone = cv.customer.customer.phone_number
                elif hasattr(cv.customer, 'phone_number') and cv.customer.phone_number:
                    customer_phone = cv.customer.phone_number
                elif cv.customer.username and not cv.customer.username.startswith("guest_"):
                    customer_phone = cv.customer.username

            return Response({
                'plate_number': cv.plate_number,
                'make': cv.make,
                'model': cv.model,
                'vehicle_type': cv.vehicle_type,
                'color': cv.color,
                'phone': customer_phone,
                'owner_phone': customer_phone,
                'customer_name': customer_name
            })

        # 2. Search Fleet Vehicle
        vehicle = Vehicle.objects.filter(plate_number__iexact=plate).select_related('owner__user').first()
        if not vehicle:
            for cand in Vehicle.objects.all()[:200]:
                if cand.plate_number and cand.plate_number.replace('-', '').replace(' ', '').upper() == clean_plate:
                    vehicle = cand
                    break

        if vehicle and vehicle.owner:
            customer_name = vehicle.owner.user.first_name or vehicle.owner.user.username if vehicle.owner.user else "Customer"
            owner_phone = vehicle.owner.phone_number or ""
            return Response({
                'plate_number': vehicle.plate_number,
                'make': vehicle.make,
                'model': vehicle.model,
                'phone': owner_phone,
                'owner_phone': owner_phone,
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
