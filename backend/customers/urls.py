from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, SubscriptionPlanViewSet, ReviewViewSet, CouponViewSet, register_customer

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'subscription-plans', SubscriptionPlanViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'coupons', CouponViewSet)

urlpatterns = [
    # Explicitly route the register endpoint BEFORE the router
    path('register/', register_customer, name='register_customer'),
    path('', include(router.urls)),
]
