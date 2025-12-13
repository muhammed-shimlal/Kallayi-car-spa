from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection
from .serializers import StaffProfileSerializer, TimeEntrySerializer, SOPChecklistSerializer, JobInspectionSerializer
from django.utils import timezone

class StaffProfileViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StaffProfile.objects.all()
    serializer_class = StaffProfileSerializer
    permission_classes = [IsAuthenticated]

class TimeEntryViewSet(viewsets.ModelViewSet):
    queryset = TimeEntry.objects.all()
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def clock_in(self, request):
        user = request.user
        if not hasattr(user, 'staff_app_profile'):
            return Response({'error': 'User is not staff'}, status=400)
            
        # Check if already clocked in
        active_entry = TimeEntry.objects.filter(staff=user.staff_app_profile, clock_out_time__isnull=True).first()
        if active_entry:
             return Response({'error': 'Already clocked in'}, status=400)

        location = request.data.get('location', '')
        # In a real app, validate location against Geofence here
        
        entry = TimeEntry.objects.create(
            staff=user.staff_app_profile,
            clock_in_time=timezone.now(),
            clock_in_location=location
        )
        return Response(TimeEntrySerializer(entry).data)

    @action(detail=False, methods=['post'])
    def clock_out(self, request):
        user = request.user
        if not hasattr(user, 'staff_app_profile'):
             return Response({'error': 'User is not staff'}, status=400)

        active_entry = TimeEntry.objects.filter(staff=user.staff_app_profile, clock_out_time__isnull=True).first()
        if not active_entry:
             return Response({'error': 'Not clocked in'}, status=400)
        
        active_entry.clock_out_time = timezone.now()
        active_entry.clock_out_location = request.data.get('location', '')
        active_entry.save()
        
        return Response(TimeEntrySerializer(active_entry).data)

class JobInspectionViewSet(viewsets.ModelViewSet):
    queryset = JobInspection.objects.all()
    serializer_class = JobInspectionSerializer
    permission_classes = [IsAuthenticated]

class SOPChecklistViewSet(viewsets.ModelViewSet):
    queryset = SOPChecklist.objects.all()
    serializer_class = SOPChecklistSerializer
    
class StaffDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def my_stats(self, request):
        user = request.user
        today = timezone.localdate()
        
        # Payroll Stats
        from finance.models import PayrollEntry
        payroll = PayrollEntry.objects.filter(staff_user=user, date=today).first()
        
        earnings = 0.0
        if payroll:
             earnings = float(payroll.commission_earned) + float(payroll.tips_earned) + float(payroll.base_wage)
             
        # Time Stats
        if hasattr(user, 'staff_app_profile'):
            active_entry = TimeEntry.objects.filter(staff=user.staff_app_profile, clock_out_time__isnull=True).exists()
            status = 'CLOCKED_IN' if active_entry else 'CLOCKED_OUT'
        else:
            status = 'UNKNOWN'

        return Response({
            'today_earnings': earnings,
            'current_status': status
        })
