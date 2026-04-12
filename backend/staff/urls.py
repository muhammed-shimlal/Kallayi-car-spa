from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import daily_settlement_ledger, settle_daily_pay, StaffDirectoryViewSet, add_staff_advance, settle_staff_payroll

router = DefaultRouter()
router.register(r'directory', StaffDirectoryViewSet, basename='staff-directory')

urlpatterns = [
    path('', include(router.urls)),
    path('daily-settlement/', daily_settlement_ledger, name='daily-settlement-ledger'),
    path('settle-pay/<int:staff_id>/', settle_daily_pay, name='settle-daily-pay'),
    path('advance/<int:staff_id>/', add_staff_advance, name='add-staff-advance'),
    path('payroll/<int:payroll_id>/settle/', settle_staff_payroll, name='settle_payroll'),
]