from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from django.db import transaction
from django.contrib.auth.models import User
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection
from .serializers import StaffProfileSerializer, TimeEntrySerializer, SOPChecklistSerializer, JobInspectionSerializer, StaffDirectorySerializer
from django.utils import timezone


class StaffDirectoryViewSet(viewsets.ModelViewSet):
    """Full CRUD for admin to manage staff members with search, filters, reset password, and stats."""
    serializer_class = StaffDirectorySerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        phone_number = request.data.get('phone_number', '').strip()
        first_name = request.data.get('first_name', '').strip()
        password = request.data.get('password')
        role = request.data.get('role', 'WASHER')
        salary_type = request.data.get('salary_type', 'COMMISSION')
        salary_amount = request.data.get('salary_amount', 0)
        base_salary = request.data.get('base_salary', 0)
        commission_rate = request.data.get('commission_rate', 0)

        if not phone_number or not password or not first_name:
            return Response({'error': 'First name, phone number, and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=phone_number).exists():
            return Response({'error': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                username=phone_number,
                password=password,
                first_name=first_name
            )
            
            staff_profile = StaffProfile.objects.create(
                user=user,
                role=role,
                phone_number=phone_number,
                salary_type=salary_type,
                salary_amount=salary_amount,
                base_salary=base_salary,
                commission_rate=commission_rate,
                is_active=True
            )
            
            serializer = self.get_serializer(staff_profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def get_queryset(self):
        qs = StaffProfile.objects.select_related('user').order_by('role', 'user__first_name')
        
        # Admin Search (Name or Phone)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(user__first_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(phone_number__icontains=search)
            )

        # Filters
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            active_bool = is_active.lower() == 'true'
            qs = qs.filter(user__is_active=active_bool)

        salary_type = self.request.query_params.get('salary_type')
        if salary_type:
            qs = qs.filter(salary_type=salary_type)

        return qs

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

    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Admin endpoint to reset a staff member's password."""
        staff_profile = self.get_object()
        new_password = request.data.get('new_password')
        if not new_password:
            return Response({'error': 'New password is required.'}, status=400)

        staff_profile.user.set_password(new_password)
        staff_profile.user.save()
        return Response({'status': 'success', 'message': f'Password reset for {staff_profile.user.first_name}'})

    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        """Toggle active / inactive status."""
        staff_profile = self.get_object()
        staff_profile.user.is_active = not staff_profile.user.is_active
        staff_profile.user.save()
        staff_profile.is_active = staff_profile.user.is_active
        staff_profile.save()
        return Response({
            'status': 'success',
            'is_active': staff_profile.is_active,
            'message': f"Staff status set to {'Active' if staff_profile.is_active else 'Inactive'}"
        })

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Admin stat overview for a specific staff member."""
        staff_profile = self.get_object()
        staff_user = staff_profile.user
        today = timezone.localdate()

        from .services.earning_service import get_staff_earnings
        from .services.wallet_service import get_staff_balance_summary

        earnings_data = get_staff_earnings(staff_user)
        balance_data = get_staff_balance_summary(staff_user)

        from bookings.models import Booking
        completed_today = Booking.objects.filter(technician=staff_user, status='COMPLETED', time_slot__date=today)
        last_job = Booking.objects.filter(technician=staff_user, status='COMPLETED').order_by('-end_time', '-id').first()

        last_job_time = None
        if last_job and last_job.end_time:
            last_job_time = last_job.end_time.strftime('%Y-%m-%d %H:%M')

        return Response({
            'staff_id': staff_profile.id,
            'name': staff_user.first_name or staff_user.username,
            'phone': staff_profile.phone_number or staff_user.username,
            'is_active': staff_user.is_active,
            'salary_type': staff_profile.salary_type,
            'today_earnings': earnings_data['today'],
            'completed_vehicles_today': completed_today.count(),
            'advances': balance_data['advances'],
            'current_payable': balance_data['current_payable'],
            'last_login': staff_user.last_login.strftime('%Y-%m-%d %H:%M') if staff_user.last_login else 'Never',
            'last_job_time': last_job_time or 'No completed jobs'
        })

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
        if not hasattr(user, 'staff_profile'):
            return Response({'error': 'User is not staff'}, status=400)
            
        active_entry = TimeEntry.objects.filter(staff=user.staff_profile, clock_out_time__isnull=True).first()
        if active_entry:
             return Response({'error': 'Already clocked in'}, status=400)

        location = request.data.get('location', '')
        entry = TimeEntry.objects.create(
            staff=user.staff_profile,
            clock_in_time=timezone.now(),
            clock_in_location=location
        )
        return Response(TimeEntrySerializer(entry).data)

    @action(detail=False, methods=['post'])
    def clock_out(self, request):
        user = request.user
        if not hasattr(user, 'staff_profile'):
             return Response({'error': 'User is not staff'}, status=400)

        active_entry = TimeEntry.objects.filter(staff=user.staff_profile, clock_out_time__isnull=True).first()
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
    """Modular Staff Dashboard APIs."""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def earnings(self, request):
        """GET /api/staff/dashboard/earnings/"""
        from .services.earning_service import get_staff_earnings
        data = get_staff_earnings(request.user)
        return Response(data)

    @action(detail=False, methods=['get'])
    def work(self, request):
        """GET /api/staff/dashboard/work/?period=today|week|month|year"""
        period = request.query_params.get('period', 'today')
        from .services.work_service import get_staff_work_summary
        data = get_staff_work_summary(request.user, period=period)
        return Response(data)

    @action(detail=False, methods=['get'])
    def balance(self, request):
        """GET /api/staff/dashboard/balance/"""
        from .services.wallet_service import get_staff_balance_summary
        data = get_staff_balance_summary(request.user)
        return Response(data)

    @action(detail=False, methods=['get'])
    def transactions(self, request):
        """GET /api/staff/dashboard/transactions/"""
        from finance.models import GeneralExpense
        txs = GeneralExpense.objects.filter(
            staff=request.user,
            expense_type='STAFF',
            is_active=True
        ).order_by('-date', '-id')

        res = []
        for t in txs:
            res.append({
                'id': t.id,
                'transaction_type': t.transaction_type,
                'amount': float(t.amount),
                'date': t.date.strftime('%Y-%m-%d'),
                'payment_method': t.payment_method,
                'status': t.status,
                'description': t.description or t.notes or '',
                'category': t.category.name if t.category else 'Staff Transaction'
            })
        return Response(res)

    @action(detail=False, methods=['get'])
    def jobs(self, request):
        """GET /api/staff/dashboard/jobs/"""
        today = timezone.localdate()
        from bookings.models import Booking
        from staff.models import TimeEntry
        
        today_jobs = Booking.objects.filter(technician=request.user, time_slot__date=today).select_related('customer', 'vehicle', 'service_package').order_by('-id')
        completed_today = today_jobs.filter(status='COMPLETED')
        last_completed = completed_today.order_by('-end_time', '-id').first()

        last_time_str = "None"
        if last_completed and last_completed.end_time:
            last_time_str = last_completed.end_time.strftime('%I:%M %p')

        # Real working hours calculation
        active_time = TimeEntry.objects.filter(staff__user=request.user, clock_in_time__date=today).order_by('clock_in_time').first()
        working_hours_str = "Not Clocked In"
        if active_time:
            start_t = active_time.clock_in_time.strftime('%I:%M %p')
            end_t = active_time.clock_out_time.strftime('%I:%M %p') if active_time.clock_out_time else "Active Now"
            working_hours_str = f"{start_t} - {end_t}"
        elif completed_today.exists():
            first_j = completed_today.order_by('start_time', 'time_slot').first()
            start_t = (first_j.start_time or first_j.time_slot).strftime('%I:%M %p')
            end_t = last_time_str if last_time_str != "None" else "Active"
            working_hours_str = f"{start_t} - {end_t}"

        summary = {
            'completed_jobs': completed_today.count(),
            'completed_vehicles': completed_today.count(),
            'working_hours': working_hours_str,
            'last_completed_time': last_time_str,
        }

        jobs_list = []
        for j in today_jobs[:30]:
            v_str = 'Vehicle'
            v_make = ''
            v_model = ''
            v_plate = ''
            v_type = 'CAR'
            if j.vehicle:
                v_make = j.vehicle.make
                v_model = j.vehicle.model
                v_plate = j.vehicle.plate_number or j.vehicle.registration_number
                v_type = getattr(j.vehicle, 'vehicle_type', 'CAR')
                v_str = f"{v_make} {v_model} ({v_plate})".strip()

            jobs_list.append({
                'id': j.id,
                'customer_name': j.customer.user.get_full_name() or j.customer.user.username if j.customer else 'Guest',
                'vehicle': v_str,
                'vehicle_make': v_make,
                'vehicle_model': v_model,
                'vehicle_plate': v_plate,
                'vehicle_type': v_type,
                'service_package': j.service_package.name if j.service_package else 'Wash',
                'status': j.status,
                'time_slot': j.time_slot.strftime('%Y-%m-%d %H:%M'),
                'timestamp': j.end_time.strftime('%I:%M %p') if j.end_time else j.time_slot.strftime('%I:%M %p'),
                'amount': float(j.service_package.price) if j.service_package else 0.0
            })

        return Response({
            'summary': summary,
            'jobs': jobs_list
        })

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """GET /api/staff/dashboard/profile/"""
        user = request.user
        staff_profile = getattr(user, 'staff_profile', None)
        return Response({
            'id': user.id,
            'full_name': user.get_full_name() or user.username,
            'username': user.username,
            'phone_number': staff_profile.phone_number if staff_profile else '',
            'role': staff_profile.get_role_display() if staff_profile else 'Staff',
            'salary_type': staff_profile.get_salary_type_display() if staff_profile else 'Commission',
            'joining_date': staff_profile.joining_date.strftime('%Y-%m-%d') if staff_profile and staff_profile.joining_date else '',
        })

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """POST /api/staff/dashboard/change_password/"""
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not user.check_password(current_password):
            return Response({'error': 'Current password is incorrect.'}, status=400)
        if not new_password or len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=400)

        user.set_password(new_password)
        user.save()
        return Response({'status': 'success', 'message': 'Password updated successfully.'})

from rest_framework.decorators import api_view, permission_classes
from django.db.models import Sum

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def daily_settlement_ledger(request):
    user = request.user
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    staff_users = StaffProfile.objects.filter(
        role__in=['WASHER', 'TECHNICIAN', 'DRIVER'],
        is_active=True,
        user__is_active=True
    )
    
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