from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Booking, ServicePackage
from .serializers import BookingSerializer, ServicePackageSerializer
from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAuthenticated, AllowAny
from django.utils.dateparse import parse_date, parse_datetime
from datetime import timedelta, datetime, time
from django.db.models import Q
from django.contrib.auth.models import User
from staff.models import StaffProfile

class IsAdminUserOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class ServicePackageViewSet(viewsets.ModelViewSet):
    queryset = ServicePackage.objects.all()
    serializer_class = ServicePackageSerializer
    permission_classes = [IsAdminUserOrReadOnly]

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        date_str = request.query_params.get('date')
        package_id = request.query_params.get('service_package_id')
        
        if not date_str or not package_id:
            return Response({'error': 'Missing date or service_package_id'}, status=400)
            
        try:
            target_date = parse_date(date_str)
            package = ServicePackage.objects.get(id=package_id)
        except (ValueError, ServicePackage.DoesNotExist):
             return Response({'error': 'Invalid date or package'}, status=400)

        # 1. Get all active Technicians/Washers
        # Using the Staff App profile
        techs = StaffProfile.objects.filter(role='WASHER', is_active=True)
        if not techs.exists():
            return Response({'error': 'No technicians available'}, status=400)

        # 2. Define business hours (e.g., 9 AM to 5 PM)
        start_hour = 9
        end_hour = 17
        slot_duration = 30 # Check every 30 mins
        
        available_slots = []
        current_time = datetime.combine(target_date, time(start_hour, 0))
        end_time = datetime.combine(target_date, time(end_hour, 0))
        
        duration = timedelta(minutes=package.duration_minutes)

        while current_time + duration <= end_time:
            slot_start = current_time
            slot_end = current_time + duration
            
            # Check if ANY tech is free for this slot
            # A tech is busy if they have a booking that Overlaps
            # Overlap: (BookStart < SlotEnd) AND (BookEnd > SlotStart)
            
            # Get IDs of busy techs
            busy_tech_ids = Booking.objects.filter(
                technician__staff_app_profile__in=techs,
                status__in=['CONFIRMED', 'IN_PROGRESS'],
                time_slot__lt=slot_end,
                end_time__gt=slot_start
            ).values_list('technician__staff_app_profile__id', flat=True)
            
            # If count of busy techs < total techs, then slot is available
            if len(busy_tech_ids) < techs.count():
                available_slots.append(slot_start.strftime("%H:%M"))
                
            current_time += timedelta(minutes=slot_duration)
            
        return Response({'date': date_str, 'slots': available_slots})

class CalendarViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        queryset = Booking.objects.all()
        
        if start_date and end_date:
            queryset = queryset.filter(time_slot__date__range=[start_date, end_date])
            
        return queryset

class DriverBookingViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        # Allow detail access (update_status) without query param
        if self.detail:
            return Booking.objects.all()

        # For list view, filter by technician_id
        technician_id = self.request.query_params.get('technician_id')
        if technician_id:
            queryset = Booking.objects.filter(technician_id=technician_id).order_by('time_slot')
            
            # Calculate distance from previous job or technician location
            # For MVP, we'll just annotate with a mock distance or calculate if we had prev coords
            # A real implementation would need complex logic.
            # Let's just return the queryset, frontend will display address.
            # If we want to show "Distance from previous", we need to do it in Python or Serializer.
            return queryset
            
        return Booking.objects.none()

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        booking = self.get_object()
        new_status = request.data.get('status')
        if new_status in dict(Booking.STATUS_CHOICES):
            booking.status = new_status
            booking.save()
            
            # Auto-generate invoice if completed
            if new_status == 'COMPLETED':
                # 1. Generate Invoice (if missing)
                if not hasattr(booking, 'invoice'):
                    from finance.models import Invoice
                    Invoice.objects.create(
                        booking=booking,
                        amount=booking.service_package.price if booking.service_package else 0.0
                    )
                
                # 2. Trigger Financial Logic
                from finance.logic import calculate_wash_cost, process_payroll_event
                calculate_wash_cost(booking)
                process_payroll_event(booking)
            
            return Response({'status': 'success'})
        return Response({'status': 'invalid status'}, status=400)
