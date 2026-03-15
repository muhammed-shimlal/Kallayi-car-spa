from django.urls import path
from .views import express_walkin, update_booking_stage, live_queue, vehicle_crm_history, global_service_history

urlpatterns = [
    path('express-walkin/', express_walkin, name='express-walkin'),
    path('update-stage/<int:booking_id>/', update_booking_stage, name='update-booking-stage'),
    path('live-queue/', live_queue, name='live-queue'),
    path('vehicle-history/', vehicle_crm_history, name='vehicle-history'),
    path('global-history/', global_service_history, name='global-history'),
]
