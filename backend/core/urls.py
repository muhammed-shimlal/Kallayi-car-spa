from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, StaffViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'staff', StaffViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
