from django.urls import path
from .views import daily_settlement_ledger, settle_daily_pay

urlpatterns = [
    path('daily-settlement/', daily_settlement_ledger, name='daily-settlement-ledger'),
    path('settle-pay/<int:staff_id>/', settle_daily_pay, name='settle-daily-pay'),
]
