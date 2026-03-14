from django.urls import path
from .views import express_walkin

urlpatterns = [
    path('express-walkin/', express_walkin, name='express-walkin'),
]
