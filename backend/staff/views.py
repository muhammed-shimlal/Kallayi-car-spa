from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from core.permissions import IsAdmin, IsStaffUser, IsCustomerUser, IsOwnerOrAdmin, get_user_role
from django.db import transaction
from django.db.models import Q, Sum
from django.contrib.auth.models import User
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection
from .serializers import StaffProfileSerializer, TimeEntrySerializer, SOPChecklistSerializer, JobInspectionSerializer, StaffDirectorySerializer
from django.utils import timezone


class StaffDirectoryViewSet(viewsets.ModelViewSet):
    """Full CRUD for admin to manage staff members with search, filters, reset password, and stats."""
    queryset = StaffProfile.objects.all()
    serializer_class = StaffDirectorySerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        phone_number = str(request.data.get('phone_number') or request.data.get('phone') or '').strip()
        first_name = str(request.data.get('first_name') or request.data.get('name') or '').strip()
        role = request.data.get('role', 'WASHER')
        salary_type = request.data.get('salary_type', 'COMMISSION')
        salary_amount = request.data.get('salary_amount') or request.data.get('base_salary') or 0
        base_salary = request.data.get('base_salary') or salary_amount or 0
        commission_rate = request.data.get('commission_rate', 0)

        if not phone_number or not first_name:
            return Response({'error': 'First name and phone number are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=phone_number).exists():
            return Response({'error': 'A user with this phone number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                username=phone_number,
                password='Kallayi@123',
                first_name=first_name,
                is_staff=True
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
            qs = qs.filter(is_active=active_bool, user__is_active=active_bool)
        else:
            qs = qs.filter(is_active=True, user__is_active=True)

        salary_type = self.request.query_params.get('salary_type')
        if salary_type:
            qs = qs.filter(salary_type=salary_type)

        return qs

    def get_permissions(self):
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in SAFE_METHODS:
            if not request.user.is_staff and not (hasattr(request.user, 'staff_profile') and request.user.staff_profile.role in ['ADMIN', 'MANAGER']):
                self.permission_denied(request, message="Only managers and admins can modify staff records.")

    def perform_destroy(self, instance):
        instance.is_active = False
        if instance.user:
            instance.user.is_active = False
            instance.user.save(update_fields=['is_active'])
        instance.save(update_fields=['is_active'])

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

    @action(detail=True, methods=['patch', 'post'])
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
    permission_classes = [IsAuthenticated, IsAdmin]

class TimeEntryViewSet(viewsets.ModelViewSet):
    queryset = TimeEntry.objects.all()
    serializer_class = TimeEntrySerializer
    permission_classes = [IsAuthenticated, IsStaffUser]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in ['ADMIN', 'MANAGER']:
            return TimeEntry.objects.all()
        if hasattr(user, 'staff_profile'):
            return TimeEntry.objects.filter(staff=user.staff_profile)
        return TimeEntry.objects.none()

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
    permission_classes = [IsAuthenticated, IsStaffUser]

class SOPChecklistViewSet(viewsets.ModelViewSet):
    queryset = SOPChecklist.objects.all()
    serializer_class = SOPChecklistSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]
    
class StaffDashboardViewSet(viewsets.ViewSet):
    """Modular Staff Dashboard APIs."""
    permission_classes = [IsAuthenticated, IsStaffUser]

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
        if not request.user or not getattr(request.user, 'is_authenticated', False):
            return Response([])

        from finance.models import GeneralExpense
        txs = GeneralExpense.objects.filter(
            staff=request.user,
            expense_type='STAFF'
        ).order_by('-date', '-id')

        res = []
        for t in txs:
            res.append({
                'id': t.id,
                'transaction_type': t.transaction_type,
                'amount': float(t.amount or 0.0),
                'date': t.date.strftime('%Y-%m-%d') if t.date else '',
                'payment_method': t.payment_method or 'CASH',
                'status': t.status or 'APPROVED',
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
        old_password = request.data.get('old_password') or request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not old_password:
            return Response({'error': 'Current password is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(old_password):
            return Response({'error': 'Current password is incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        if not new_password or len(new_password) < 6:
            return Response({'error': 'New password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

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
    from finance.models import GeneralExpense, PayrollEntry
    
    for staff in staff_users:
        base_salary = float(staff.base_salary or 0.0)
        
        # Bookings completed today by this staff member
        completed_bookings = Booking.objects.filter(
            technician=staff.user,
            status='COMPLETED',
            time_slot__date=today
        )
        
        jobs_completed = completed_bookings.count()
        
        from finance.logic import calculate_staff_booking_commission
        
        payroll_entry = PayrollEntry.objects.filter(staff_user=staff.user, date=today).first()
        if payroll_entry and float(payroll_entry.commission_earned) > 0:
            commission_earned = float(payroll_entry.commission_earned)
        else:
            commission_earned = 0.0
            for b in completed_bookings:
                commission_earned += float(calculate_staff_booking_commission(staff, b.service_package))

        commission_earned = round(commission_earned, 2)
        status = 'Paid' if (payroll_entry and payroll_entry.is_settled) else 'Pending'
        
        advances_qs = GeneralExpense.objects.filter(
            Q(staff=staff.user) | Q(recorded_by=staff.user),
            Q(category__name__iexact='Advances') | Q(transaction_type='ADVANCE'),
            date=today
        )
        advances = float(advances_qs.aggregate(Sum('amount'))['amount__sum'] or 0.0)
        advances = round(advances, 2)
        
        final_payout = round(base_salary + commission_earned - advances, 2)
        
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

@api_view(['PATCH', 'POST'])
@permission_classes([IsAuthenticated])
def settle_daily_pay(request, staff_id):
    user = request.user
    if not user.is_staff and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)
        
    from django.contrib.auth.models import User
    from finance.models import PayrollEntry, SalaryPayment, GeneralExpense
    
    try:
        staff_user = User.objects.get(id=staff_id)
        staff_profile = staff_user.staff_profile
    except User.DoesNotExist:
        return Response({'error': 'Staff not found'}, status=404)
        
    today = timezone.localdate()
    
    from bookings.models import Booking
    completed_bookings = Booking.objects.filter(
        technician=staff_user,
        status='COMPLETED',
        time_slot__date=today
    )
    
    from finance.logic import calculate_staff_booking_commission
    commission = 0.0
    for booking in completed_bookings:
        commission += float(calculate_staff_booking_commission(staff_profile, booking.service_package))
            
    base_wage = float(staff_profile.base_salary or 0.0)
    
    advances_qs = GeneralExpense.objects.filter(
        Q(staff=staff_user) | Q(recorded_by=staff_user),
        Q(category__name__iexact='Advances') | Q(transaction_type='ADVANCE'),
        date=today
    )
    advances = float(advances_qs.aggregate(Sum('amount'))['amount__sum'] or 0.0)
    
    total_calculated = max(round(base_wage + commission - advances, 2), 0.0)
    
    raw_amount = request.data.get('paid_amount') or request.data.get('amount')
    if raw_amount is not None:
        try:
            paid_amount = float(raw_amount)
        except (ValueError, TypeError):
            paid_amount = total_calculated
    else:
        paid_amount = total_calculated

    remaining_balance = max(round(total_calculated - paid_amount, 2), 0.0)

    # Record official SalaryPayment entry
    SalaryPayment.objects.create(
        staff=staff_user,
        payment_date=today,
        period_start=today,
        period_end=today,
        calculated_payable=total_calculated,
        paid_amount=paid_amount,
        remaining_balance=remaining_balance,
        payment_method=request.data.get('payment_method', 'CASH'),
        notes=request.data.get('notes', 'Salary payout'),
        created_by=request.user
    )

    payroll, _ = PayrollEntry.objects.get_or_create(
        staff_user=staff_user,
        date=today,
        defaults={
            'base_wage': base_wage,
            'commission_earned': commission,
            'tips_earned': 0.0
        }
    )
    payroll.base_wage = base_wage
    payroll.commission_earned = commission
    payroll.is_settled = (remaining_balance == 0)
    payroll.save()

    # Get updated total pending balance
    from staff.services.wallet_service import get_staff_balance_summary
    summary = get_staff_balance_summary(staff_user)
    total_pending = max(summary.get('current_payable', 0.0), 0.0)
        
    return Response({
        'status': 'success', 
        'message': f'Recorded payout of ₹{paid_amount} for {staff_user.username}. Remaining balance: ₹{total_pending}',
        'paid_amount': paid_amount,
        'remaining_balance': remaining_balance,
        'pending_balance': total_pending
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_staff_advance(request, staff_id):
    """
    Grants a cash advance to a staff member and records it as a GeneralExpense.
    This ensures it deducts correctly from their daily settlement.
    """
    user = request.user
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
        
    category, _ = ExpenseCategory.objects.get_or_create(name='Advances')
    
    GeneralExpense.objects.create(
        category=category,
        amount=amount,
        description=description,
        date=timezone.localdate(),
        staff=staff_user,
        recorded_by=user,
        expense_type='STAFF',
        transaction_type='ADVANCE',
        status='APPROVED'
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
        payroll_entry = PayrollEntry.objects.filter(staff_user_id=payroll_id, date=timezone.localdate()).first()
        
        if not payroll_entry:
            from django.contrib.auth.models import User
            from bookings.models import Booking
            staff_user = User.objects.get(id=payroll_id)
            today = timezone.localdate()
            completed_bookings = Booking.objects.filter(
                technician=staff_user,
                status='COMPLETED',
                time_slot__date=today
            )
            from finance.logic import calculate_staff_booking_commission
            commission = 0.0
            staff_prof = getattr(staff_user, 'staff_profile', None)
            for booking in completed_bookings:
                commission += float(calculate_staff_booking_commission(staff_prof, booking.service_package))
            
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