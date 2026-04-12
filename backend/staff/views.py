from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection
from .serializers import StaffProfileSerializer, TimeEntrySerializer, SOPChecklistSerializer, JobInspectionSerializer, StaffDirectorySerializer
from django.utils import timezone


class StaffDirectoryViewSet(viewsets.ModelViewSet):
    """Full CRUD for admin to manage staff members."""
    serializer_class = StaffDirectorySerializer

    def get_queryset(self):
        return StaffProfile.objects.filter(
            role__in=['WASHER', 'TECHNICIAN', 'MANAGER', 'DRIVER'],
            user__is_active=True,
        ).select_related('user').order_by('role', 'user__first_name')

    def get_permissions(self):
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in SAFE_METHODS:
            user = request.user
            is_admin = (
                user.is_superuser or
                (hasattr(user, 'staff_profile') and user.staff_profile.role == 'ADMIN')
            )
            if not is_admin:
                self.permission_denied(request, message="Only Admin can manage staff.")

    def destroy(self, request, *args, **kwargs):
        """Soft-delete: deactivate instead of deleting to preserve payroll history."""
        instance = self.get_object()
        instance.user.is_active = False
        instance.user.save()
        instance.is_active = False
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

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

from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_settlement_ledger(request):
    user = request.user
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    staff_users = StaffProfile.objects.filter(role__in=['WASHER', 'TECHNICIAN', 'DRIVER'])
    
    today = timezone.localdate()
    ledger = []
    
    from bookings.models import Booking
    from finance.models import GeneralExpense, PayrollEntry, CommissionRule
    
    for staff in staff_users:
        base_salary = float(staff.base_salary)
        
        # Bookings completed today by this staff member
        completed_bookings = Booking.objects.filter(
            technician=staff.user,
            status='COMPLETED',
            time_slot__date=today
        )
        
        jobs_completed = completed_bookings.count()
        
        # --- NEW: Fetch exact math from database ---
        payroll_entry = PayrollEntry.objects.filter(staff_user=staff.user, date=today).first()
        commission_earned = float(payroll_entry.commission_earned) if payroll_entry else 0.0
        status = 'Paid' if (payroll_entry and payroll_entry.is_settled) else 'Pending'
        # -------------------------------------------
        
        advances = GeneralExpense.objects.filter(
            recorded_by=staff.user,
            category__name='Advances',
            date=today
        ).aggregate(Sum('amount'))['amount__sum'] or 0.0
        
        advances = float(advances)
        final_payout = base_salary + commission_earned - advances
        
        ledger.append({
            'id': staff.user.id,
            'name': staff.user.get_full_name() or staff.user.username,
            'role': staff.get_role_display(),
            'base_salary': base_salary,
            'jobs_completed': jobs_completed,
            'commission_earned': commission_earned,
            'advances': advances,
            'final_payout': final_payout,
            'status': status
        })
        
    return Response(ledger)

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def settle_daily_pay(request, staff_id):
    user = request.user
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    from django.contrib.auth.models import User
    from finance.models import PayrollEntry
    
    try:
        staff_user = User.objects.get(id=staff_id)
        staff_profile = staff_user.staff_profile
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)
        
    today = timezone.localdate()
    
    # We will compute the day's values again or use ones passed in payload, 
    # but the simplest per instructions is just marking the ledger for *today* as Paid 
    # (e.g. creating a Payroll record).
    
    from bookings.models import Booking
    completed_bookings = Booking.objects.filter(
        technician=staff_user,
        status='COMPLETED',
        time_slot__date=today
    )
    
    commission = 0.0
    for booking in completed_bookings:
        if booking.service_package and booking.service_package.commission_rule:
            rule = booking.service_package.commission_rule
            commission += float(rule.flat_amount)
            commission += float(booking.service_package.price) * (float(rule.percentage) / 100.0)
            
    base_wage = float(staff_profile.base_salary)
    
    payroll, created = PayrollEntry.objects.get_or_create(
        staff_user=staff_user,
        date=today,
        defaults={
            'base_wage': base_wage,
            'commission_earned': commission,
            'tips_earned': 0.0
        }
    )
    
    if not created:
        payroll.base_wage = base_wage
        payroll.commission_earned = commission
        payroll.save()
        
    return Response({'status': 'success', 'message': f'Settled pay for {staff_user.username}'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_staff_advance(request, staff_id):
    """
    Grants a cash advance to a staff member and records it as a GeneralExpense.
    This ensures it deducts correctly from their daily settlement.
    """
    user = request.user
    # Ensure only Admin/Manager can grant advances
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    from django.contrib.auth.models import User
    from finance.models import GeneralExpense, ExpenseCategory
    
    try:
        staff_user = User.objects.get(id=staff_id)
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)
        
    amount = request.data.get('amount')
    description = request.data.get('description', f'Cash Advance for {staff_user.get_full_name() or staff_user.username}')
    
    if not amount or float(amount) <= 0:
        return Response({'error': 'A valid positive amount is required'}, status=400)
        
    # Get or create the 'Advances' category so the ledger finds it
    category, _ = ExpenseCategory.objects.get_or_create(name='Advances')
    
    # Create the expense. 
    # NOTE: We set recorded_by=staff_user so the daily_settlement_ledger math picks it up!
    GeneralExpense.objects.create(
        category=category,
        amount=amount,
        description=description,
        date=timezone.localdate(),
        recorded_by=staff_user 
    )
    
    return Response({
        'status': 'success', 
        'message': f'Advance of ₹{amount} successfully added for {staff_user.username}'
    })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def settle_staff_payroll(request, payroll_id):
    user = request.user
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    from finance.models import PayrollEntry
    from django.utils import timezone
    
    try:
        # Since the frontend sends the staff user's ID as payroll_id, check for today's entry
        payroll_entry = PayrollEntry.objects.filter(staff_user_id=payroll_id, date=timezone.localdate()).first()
        
        if not payroll_entry:
            # If it doesn't exist yet, we create it dynamically for today
            from django.contrib.auth.models import User
            from bookings.models import Booking
            staff_user = User.objects.get(id=payroll_id)
            today = timezone.localdate()
            completed_bookings = Booking.objects.filter(
                technician=staff_user,
                status='COMPLETED',
                time_slot__date=today
            )
            commission = 0.0
            for booking in completed_bookings:
                if booking.service_package and booking.service_package.commission_rule:
                    rule = booking.service_package.commission_rule
                    commission += float(rule.flat_amount)
                    commission += float(booking.service_package.price) * (float(rule.percentage) / 100.0)
            
            base_wage = getattr(staff_user.staff_profile, 'base_salary', 0.0)
            payroll_entry = PayrollEntry.objects.create(
                staff_user=staff_user,
                date=today,
                base_wage=base_wage,
                commission_earned=commission,
                tips_earned=0.0
            )
            
    except Exception as e:
        return Response({'error': str(e)}, status=404)
        
    payroll_entry.is_settled = True
    payroll_entry.settled_at = timezone.now()
    payroll_entry.save()
    
    return Response({'status': 'success', 'message': f'Settled payroll for {payroll_entry.staff_user.username}'})