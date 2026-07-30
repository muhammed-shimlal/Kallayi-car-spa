from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, SubscriptionPlanViewSet, ReviewViewSet, CouponViewSet, CustomerVehicleViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'coupons', CouponViewSet, basename='coupon')
# This explicitly creates the /api/customers/vehicles/ endpoint!
router.register(r'vehicles', CustomerVehicleViewSet, basename='customer-vehicle') 

urlpatterns = [
    path('', include(router.urls)),
]