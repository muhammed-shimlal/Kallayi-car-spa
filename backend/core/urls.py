from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, StaffViewSet, password_reset_request, password_reset_confirm

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'staff', StaffViewSet, basename='staff')

urlpatterns = [
    path('password-reset/', password_reset_request, name='core-password-reset-request'),
    path('password-reset-confirm/', password_reset_confirm, name='core-password-reset-confirm'),
    path('', include(router.urls)),
]
