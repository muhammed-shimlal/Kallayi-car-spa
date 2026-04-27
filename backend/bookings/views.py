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
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
import random
from fleet.models import Vehicle
from customers.models import Customer
from django.contrib.auth import get_user_model
User = get_user_model()

class IsAdminUserOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class ServicePackageViewSet(viewsets.ModelViewSet):
    queryset = ServicePackage.objects.all().order_by('price')
    serializer_class = ServicePackageSerializer

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in SAFE_METHODS:
            user = request.user
            is_admin_or_manager = (
                user.is_superuser or
                user.is_staff or
                (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER'])
            )
            if not is_admin_or_manager:
                self.permission_denied(request, message="Only Admin or Manager can modify service packages.")

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser or hasattr(user, 'staff_profile'):
            return Booking.objects.all().order_by('-created_at')
        if hasattr(user, 'customer'):
            return Booking.objects.filter(customer=user.customer).order_by('-created_at')
        return Booking.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        
        # 1. Save booking with CONFIRMED status automatically
        if hasattr(user, 'customer'):
            booking = serializer.save(customer=user.customer, status='CONFIRMED')
        else:
            booking = serializer.save(status='CONFIRMED')
            
        # 2. Generate an UNPAID Invoice immediately to track payment status correctly
        from finance.models import Invoice
        amount = booking.service_package.price if booking.service_package else 0.0
        Invoice.objects.create(
            booking=booking,
            amount=amount,
            is_paid=False,
            payment_method=None
        )
 
    @action(detail=False, methods=['get'])
    def completed(self, request):
        """
        Returns all bookings ready for invoicing.
        Queries Booking.objects directly to bypass any active-only queue filters.
        """
        completed_bookings = Booking.objects.filter(
            status__in=[
                'CHECKOUT', 'Checkout', 'checkout', 
                'COMPLETED', 'Completed', 'completed', 
                'DELIVERED', 'Delivered', 'delivered',
                'PICK UP', 'Pick Up', 'pick up', 'PICKUP', 'Pickup'
            ]
        ).select_related('customer', 'technician', 'service_package', 'vehicle').order_by('-created_at')
        
        serializer = self.get_serializer(completed_bookings, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def checkout(self, request, pk=None):
        booking = self.get_object()
        
        amount_cash = float(request.data.get('amount_cash', 0))
        amount_upi = float(request.data.get('amount_upi', 0))
        amount_khata = float(request.data.get('amount_khata', 0))

        if amount_khata > 0 and not booking.customer:
            customer_name = request.data.get('customer_name') or "Walk-In Guest"
            from customers.models import Customer
            from django.contrib.auth.models import User
            import random
            import string
            
            username = f"walkin_khata_{random.randint(100000, 999999)}"
            while User.objects.filter(username=username).exists():
                username = f"walkin_khata_{random.randint(100000, 999999)}"
            
            new_user = User.objects.create(username=username, first_name=customer_name)
            new_user.set_password(''.join(random.choices(string.ascii_letters + string.digits, k=12)))
            new_user.save()
            customer = Customer.objects.create(user=new_user, phone_number='')
            booking.customer = customer
            booking.save()

        booking.status = 'COMPLETED'
        booking.end_time = timezone.now()
        booking.save()
        
        if amount_khata > 0 and booking.customer:
            from finance.models import KhataLedger
            from decimal import Decimal
            booking.customer.outstanding_balance += Decimal(amount_khata)
            booking.customer.save()
            KhataLedger.objects.create(
                customer=booking.customer,
                amount=amount_khata,
                transaction_type='CHARGE',
                description=f'Service completed for {booking.vehicle.plate_number if booking.vehicle else "Walk-In"}',
                related_booking=booking
            )

        payment_method = 'SPLIT'
        if amount_cash > 0 and amount_upi == 0 and amount_khata == 0:
            payment_method = 'CASH'
        elif amount_upi > 0 and amount_cash == 0 and amount_khata == 0:
            payment_method = 'ONLINE'

        total_amount = booking.service_package.price if booking.service_package else 0.0

        if not hasattr(booking, 'invoice'):
            from finance.models import Invoice
            Invoice.objects.create(
                booking=booking,
                amount=total_amount,
                split_cash=amount_cash,
                split_online=amount_upi,
                split_khata=amount_khata,
                payment_method=payment_method,
                is_paid=True
            )
        else:
            inv = booking.invoice
            inv.split_cash = amount_cash
            inv.split_online = amount_upi
            inv.split_khata = amount_khata
            inv.payment_method = payment_method
            inv.is_paid = True
            inv.save()
            
        from finance.logic import calculate_wash_cost, process_payroll_event
        try:
            calculate_wash_cost(booking)
            process_payroll_event(booking)
        except Exception as e:
            print(f"Finance calculation error: {e}")
            
        return Response({'status': 'success', 'message': 'Checkout completed successfully.', 'booking_id': booking.id})

    @action(detail=False, methods=['get'])
    def available_slots(self, request):
        date_str = request.query_params.get('date')
        if not date_str:
            return Response({'error': 'Missing date parameter'}, status=400)
            
        try:
            target_date = parse_date(date_str)
            if not target_date:
                raise ValueError
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

        # 1. Define Standard Operating Hours (1-hour blocks from 9:00 AM to 6:00 PM)
        all_slots = []
        for hour in range(9, 18):
            t = time(hour, 0)
            all_slots.append(t.strftime("%I:%M %p"))

        # 2. Query ONLINE scheduled bookings that fall on the specified date (ignoring CANCELLED ones)
        # Walk-ins (created via POS at current time) are ignored because they do not fall exactly on the hour.
        existing_bookings = Booking.objects.filter(
            time_slot__date=target_date,
            time_slot__minute=0
        ).exclude(status='CANCELLED')

        # 3. Find booked slot times
        booked_slots = set()
        for b in existing_bookings:
            if b.time_slot:
                local_b_time = timezone.localtime(b.time_slot)
                # Ensure the string explicitly matches the '%I:%M %p' format (e.g., '09:00 AM', '02:00 PM')
                # On Windows %I could give '09', just strip leading zeros if necessary, but standard is keep.
                formatted_time_slot = local_b_time.strftime("%I:%M %p")
                if formatted_time_slot.startswith("0"): 
                     pass # It's matched identically with our `for hour in range(9, 18): t.strftime("%I:%M %p")`
                booked_slots.add(formatted_time_slot)

        # 4. Filter remaining blocks
        available_slots = [slot for slot in all_slots if slot not in booked_slots]
            
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def express_walkin(request):
    user = request.user
    
    auth_roles = ['ADMIN', 'MANAGER', 'WASHER', 'TECHNICIAN', 'DRIVER']
    
    # Simple role check based on StaffProfile or request.user.is_staff
    is_authorized = False
    
    if user.is_staff or user.is_superuser:
        is_authorized = True
    elif hasattr(user, 'staff_profile') and user.staff_profile.role in auth_roles:
        is_authorized = True
        
    # Check if they have a role attribute sent by middleware or decoded token (like what the frontend stores)
    if not is_authorized:
        return Response({'error': 'Forbidden'}, status=403)
        
    phone = request.data.get('phone')
    plate_number = request.data.get('plate_number')
    package_id = request.data.get('package_id')
    
    if not phone or not plate_number or not package_id:
        return Response({'error': 'Missing required fields'}, status=400)
        
    try:
        package = ServicePackage.objects.get(id=package_id)
    except ServicePackage.DoesNotExist:
        return Response({'error': 'Invalid service package'}, status=400)
        
    # Customer Resolution
    customer = Customer.objects.filter(phone_number=phone).first()
    if not customer:
        username = f"guest_{random.randint(100000, 999999)}"
        new_user = User.objects.create(username=username)
        customer = Customer.objects.create(user=new_user, phone_number=phone)
        
    # Vehicle Resolution (Note: instruction asked for ServiceVehicle, but Booking requires Vehicle)
    vehicle, created = Vehicle.objects.get_or_create(
        plate_number=plate_number, 
        defaults={'owner': customer, 'model': 'Unknown Walk-In'}
    )
    
    # Booking Creation (Bypass Slot Validations & Overlaps)
    current_time = timezone.now()
    booking = Booking.objects.create(
        customer=customer,
        vehicle=vehicle,
        service_package=package,
        status='WAITING',
        time_slot=current_time,
        start_time=current_time,
        address='Kallayi Car Spa - Main Hub'
    )
    
    # Generate Invoice immediately for POS walk-ins
    from finance.models import Invoice
    Invoice.objects.create(
        booking=booking,
        amount=package.price
    )
    
    print(f"📱 MOCK SMS: Welcome to Kallayi! Track your car ({plate_number}) live: https://kallayi.com/track/{booking.id}")
    
    return Response({'status': 'success', 'booking_id': booking.id})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_booking_stage(request, booking_id):
    """Kanban board drag-and-drop stage updater."""
    try:
        booking = Booking.objects.get(id=booking_id)
    except Booking.DoesNotExist:
        return Response({'error': 'Booking not found'}, status=404)

    new_status = request.data.get('new_status')
    bay_assignment = request.data.get('bay_assignment', None)
    assigned_technician_id = request.data.get('assigned_technician_id', None)

    payment_cash = float(request.data.get('payment_cash', 0))
    payment_upi = float(request.data.get('payment_upi', 0))
    payment_khata = float(request.data.get('payment_khata', 0))

    if payment_khata > 0 and not booking.customer:
        customer_name = request.data.get('customer_name')
        
        if not customer_name:
            customer_name = "Walk-In Guest"
            
        from customers.models import Customer
        from django.contrib.auth.models import User
        import random
        import string
        
        username = f"walkin_khata_{random.randint(100000, 999999)}"
        while User.objects.filter(username=username).exists():
            username = f"walkin_khata_{random.randint(100000, 999999)}"
        
        pwd = ''.join(random.choices(string.ascii_letters + string.digits, k=12))
        new_user = User.objects.create(
            username=username,
            first_name=customer_name
        )
        new_user.set_password(pwd)
        new_user.save()
        
        customer = Customer.objects.create(
            user=new_user,
            phone_number=''
        )
            
        booking.customer = customer
        booking.save()

    valid_statuses = [s[0] for s in Booking.STATUS_CHOICES]
    if new_status and new_status not in valid_statuses:
        return Response({'error': f'Invalid status. Valid options: {valid_statuses}'}, status=400)

    if new_status:
        booking.status = new_status
    if bay_assignment is not None:
        booking.bay_assignment = bay_assignment
    if assigned_technician_id:
        booking.technician_id = assigned_technician_id

    booking.save()

    # --- NEW: TRIGGER FINANCE & INVOICE GENERATION ---
    if new_status == 'COMPLETED':
        if payment_khata > 0 and booking.customer:
            from finance.models import KhataLedger
            from decimal import Decimal
            booking.customer.outstanding_balance += Decimal(payment_khata)
            booking.customer.save()
            KhataLedger.objects.create(
                customer=booking.customer,
                amount=payment_khata,
                transaction_type='CHARGE',
                description=f'Service completed for {booking.vehicle.plate_number if booking.vehicle else "Walk-In"}',
                related_booking=booking
            )

        # 1. Generate Invoice (if missing)
        if not hasattr(booking, 'invoice'):
            from finance.models import Invoice
            Invoice.objects.create(
                booking=booking,
                amount=booking.service_package.price if booking.service_package else 0.0,
                split_cash=payment_cash,
                split_online=payment_upi,
                split_khata=payment_khata,
                payment_method='SPLIT' if (payment_cash > 0 and payment_upi > 0) else ('CASH' if payment_cash > 0 else ('ONLINE' if payment_upi > 0 else 'SPLIT')),
                is_paid=True  # <-- NEW LINE ADDED HERE
            )
        else:
            inv = booking.invoice
            inv.split_cash = payment_cash
            inv.split_online = payment_upi
            inv.split_khata = payment_khata
            inv.payment_method = 'SPLIT' if (payment_cash > 0 and payment_upi > 0) else ('CASH' if payment_cash > 0 else ('ONLINE' if payment_upi > 0 else 'SPLIT'))
            inv.is_paid = True  # <-- NEW LINE ADDED HERE
            inv.save()
        
        # 2. Trigger Shop Costs and Worker Payroll
        from finance.logic import calculate_wash_cost, process_payroll_event
        try:
            calculate_wash_cost(booking)
            process_payroll_event(booking)
        except Exception as e:
            print(f"Finance calculation error: {e}")

    return Response({'status': 'success', 'booking_id': booking.id, 'new_status': booking.status})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def live_queue(request):
    """Fetch all active bookings for the Kanban board (excludes COMPLETED & CANCELLED)."""
    bookings = Booking.objects.exclude(
        status__in=['COMPLETED', 'CANCELLED']
    ).select_related('vehicle', 'customer', 'service_package', 'technician').order_by('time_slot')

    data = []
    for b in bookings:
        data.append({
            'id': b.id,
            'status': b.status,
            'bay_assignment': b.bay_assignment,
            'plate_number': b.vehicle.plate_number if b.vehicle else '???',
            'vehicle_model': b.vehicle.model if b.vehicle else 'Unknown',
            'service_name': b.service_package.name if b.service_package else 'Walk-In',
            'customer_name': str(b.customer) if b.customer else 'Walk-In',
            'customer_id': b.customer.id if b.customer else None,
            'price': float(b.service_package.price) if b.service_package else 0.0,
            'technician_name': b.technician.get_full_name() or b.technician.username if b.technician else None,
            'technician_id': b.technician.id if b.technician else None,
            'created_at': b.created_at.isoformat() if b.created_at else None,
            'time_slot': b.time_slot.isoformat() if b.time_slot else None,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vehicle_crm_history(request):
    """Vehicle CRM & Service History Tracker."""
    from django.db.models import Count, Sum
    q = request.GET.get('q', '').strip()
    if not q:
        return Response({'error': 'Missing query parameter q (License Plate)'}, status=400)

    # Search for either the License Plate OR the Owner's Phone Number
    vehicles = Vehicle.objects.filter(
        Q(plate_number__icontains=q) | 
        Q(owner__phone_number__icontains=q)
    ).select_related('owner__user')
    if not vehicles.exists():
        return Response({'error': 'No matching vehicle found in the system.'}, status=404)
    
    vehicle = vehicles.first()

    completed_bookings = Booking.objects.filter(vehicle=vehicle, status='COMPLETED').order_by('-created_at')
    
    total_visits = completed_bookings.count()
    total_lifetime_spend = completed_bookings.aggregate(total=Sum('service_package__price'))['total'] or 0
    
    favorite_service_data = (
        completed_bookings
        .filter(service_package__isnull=False)
        .values('service_package__name')
        .annotate(count=Count('id'))
        .order_by('-count')
        .first()
    )
    favorite_service = favorite_service_data['service_package__name'] if favorite_service_data else "None"

    timeline = []
    for b in completed_bookings:
        timeline.append({
            'date': b.created_at.strftime('%Y-%m-%d') if b.created_at else None,
            'service_package_name': b.service_package.name if b.service_package else 'Walk-In Wash',
            'technician_name': b.technician.get_full_name() or b.technician.username if b.technician else 'Unassigned',
            'price_paid': float(b.service_package.price) if b.service_package else 0.0,
        })
    
    owner = vehicle.owner
    outstanding_balance = 0.0
    owner_name = "Unknown Walk-In"
    
    if owner:
        outstanding_balance = float(owner.outstanding_balance) if hasattr(owner, 'outstanding_balance') else 0.0
        owner_name = owner.user.get_full_name() or owner.user.username if owner.user else "Unknown Walk-In"
        
    vehicle_profile = {
        'plate_number': vehicle.plate_number,
        'model': vehicle.model or "Unknown Model",
        'owner_name': owner_name,
        'outstanding_balance': outstanding_balance
    }

    return Response({
        'vehicle_profile': vehicle_profile,
        'kpis': {
            'total_visits': total_visits,
            'total_lifetime_spend': float(total_lifetime_spend),
            'favorite_service': favorite_service
        },
        'timeline': timeline
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_service_history(request):
    """Global service feed showing completed services for a specific date (or today)."""
    from django.utils import timezone
    from django.db.models import Sum
    from datetime import datetime
    
    date_str = request.GET.get('date')
    now = timezone.now().date()
    
    target_date = now
    if date_str:
        try:
            target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            pass # fallback to today
            
    # Filter bookings that were exactly on the target date in local time
    # Because created_at is UTC, we do a range query covering local day
    
    # We'll just filter exactly for now to keep it simple, or based on the date part
    # A robust way is booking filter on time_slot or created_at
    bookings = Booking.objects.filter(
        status='COMPLETED', 
        created_at__date=target_date
    ).select_related('vehicle', 'service_package', 'technician').order_by('-created_at')
    
    # Calculate stats
    total_services = bookings.count()
    total_revenue = bookings.aggregate(total=Sum('service_package__price'))['total'] or 0
    
    data = []
    
    for b in bookings:
        local_dt = timezone.localtime(b.created_at)
        time_str = local_dt.strftime("%I:%M %p")
        
        if local_dt.date() == now:
            display_date = f"Today, {time_str}"
        else:
            display_date = local_dt.strftime(f"%b {local_dt.day}, %Y, %I:%M %p")
            
        data.append({
            'id': b.id,
            'date': display_date,
            'is_today': local_dt.date() == now,
            'plate_number': b.vehicle.plate_number if b.vehicle else 'Walk-In',
            'service_package_name': b.service_package.name if b.service_package else 'Custom Service',
            'technician_name': b.technician.get_full_name() or b.technician.username if b.technician else 'Unassigned',
            'price': float(b.service_package.price) if b.service_package else 0.0,
        })
        
    return Response({
        'stats': {
            'target_date': target_date.strftime('%Y-%m-%d'),
            'total_services': total_services,
            'total_revenue': float(total_revenue)
        },
        'feed': data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_assigned_tasks(request):
    """Fetch all active tasks assigned to the logged-in worker."""
    tasks = Booking.objects.filter(
        technician=request.user
    ).exclude(
        status__in=['COMPLETED', 'READY', 'CANCELLED']
    ).select_related(
        'vehicle', 'service_package', 'customer__user'
    ).order_by('created_at')

    data = []
    for b in tasks:
        data.append({
            'id': b.id,
            'status': b.status,
            'plate_number': b.vehicle.plate_number if b.vehicle else '???',
            'vehicle_model': b.vehicle.model if b.vehicle else 'Unknown',
            'service_name': b.service_package.name if b.service_package else 'Walk-In Wash',
            'service_price': float(b.service_package.price) if b.service_package else 0.0,
            'customer_name': b.customer.user.get_full_name() or b.customer.user.username if b.customer else 'Walk-In',
            'bay_assignment': b.bay_assignment,
            'created_at': b.created_at.isoformat() if b.created_at else None,
            'start_time': b.start_time.isoformat() if b.start_time else None,
        })

    return Response(data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def start_task(request, booking_id):
    """Worker starts a wash — sets status to IN_PROGRESS and records start_time."""
    try:
        booking = Booking.objects.get(pk=booking_id, technician=request.user)
    except Booking.DoesNotExist:
        return Response({'error': 'Task not found or not assigned to you.'}, status=404)

    if booking.status == 'IN_PROGRESS':
        return Response({'error': 'Task is already in progress.'}, status=400)

    booking.status = 'IN_PROGRESS'
    booking.start_time = timezone.now()
    booking.save()

    return Response({'status': 'success', 'message': 'Task started.', 'booking_id': booking.id})


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def finish_task(request, booking_id):
    """Worker finishes a wash — sets status to READY and records end_time."""
    try:
        booking = Booking.objects.get(pk=booking_id, technician=request.user)
    except Booking.DoesNotExist:
        return Response({'error': 'Task not found or not assigned to you.'}, status=404)

    if booking.status != 'IN_PROGRESS':
        return Response({'error': 'Task must be in-progress before finishing.'}, status=400)

    booking.status = 'READY'
    booking.end_time = timezone.now()
    booking.save()

    return Response({'status': 'success', 'message': 'Task finished. Manager alerted.', 'booking_id': booking.id})
