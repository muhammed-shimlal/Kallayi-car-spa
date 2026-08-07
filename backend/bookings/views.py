from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Booking, ServicePackage
from .serializers import BookingSerializer, ServicePackageSerializer
from rest_framework.permissions import BasePermission, SAFE_METHODS, IsAuthenticated, AllowAny
from core.permissions import IsAdmin, IsStaffUser, IsCustomerUser, IsOwnerOrAdmin, get_user_role
from django.utils.dateparse import parse_date, parse_datetime
from datetime import timedelta, datetime, time
from django.db.models import Q
from django.contrib.auth.models import User
from staff.models import StaffProfile
from django.utils import timezone
try:
    from zoneinfo import ZoneInfo
except ImportError:
    import pytz
    ZoneInfo = lambda tz_name: pytz.timezone(tz_name)
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
import random
from customers.models import Customer, CustomerVehicle
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
    permission_classes = [IsAuthenticated]

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in SAFE_METHODS:
            role = get_user_role(request.user)
            if role not in ['ADMIN', 'MANAGER']:
                self.permission_denied(request, message="Only Admin or Manager can modify service packages.")

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        if role in ['ADMIN', 'MANAGER']:
            queryset = Booking.objects.all().order_by('-created_at')
        elif role in ['WASHER', 'DRIVER', 'TECHNICIAN']:
            queryset = Booking.objects.filter(Q(technician=user) | ~Q(status__in=['COMPLETED', 'CANCELLED'])).order_by('-created_at')
        elif hasattr(user, 'customer'):
            queryset = Booking.objects.filter(customer=user.customer).order_by('-created_at')
        else:
            queryset = Booking.objects.none()

        status_param = self.request.query_params.get('status')
        if status_param:
            statuses = [s.strip() for s in status_param.split(',')]
            # Match upper or lower or exact match
            query_statuses = []
            for s in statuses:
                query_statuses.extend([s, s.upper(), s.lower(), s.capitalize()])
            queryset = queryset.filter(status__in=query_statuses)

        type_param = self.request.query_params.get('type')
        if type_param == 'upcoming':
            ist_tz = ZoneInfo('Asia/Kolkata')
            today_date = timezone.now().astimezone(ist_tz).date()
            queryset = queryset.filter(time_slot__date__gte=today_date).exclude(status__in=['COMPLETED', 'CANCELLED']).order_by('time_slot')
        else:
            date_param = self.request.query_params.get('date')
            if date_param:
                if date_param.lower() == 'today':
                    target_date = timezone.localdate()
                else:
                    try:
                        target_date = parse_date(date_param) or datetime.strptime(date_param, '%Y-%m-%d').date()
                    except Exception:
                        target_date = timezone.localdate()
                if target_date:
                    queryset = queryset.filter(
                        Q(created_at__date=target_date) | 
                        Q(start_time__date=target_date) | 
                        Q(end_time__date=target_date) |
                        Q(time_slot__date=target_date)
                    ).distinct()

        return queryset

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

    @action(detail=False, methods=['get'], url_path='today-washed')
    def today_washed(self, request):
        """
        Returns summary and list of completed bookings for today.
        """
        today = timezone.localdate()
        today_washed_bookings = Booking.objects.filter(
            status__in=['COMPLETED', 'Completed', 'completed']
        ).filter(
            Q(created_at__date=today) | 
            Q(start_time__date=today) | 
            Q(end_time__date=today) |
            Q(time_slot__date=today)
        ).select_related('customer', 'technician', 'service_package', 'vehicle').order_by('-created_at').distinct()
        
        serializer = self.get_serializer(today_washed_bookings, many=True)
        return Response({
            'today_washed_count': today_washed_bookings.count(),
            'count': today_washed_bookings.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def checkout(self, request, pk=None):
        booking = self.get_object()
        
        amount_cash = float(request.data.get('amount_cash', 0))
        amount_upi = float(request.data.get('amount_upi', 0))
        amount_khata = float(request.data.get('amount_khata', 0))

        customer_id_param = request.data.get('customer_id')
        customer_name_param = request.data.get('customer_name')
        phone_param = request.data.get('phone_number') or request.data.get('phone') or ''

        # Link or create Customer profile if Khata is involved or customer details provided
        from customers.models import Customer
        from django.contrib.auth.models import User

        target_customer = None
        if customer_id_param:
            target_customer = Customer.objects.filter(id=customer_id_param).first()

        if not target_customer and phone_param:
            target_customer = Customer.objects.filter(phone_number=phone_param).first()

        if not target_customer and booking.customer:
            target_customer = booking.customer

        if amount_khata > 0 and not target_customer:
            c_name = customer_name_param or "Walk-In Guest"
            import random
            import string
            
            username = f"walkin_khata_{random.randint(100000, 999999)}"
            while User.objects.filter(username=username).exists():
                username = f"walkin_khata_{random.randint(100000, 999999)}"
            
            new_user = User.objects.create(username=username, first_name=c_name)
            new_user.set_password(''.join(random.choices(string.ascii_letters + string.digits, k=12)))
            new_user.save()
            target_customer = Customer.objects.create(user=new_user, phone_number=phone_param)

        if target_customer:
            # Update customer details if provided
            if customer_name_param and target_customer.user and not target_customer.user.first_name:
                target_customer.user.first_name = customer_name_param
                target_customer.user.save()
            if phone_param and not target_customer.phone_number:
                target_customer.phone_number = phone_param
                target_customer.save()

            booking.customer = target_customer

        booking.status = 'COMPLETED'
        booking.end_time = timezone.now()
        booking.save()
        
        if amount_khata > 0 and booking.customer:
            from finance.models import KhataLedger
            from decimal import Decimal
            booking.customer.outstanding_balance += Decimal(str(amount_khata))
            booking.customer.save()

            plate_info = booking.vehicle.plate_number if booking.vehicle else request.data.get('plate_number', 'Walk-In')
            svc_info = booking.service_package.name if booking.service_package else 'Car Wash'

            KhataLedger.objects.create(
                customer=booking.customer,
                amount=Decimal(str(amount_khata)),
                transaction_type='CHARGE',
                description=f'Khata Wash Charge: {svc_info} ({plate_info})',
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

        # 1. Server current time converted explicitly to Indian Standard Time (IST)
        ist_tz = ZoneInfo('Asia/Kolkata')
        now_ist = timezone.now().astimezone(ist_tz)

        # 2. Query ONLINE scheduled bookings on target_date (ignoring CANCELLED ones)
        existing_bookings = Booking.objects.filter(
            time_slot__date=target_date
        ).exclude(status='CANCELLED')

        # 3. Find booked slot times and integer hours in IST
        booked_hours = set()
        booked_slots = set()
        for b in existing_bookings:
            if b.time_slot:
                local_b_time = b.time_slot.astimezone(ist_tz)
                booked_hours.add(local_b_time.hour)
                formatted_time_slot = local_b_time.strftime("%I:%M %p")
                booked_slots.add(formatted_time_slot)

        # 4. Define Standard Operating Hours (1-hour blocks from 9:00 AM to 6:00 PM) with availability flags
        slots = []
        for hour in range(9, 18):
            t = time(hour, 0)
            slot_time_str = t.strftime("%I:%M %p")

            slot_naive = datetime.combine(target_date, t)
            slot_dt = timezone.make_aware(slot_naive, ist_tz)

            is_past = slot_dt <= now_ist
            is_booked = (hour in booked_hours) or (slot_time_str in booked_slots)
            is_available = not (is_past or is_booked)

            slots.append({
                'time': slot_time_str,
                'is_available': is_available
            })

        return Response({'date': date_str, 'slots': slots})

class CalendarViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        queryset = Booking.objects.all()
        
        if start_date and end_date:
            queryset = queryset.filter(time_slot__date__range=[start_date, end_date])
            
        return queryset

class DriverBookingViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]

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
        
    make = (request.data.get('make') or request.data.get('vehicle_make') or '').strip()
    model = (request.data.get('model') or request.data.get('vehicle_model') or '').strip()
    vehicle_type = (request.data.get('vehicle_type') or 'CAR').strip().upper()
    color = (request.data.get('color') or '').strip()

    if vehicle_type in ['HATCHBACK', 'SEDAN', 'SUV', 'LUXURY']:
        vehicle_type = 'CAR'
    elif vehicle_type not in ['CAR', 'BIKE', 'AUTO', 'VAN', 'TRUCK']:
        vehicle_type = 'CAR'

    # Customer Resolution
    customer = Customer.objects.filter(phone_number=phone).first()
    if not customer:
        username = f"guest_{random.randint(100000, 999999)}"
        new_user = User.objects.create(username=username)
        customer = Customer.objects.create(user=new_user, phone_number=phone)
        
    # Vehicle Resolution (Extract & Save Real Vehicle Details)
    vehicle, created = CustomerVehicle.objects.get_or_create(
        plate_number=plate_number, 
        defaults={
            'customer': customer.user,
            'make': make or 'Standard',
            'model': model or 'Vehicle',
            'vehicle_type': vehicle_type,
            'color': color
        }
    )

    if not created:
        updated = False
        if make and vehicle.make != make:
            vehicle.make = make
            updated = True
        elif not vehicle.make or vehicle.make in ['Unknown', 'Unknown Walk-In', 'working']:
            vehicle.make = make or 'Standard'
            updated = True

        if model and vehicle.model != model:
            vehicle.model = model
            updated = True
        elif not vehicle.model or vehicle.model in ['Unknown', 'Unknown Walk-In', 'working']:
            vehicle.model = model or 'Vehicle'
            updated = True

        if vehicle_type and vehicle.vehicle_type != vehicle_type:
            vehicle.vehicle_type = vehicle_type
            updated = True

        if color and vehicle.color != color:
            vehicle.color = color
            updated = True

        if updated:
            vehicle.save()
    
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
    assigned_technician_id = (
        request.data.get('assigned_technician_id') or 
        request.data.get('technician_id') or 
        request.data.get('technician')
    )

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
    if assigned_technician_id is not None:
        try:
            tech_id_int = int(assigned_technician_id)
        except (TypeError, ValueError):
            return Response({'error': f'Invalid technician ID format: {assigned_technician_id}'}, status=400)

        from staff.models import StaffProfile
        from django.contrib.auth.models import User
        
        staff_prof = (
            StaffProfile.objects.filter(user_id=tech_id_int, is_active=True, user__is_active=True).first() or
            StaffProfile.objects.filter(id=tech_id_int, is_active=True, user__is_active=True).first()
        )
        if staff_prof:
            booking.technician = staff_prof.user
        else:
            user_inst = User.objects.filter(id=tech_id_int, is_active=True).first()
            if user_inst:
                booking.technician = user_inst
            else:
                return Response({'error': f'Technician ID {tech_id_int} is inactive, invalid, or does not exist.'}, status=400)

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
    """Fetch active bookings for the Kanban board filtered by date, today in IST, or type='upcoming'."""
    ist_tz = ZoneInfo('Asia/Kolkata')
    date_param = request.GET.get('date')
    type_param = request.GET.get('type')

    today_date = timezone.now().astimezone(ist_tz).date()

    if type_param == 'upcoming':
        bookings = Booking.objects.filter(
            time_slot__date__gte=today_date
        ).exclude(
            status__in=['COMPLETED', 'CANCELLED']
        ).select_related('vehicle', 'customer', 'service_package', 'technician').order_by('time_slot')
    elif date_param:
        try:
            target_date = parse_date(date_param)
            if not target_date:
                raise ValueError
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=400)

        bookings = Booking.objects.filter(
            time_slot__date=target_date
        ).exclude(
            status__in=['COMPLETED', 'CANCELLED']
        ).select_related('vehicle', 'customer', 'service_package', 'technician').order_by('time_slot')
    else:
        bookings = Booking.objects.filter(
            time_slot__date=today_date
        ).exclude(
            status__in=['COMPLETED', 'CANCELLED']
        ).select_related('vehicle', 'customer', 'service_package', 'technician').order_by('time_slot')

    data = []
    for b in bookings:
        vehicle_make = getattr(b.vehicle, 'make', '') if b.vehicle else ''
        vehicle_model = getattr(b.vehicle, 'model', 'Unknown') if b.vehicle else 'Unknown'
        full_vehicle = f"{vehicle_make} {vehicle_model}".strip() if vehicle_make else vehicle_model
        
        customer_phone = ''
        if b.customer:
            customer_phone = getattr(b.customer, 'phone_number', '')

        data.append({
            'id': b.id,
            'status': b.status,
            'bay_assignment': b.bay_assignment,
            'plate_number': b.vehicle.plate_number if b.vehicle else '???',
            'vehicle_make': vehicle_make,
            'vehicle_model': full_vehicle,
            'service_name': b.service_package.name if b.service_package else 'Walk-In',
            'service_details': b.service_package.description if b.service_package else '',
            'customer_name': str(b.customer) if b.customer else 'Walk-In',
            'customer_phone': customer_phone,
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
    """
    Vehicle & Customer CRM Search API.
    Searches across CustomerVehicle, Customer, and Booking models using Q objects for:
    - Vehicle License Plate Number (e.g. KL55A1234 or KL-55-A-1234)
    - Customer Phone Number (e.g. 9876543210)
    - Customer Name or Username
    Returns vehicle/owner profile, summary metrics, and full timeline of past service records.
    """
    from django.db.models import Q, Count, Sum
    from customers.models import CustomerVehicle, Customer
    from bookings.models import Booking

    query = request.GET.get('q', '').strip() or request.GET.get('query', '').strip() or request.GET.get('plate', '').strip()
    if not query:
        return Response({'error': 'Please provide a plate number or phone number to search.'}, status=400)

    clean_query = query.replace(' ', '').replace('-', '')

    # 1. Search CustomerVehicle matching plate, registration, or customer phone/name
    vehicle_qs = CustomerVehicle.objects.filter(
        Q(plate_number__icontains=query) |
        Q(plate_number__icontains=clean_query) |
        Q(registration_number__icontains=query) |
        Q(customer__username__icontains=query) |
        Q(customer__first_name__icontains=query) |
        Q(customer__last_name__icontains=query) |
        Q(customer__customer__phone_number__icontains=query)
    ).select_related('customer', 'customer__customer')

    # 2. Search Bookings matching plate, customer phone, or customer name
    bookings_qs = Booking.objects.filter(
        Q(vehicle__plate_number__icontains=query) |
        Q(vehicle__plate_number__icontains=clean_query) |
        Q(vehicle__registration_number__icontains=query) |
        Q(customer__phone_number__icontains=query) |
        Q(customer__user__username__icontains=query) |
        Q(customer__user__first_name__icontains=query) |
        Q(customer__user__last_name__icontains=query)
    ).select_related('vehicle', 'customer', 'customer__user', 'service_package', 'technician').order_by('-created_at')

    if not vehicle_qs.exists() and not bookings_qs.exists():
        return Response({'error': f'No service history found matching "{query}".'}, status=404)

    vehicle = vehicle_qs.first()
    first_booking = bookings_qs.first()

    plate_number = vehicle.plate_number if vehicle else (first_booking.vehicle.plate_number if first_booking and first_booking.vehicle else query.upper())
    make_model = f"{vehicle.make} {vehicle.model}" if vehicle else (f"{first_booking.vehicle.make} {first_booking.vehicle.model}" if first_booking and first_booking.vehicle else "Standard Vehicle")

    owner_name = "Walk-In Customer"
    owner_phone = ""
    outstanding_balance = 0.0

    if vehicle and vehicle.customer:
        u = vehicle.customer
        owner_name = u.get_full_name() or u.first_name or u.username
        owner_phone = u.username
        if hasattr(u, 'customer') and u.customer:
            owner_phone = u.customer.phone_number or u.username
            outstanding_balance = float(u.customer.outstanding_balance or 0.0)
    elif first_booking and first_booking.customer:
        c = first_booking.customer
        owner_name = c.user.get_full_name() or c.user.username if c.user else "Walk-In Customer"
        owner_phone = c.phone_number or (c.user.username if c.user else "")
        outstanding_balance = float(c.outstanding_balance or 0.0)

    # Combine distinct bookings
    bookings = bookings_qs.distinct()

    total_visits = bookings.count()
    total_lifetime_spend = sum(float(b.service_package.price) for b in bookings if b.service_package and b.service_package.price)

    favorite_service_data = (
        bookings
        .filter(service_package__isnull=False)
        .values('service_package__name')
        .annotate(count=Count('id'))
        .order_by('-count')
        .first()
    )
    favorite_service = favorite_service_data['service_package__name'] if favorite_service_data else "Standard Wash"

    timeline = []
    for b in bookings:
        raw_date = b.time_slot or b.created_at
        date_str = raw_date.strftime('%Y-%m-%d %I:%M %p') if raw_date else 'N/A'
        service_name = b.service_package.name if b.service_package else 'Walk-In Wash'
        tech_name = b.technician.get_full_name() or b.technician.username if b.technician else 'Unassigned'
        price = float(b.service_package.price) if b.service_package else 0.0

        timeline.append({
            'id': b.id,
            'booking_id': b.id,
            'date': date_str,
            'created_at': b.created_at.isoformat() if b.created_at else None,
            'plate_number': b.vehicle.plate_number if b.vehicle else plate_number,
            'vehicle_model': f"{b.vehicle.make} {b.vehicle.model}" if b.vehicle else make_model,
            'customer_name': b.customer.user.get_full_name() if (b.customer and b.customer.user) else owner_name,
            'customer_phone': b.customer.phone_number if b.customer else owner_phone,
            'service_package_name': service_name,
            'status': b.status,
            'technician_name': tech_name,
            'price': price,
            'price_paid': price,
            'bay_assignment': b.bay_assignment or 'Main Bay'
        })

    return Response({
        'plate': plate_number,
        'make_model': make_model,
        'customer_name': owner_name,
        'phone': owner_phone,
        'total_visits': total_visits,
        'total_lifetime_spend': round(total_lifetime_spend, 2),
        'favorite_service': favorite_service,
        'vehicle_profile': {
            'plate_number': plate_number,
            'model': make_model,
            'owner_name': owner_name,
            'owner_phone': owner_phone,
            'outstanding_balance': round(outstanding_balance, 2)
        },
        'kpis': {
            'total_visits': total_visits,
            'total_lifetime_spend': round(total_lifetime_spend, 2),
            'favorite_service': favorite_service
        },
        'timeline': timeline,
        'history': timeline
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
            
        vehicle_model = 'Standard Vehicle'
        if b.vehicle:
            vehicle_model = f"{b.vehicle.make} {b.vehicle.model}".strip() or b.vehicle.model
            
        cust_name = 'Walk-In Customer'
        cust_phone = ''
        if b.customer and b.customer.user:
            cust_name = f"{b.customer.user.first_name} {b.customer.user.last_name}".strip() or b.customer.user.username
            cust_phone = b.customer.phone_number
        elif b.vehicle and b.vehicle.customer:
            cust_name = f"{b.vehicle.customer.first_name} {b.vehicle.customer.last_name}".strip() or b.vehicle.customer.username

        data.append({
            'id': b.id,
            'booking_id': b.id,
            'date': display_date,
            'is_today': local_dt.date() == now,
            'plate_number': b.vehicle.plate_number if b.vehicle else 'Walk-In',
            'vehicle_model': vehicle_model,
            'customer_name': cust_name,
            'customer_phone': cust_phone,
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
