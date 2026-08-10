from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, SAFE_METHODS, BasePermission, IsAuthenticated
from core.permissions import IsAdmin, IsStaffUser, IsCustomerUser, IsOwnerOrAdmin, get_user_role
from django.db import transaction
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Customer, SubscriptionPlan, MemberSubscription
from .serializers import CustomerSerializer, SubscriptionPlanSerializer
from django.utils import timezone

from django.db.models import Q

def normalize_phone(phone_str):
    if not phone_str:
        return ''
    digits = ''.join(c for c in phone_str if c.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits

def claim_or_link_customer(user, phone_number=None, name=None):
    """
    Links a newly registered or authenticated User to an existing guest Customer profile
    if one exists with the same phone number. Otherwise, creates or updates the Customer profile.
    """
    raw_phone = (phone_number or user.username or '').strip()
    clean_phone = normalize_phone(raw_phone)

    if not clean_phone:
        customer, _ = Customer.objects.get_or_create(user=user, defaults={'phone_number': raw_phone})
        return customer

    # Look for existing Customer records with matching phone number
    existing_customers = Customer.objects.filter(
        Q(phone_number__icontains=clean_phone) | Q(user__username__icontains=clean_phone)
    )

    unlinked_customer = None
    for c in existing_customers:
        if c.user == user:
            unlinked_customer = c
            break
        # Claimable profile: linked to temporary admin/guest user
        if c.user and (c.user.username.startswith('guest_') or c.user.username.startswith('walkin_') or not c.user.has_usable_password()):
            unlinked_customer = c
            break

    if unlinked_customer:
        old_user = unlinked_customer.user
        
        # Re-link customer profile
        unlinked_customer.user = user
        if raw_phone:
            unlinked_customer.phone_number = raw_phone
        unlinked_customer.save()

        # Re-link vehicles from old dummy user to new user
        if old_user and old_user != user:
            from .models import CustomerVehicle
            CustomerVehicle.objects.filter(customer=old_user).update(customer=user)
            
            # Clean up orphaned guest user
            if old_user.username.startswith('guest_') or old_user.username.startswith('walkin_'):
                try:
                    old_user.delete()
                except Exception:
                    pass

        if name and not user.first_name:
            user.first_name = name
            user.save()

        return unlinked_customer
    else:
        customer, created = Customer.objects.get_or_create(
            user=user,
            defaults={'phone_number': raw_phone}
        )
        if not created and raw_phone and not customer.phone_number:
            customer.phone_number = raw_phone
            customer.save()

        if name and not user.first_name:
            user.first_name = name
            user.save()

        return customer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        qs = Customer.objects.all() if (role in ['ADMIN', 'MANAGER'] or user.is_staff) else Customer.objects.filter(user=user)

        search = self.request.query_params.get('search', '').strip() or self.request.query_params.get('q', '').strip()
        if search:
            clean_phone = normalize_phone(search)
            q_filter = (
                Q(user__first_name__icontains=search) |
                Q(user__last_name__icontains=search) |
                Q(user__username__icontains=search) |
                Q(phone_number__icontains=search)
            )
            if clean_phone:
                q_filter |= Q(phone_number__icontains=clean_phone) | Q(user__username__icontains=clean_phone)
            qs = qs.filter(q_filter)[:15]

        return qs

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        user = request.user
        customer = None
        if hasattr(user, 'customer'):
            customer = user.customer
        else:
            customer = claim_or_link_customer(user)

        from finance.models import KhataLedger
        from django.db.models import Sum
        total_credit = float(
            KhataLedger.objects.filter(customer=customer, transaction_type='CHARGE')
            .aggregate(total=Sum('amount'))['total'] or 0.0
        )
        total_settled = float(
            KhataLedger.objects.filter(customer=customer, transaction_type='SETTLEMENT')
            .aggregate(total=Sum('amount'))['total'] or 0.0
        )

        v_count = customer.vehicles.count() if hasattr(customer, 'vehicles') else 0
        return Response({
            'id': customer.id,
            'name': customer.user.get_full_name() or customer.user.first_name or customer.user.username,
            'phone_number': customer.phone_number or customer.user.username,
            'outstanding_balance': float(customer.outstanding_balance or 0.0),
            'total_credit': round(total_credit, 2),
            'total_settled': round(total_settled, 2),
            'credit_limit': float(customer.credit_limit or 0.0),
            'vehicle_count': v_count
        })

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def ledger(self, request):
        """GET /api/customers/me/ledger/"""
        from finance.views import KhataViewSet
        return KhataViewSet().my_ledger(request)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def search(self, request):
        """
        Optimized, debounced search API for Khata/Credit customer lookup.
        Only returns matching credit-eligible customers based on search query parameter (e.g. ?q=... or ?search=...).
        Limits returned results to max 15 records for optimal performance.
        """
        search_query = request.query_params.get('search', '').strip() or request.query_params.get('q', '').strip()
        if not search_query:
            return Response([])

        clean_phone = normalize_phone(search_query)

        q_filter = (
            Q(user__first_name__icontains=search_query) |
            Q(user__last_name__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(phone_number__icontains=search_query)
        )
        if clean_phone:
            q_filter |= Q(phone_number__icontains=clean_phone) | Q(user__username__icontains=clean_phone)

        customers = Customer.objects.filter(q_filter).select_related('user').order_by('-id')[:15]

        results = []
        for c in customers:
            full_name = c.user.get_full_name() or c.user.first_name or c.user.username
            results.append({
                'id': c.id,
                'name': full_name,
                'phone_number': c.phone_number or c.user.username,
                'outstanding_balance': float(c.outstanding_balance or 0.0),
                'credit_limit': float(c.credit_limit or 0.0)
            })

        return Response(results)

    def create(self, request, *args, **kwargs):
        name = request.data.get('name', '').strip()
        phone_number = request.data.get('phone_number', '')
        credit_limit = request.data.get('credit_limit', 0)

        if not name:
            return Response({'error': 'Name is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Auto-generate a unique username based on the provided name
        base_username = name.lower().replace(' ', '_')
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        # Create the underlying User object with a secure random password
        new_user = User.objects.create_user(
            username=username,
            password=User.objects.make_random_password(length=16),
            first_name=name
        )

        # Create the Customer profile linked to the new user
        customer = Customer.objects.create(
            user=new_user,
            phone_number=phone_number,
            credit_limit=credit_limit
        )

        serializer = self.get_serializer(customer)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Update the underlying User's first_name if a new name is provided
        name = request.data.get('name')
        if name is not None:
            instance.user.first_name = name.strip()
            instance.user.save()

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    @transaction.atomic
    def register(self, request):
        from .serializers import CustomerRegistrationSerializer
        serializer = CustomerRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            # Format serializer errors cleanly
            err_dict = serializer.errors
            first_field = list(err_dict.keys())[0]
            err_msg = err_dict[first_field][0] if isinstance(err_dict[first_field], list) else str(err_dict[first_field])
            return Response({'error': err_msg}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        name = validated_data['name']
        phone = validated_data['phone']
        email = validated_data['email']
        password = validated_data['password']

        clean_phone = normalize_phone(phone)
        username_target = clean_phone if clean_phone else phone

        # Check if an active registered User already exists across formats
        q_filter = Q(username__iexact=phone) | Q(username__iexact=username_target)
        if clean_phone:
            q_filter |= Q(username__icontains=clean_phone)
            q_filter |= Q(customer__phone_number__icontains=clean_phone)

        existing_user = User.objects.filter(q_filter).first()
        if existing_user and existing_user.has_usable_password() and not (existing_user.username.startswith('guest_') or existing_user.username.startswith('walkin_')):
            return Response({'error': 'Phone number already registered. Please log in.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            if existing_user and (existing_user.username.startswith('guest_') or existing_user.username.startswith('walkin_') or not existing_user.has_usable_password()):
                user = existing_user
                user.username = username_target
                user.first_name = name
                user.email = email
                user.set_password(password)
                user.is_active = True
                user.save()
            else:
                user = User.objects.create_user(
                    username=username_target,
                    email=email,
                    password=password,
                    first_name=name,
                    is_active=True
                )

            customer = claim_or_link_customer(user, phone_number=phone, name=name)
            
            # Create vehicle if optional vehicle data provided
            vehicle_data = request.data.get('vehicle')
            if vehicle_data and isinstance(vehicle_data, dict):
                make = vehicle_data.get('make', '').strip()
                model = vehicle_data.get('model', '').strip()
                plate = vehicle_data.get('plate_number', '').strip()
                if make or model or plate:
                    from .models import CustomerVehicle
                    CustomerVehicle.objects.get_or_create(
                        customer=user,
                        plate_number=plate or f'KALLAYI-{user.id}',
                        defaults={'make': make or 'Unknown', 'model': model or 'Unknown'}
                    )

            token, _ = Token.objects.get_or_create(user=user)
            
            return Response({
                'token': token.key,
                'user_id': user.id,
                'username': user.username,
                'name': user.first_name,
                'role': 'customer'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("Registration error: %s", str(e), exc_info=True)
            return Response({'error': 'Registration failed. Please try again.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    @transaction.atomic
    def redeem_points(self, request):
        user = request.user
        try:
            customer = Customer.objects.select_for_update().get(user=user)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer profile not found'}, status=404)
            
        points_to_redeem = int(request.data.get('points', 0))
        if points_to_redeem <= 0:
            return Response({'error': 'Invalid points'}, status=400)
            
        if customer.loyalty_points < points_to_redeem:
            return Response({'error': 'Insufficient points'}, status=400)
            
        customer.loyalty_points -= points_to_redeem
        customer.save()
        
        return Response({
            'status': 'success', 
            'remaining_points': customer.loyalty_points,
            'message': f'Redeemed {points_to_redeem} points successfully.'
        })

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def manage_subscription(self, request):
        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer profile not found'}, status=404)
            
        plan_id = request.data.get('plan_id')
        if not plan_id:
             return Response({'error': 'Missing plan_id'}, status=400)
             
        try:
            new_plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Invalid plan'}, status=404)
            
        # Get active sub or create new
        sub, created = MemberSubscription.objects.get_or_create(
            customer=customer,
            defaults={
                'plan': new_plan,
                'end_date': timezone.now().date() + timezone.timedelta(days=new_plan.interval_days)
            }
        )
        
        if not created:
            # Upgrade/Downgrade logic
            sub.plan = new_plan
            # Reset cycle or prorate? kept simple for MVP: Reset end date relative to today
            sub.end_date = timezone.now().date() + timezone.timedelta(days=new_plan.interval_days)
            sub.save()
            
        return Response({'status': 'success', 'plan': new_plan.name, 'end_date': sub.end_date})


class IsAdminUserOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff

class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAdminUserOrReadOnly]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def purchase_plan(self, request, pk=None):
        plan = self.get_object()
        user = request.user
        
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer profile not found'}, status=404)

        # Create or Get Subscription
        # NOTE: For MVP, we assume purchasing a plan immediately activates it OR upgrades pending payment.
        # We will create an Invoice.
        
        sub, _ = MemberSubscription.objects.get_or_create(
            customer=customer,
            defaults={
                'plan': plan,
                'end_date': timezone.now().date() + timezone.timedelta(days=plan.interval_days),
                'is_active': False # Pending payment
            }
        )
        # Verify if existing sub needs update
        if sub.plan != plan:
             sub.plan = plan
             sub.save()

        # Create Invoice
        from finance.models import Invoice, RevenueCategory
        cat, _ = RevenueCategory.objects.get_or_create(name='Subscription')
        
        invoice = Invoice.objects.create(
            subscription=sub,
            amount=plan.price,
            revenue_category=cat,
            is_deferred=True,
            is_paid=False 
        )
        
        return Response({
            'status': 'invoice_created',
            'invoice_id': invoice.id,
            'amount': invoice.amount,
            'message': 'Please pay the invoice to activate subscription.'
        })

from .models import Review, Coupon
from .serializers import ReviewSerializer, CouponSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]
    
    def perform_create(self, serializer):
        # Auto-link customer if possible, though customer field is required in model
        # Just save normally for now or infer from request.user
        if self.request.user.is_authenticated:
            try:
                customer = Customer.objects.get(user=self.request.user)
                serializer.save(customer=customer)
            except Customer.DoesNotExist:
                serializer.save()
        else:
            serializer.save()

class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUserOrReadOnly]

from .models import CustomerVehicle
from .serializers import CustomerVehicleSerializer

class CustomerVehicleViewSet(viewsets.ModelViewSet):
    queryset = CustomerVehicle.objects.all()
    serializer_class = CustomerVehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = CustomerVehicle.objects.all() if (user.is_staff or user.is_superuser) else CustomerVehicle.objects.filter(customer=user)

        phone_param = self.request.query_params.get('phone') or self.request.query_params.get('search')
        if phone_param:
            raw_phone = phone_param.strip()
            clean_phone = raw_phone.replace(' ', '').replace('-', '').replace('+', '')
            if clean_phone.startswith('91') and len(clean_phone) > 10:
                clean_phone = clean_phone[2:]

            if clean_phone and len(clean_phone) >= 4:
                from .models import Customer
                from django.db.models import Q

                matching_customers = Customer.objects.filter(phone_number__icontains=clean_phone)
                customer_user_ids = list(matching_customers.values_list('user_id', flat=True))

                qs = qs.filter(
                    Q(customer__username__icontains=clean_phone) |
                    Q(customer__id__in=customer_user_ids) |
                    Q(customer__customer__phone_number__icontains=clean_phone)
                ).distinct()
            else:
                return CustomerVehicle.objects.none()

        return qs

    @action(detail=False, methods=['get'])
    def garage(self, request):
        """
        GET /api/customer-vehicles/garage/?phone=9876543210
        Returns all registered vehicles strictly owned by the provided phone number.
        Returns empty list [] if phone is missing or no customer matched.
        """
        phone = request.query_params.get('phone', '').strip()
        if not phone:
            return Response([])

        clean_phone = phone.replace(' ', '').replace('-', '').replace('+', '')
        if clean_phone.startswith('91') and len(clean_phone) > 10:
            clean_phone = clean_phone[2:]

        if len(clean_phone) < 4:
            return Response([])

        from .models import Customer
        from django.db.models import Q

        matching_customers = Customer.objects.filter(phone_number__icontains=clean_phone)
        customer_user_ids = list(matching_customers.values_list('user_id', flat=True))

        vehicles = CustomerVehicle.objects.filter(
            Q(customer__username__icontains=clean_phone) |
            Q(customer__id__in=customer_user_ids) |
            Q(customer__customer__phone_number__icontains=clean_phone)
        ).distinct()

        serializer = self.get_serializer(vehicles, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def lookup(self, request):
        """Lookup a customer vehicle by plate number to auto-fill details in POS intake."""
        plate = request.query_params.get('plate', '').strip()
        if not plate:
            return Response({'error': 'No plate provided'}, status=400)
        
        vehicle = CustomerVehicle.objects.filter(plate_number__iexact=plate).select_related('customer').first()
        if vehicle:
            customer_name = "Walk-In Guest"
            customer_phone = ""
            if vehicle.customer:
                customer_name = vehicle.customer.get_full_name() or vehicle.customer.first_name or vehicle.customer.username
                customer_phone = vehicle.customer.username
                if hasattr(vehicle.customer, 'customer') and vehicle.customer.customer.phone_number:
                    customer_phone = vehicle.customer.customer.phone_number

            return Response({
                'plate_number': vehicle.plate_number,
                'make': vehicle.make,
                'model': vehicle.model,
                'vehicle_type': vehicle.vehicle_type,
                'color': vehicle.color,
                'phone': customer_phone,
                'customer_name': customer_name
            })
        return Response({'error': 'Not found'}, status=404)

    def perform_create(self, serializer):
        # Staff can pass an explicit customer ID; regular users are auto-assigned
        if (self.request.user.is_staff or self.request.user.is_superuser) and 'customer' in self.request.data:
            serializer.save()
        else:
            serializer.save(customer=self.request.user)
