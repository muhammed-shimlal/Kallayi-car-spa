from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from customers.views import CustomerViewSet, SubscriptionPlanViewSet, ReviewViewSet, CouponViewSet, CustomerVehicleViewSet
from fleet.views import VehicleViewSet, TechnicianLocationViewSet, ServiceVehicleViewSet, FleetLogViewSet
from bookings.views import BookingViewSet, ServicePackageViewSet, CalendarViewSet, DriverBookingViewSet
from finance.views import InvoiceViewSet, DashboardViewSet, GeneralExpenseViewSet, ExpenseCategoryViewSet, ReportingViewSet, KhataViewSet, SalaryPaymentViewSet, close_register, analytics_dashboard, generate_invoice_pdf, manual_khata_charge
from staff.views import TimeEntryViewSet, JobInspectionViewSet, SOPChecklistViewSet, StaffDashboardViewSet, StaffProfileViewSet

router = DefaultRouter()

# NEW: Register this BEFORE the generic 'customers' route to avoid ID collisions
router.register(r'customer-vehicles', CustomerVehicleViewSet, basename='customer-vehicle')

router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscription-plan')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'coupons', CouponViewSet, basename='coupon')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'locations', TechnicianLocationViewSet, basename='technician-location')
router.register(r'fleet/vehicles', ServiceVehicleViewSet, basename='service-vehicle')
router.register(r'fleet/logs', FleetLogViewSet, basename='fleet-log')
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'calendar', CalendarViewSet, basename='calendar')
router.register(r'driver-jobs', DriverBookingViewSet, basename='driver-jobs')
router.register(r'service-packages', ServicePackageViewSet, basename='service-package')
router.register(r'finance/invoices', InvoiceViewSet, basename='invoice')
router.register(r'finance/dashboard', DashboardViewSet, basename='dashboard')
router.register(r'finance/general-expenses', GeneralExpenseViewSet, basename='general-expense')
router.register(r'finance/salary-payments', SalaryPaymentViewSet, basename='salary-payments')
router.register(r'finance/expense-categories', ExpenseCategoryViewSet, basename='expense-category')
router.register(r'finance/reports', ReportingViewSet, basename='finance-reports')
router.register(r'finance/khata', KhataViewSet, basename='khata')

# Staff Routes
router.register(r'staff/time-entries', TimeEntryViewSet, basename='time-entry')
router.register(r'staff/inspections', JobInspectionViewSet, basename='job-inspection')
router.register(r'staff/sops', SOPChecklistViewSet, basename='sop-checklist')
router.register(r'staff/dashboard', StaffDashboardViewSet, basename='staff-dashboard')
router.register(r'staff/profiles', StaffProfileViewSet, basename='staff-profile')

from payments.views import PaymentViewSet, WebhookViewSet
router.register(r'payments', PaymentViewSet, basename='payments')
router.register(r'webhooks', WebhookViewSet, basename='webhooks')

from rest_framework.authtoken import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/bookings/', include('bookings.urls')),
    path('api/staff/', include('staff.urls')),
    path('api/core/', include('core.urls')),
    path('api/api-token-auth/', views.obtain_auth_token),
    path('api/finance/close-register/', close_register, name='close-register'),
    path('api/finance/analytics/', analytics_dashboard, name='analytics-dashboard'),
    path('api/finance/invoice/<int:booking_id>/pdf/', generate_invoice_pdf, name='invoice-pdf'),
    path('api/finance/khata/manual-charge/', manual_khata_charge, name='manual-khata-charge'),
    path('api/', include(router.urls)),
]
