from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, SAFE_METHODS, BasePermission, IsAuthenticated
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import Customer, SubscriptionPlan, MemberSubscription
from .serializers import CustomerSerializer, SubscriptionPlanSerializer
from django.utils import timezone

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def redeem_points(self, request):
        user = request.user
        try:
            customer = Customer.objects.get(user=user)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer profile not found'}, status=404)
            
        points_to_redeem = int(request.data.get('points', 0))
        if points_to_redeem <= 0:
            return Response({'error': 'Invalid points'}, status=400)
            
        if customer.loyalty_points < points_to_redeem:
            return Response({'error': 'Insufficient points'}, status=400)
            
        # Redeem logic: Simple 1 point = 1 Rupee (or whatever logic)
        # For now, just deduct points and return a "coupon code" or success message
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

@api_view(['POST'])
@permission_classes([AllowAny])
def register_customer(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not password:
        return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already taken'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.create_user(username=username, email=email, password=password)
        Customer.objects.create(user=user)
        token, _ = Token.objects.get_or_create(user=user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'role': 'customer'
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
