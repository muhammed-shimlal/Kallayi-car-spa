from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, StaffViewSet, password_reset_request, password_reset_confirm, request_password_reset_otp, verify_password_reset_otp, change_password_view

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'staff', StaffViewSet, basename='staff')

urlpatterns = [
    path('change-password/', change_password_view, name='core-change-password'),
    path('password-reset/', password_reset_request, name='core-password-reset-request'),
    path('password-reset/request-otp/', request_password_reset_otp, name='core-password-reset-request-otp'),
    path('password-reset/verify-otp/', verify_password_reset_otp, name='core-password-reset-verify-otp'),
    path('password-reset-confirm/', password_reset_confirm, name='core-password-reset-confirm'),
    path('', include(router.urls)),
]
