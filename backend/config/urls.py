from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from customers.views import CustomerViewSet, SubscriptionPlanViewSet, ReviewViewSet, CouponViewSet
from fleet.views import VehicleViewSet, TechnicianLocationViewSet, ServiceVehicleViewSet, FleetLogViewSet
from bookings.views import BookingViewSet, ServicePackageViewSet, CalendarViewSet, DriverBookingViewSet
from finance.views import InvoiceViewSet, DashboardViewSet, GeneralExpenseViewSet, ExpenseCategoryViewSet, ReportingViewSet, KhataViewSet, close_register, analytics_dashboard, generate_invoice_pdf
from staff.views import TimeEntryViewSet, JobInspectionViewSet, SOPChecklistViewSet, StaffDashboardViewSet, StaffProfileViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'subscription-plans', SubscriptionPlanViewSet)
router.register(r'reviews', ReviewViewSet)
router.register(r'coupons', CouponViewSet)
router.register(r'vehicles', VehicleViewSet)
router.register(r'locations', TechnicianLocationViewSet)
router.register(r'fleet/vehicles', ServiceVehicleViewSet)
router.register(r'fleet/logs', FleetLogViewSet)
router.register(r'bookings', BookingViewSet)
router.register(r'calendar', CalendarViewSet, basename='calendar')
router.register(r'driver-jobs', DriverBookingViewSet, basename='driver-jobs')
router.register(r'service-packages', ServicePackageViewSet)
router.register(r'invoices', InvoiceViewSet)
router.register(r'finance/dashboard', DashboardViewSet, basename='dashboard')
router.register(r'finance/general-expenses', GeneralExpenseViewSet)
router.register(r'finance/expense-categories', ExpenseCategoryViewSet)
router.register(r'finance/reports', ReportingViewSet, basename='finance-reports')
router.register(r'finance/khata', KhataViewSet, basename='khata')

# Staff Routes
router.register(r'staff/time-entries', TimeEntryViewSet)
router.register(r'staff/inspections', JobInspectionViewSet)
router.register(r'staff/sops', SOPChecklistViewSet)
router.register(r'staff/dashboard', StaffDashboardViewSet, basename='staff-dashboard')
router.register(r'staff/profiles', StaffProfileViewSet)

from payments.views import PaymentViewSet, WebhookViewSet
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'webhooks', WebhookViewSet, basename='webhooks')

from rest_framework.authtoken import views

from customers.views import register_customer

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/bookings/', include('bookings.urls')),
    path('api/staff/', include('staff.urls')),
    path('api/', include(router.urls)),
    path('api/core/', include('core.urls')),
    path('api/api-token-auth/', views.obtain_auth_token),
    path('api/register/', register_customer),
    path('api/finance/close-register/', close_register, name='close-register'),
    path('api/finance/analytics/', analytics_dashboard, name='analytics-dashboard'),
    path('api/finance/invoice/<int:booking_id>/pdf/', generate_invoice_pdf, name='invoice-pdf'),
]
