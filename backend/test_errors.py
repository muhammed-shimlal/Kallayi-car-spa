import sys
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth.models import User

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

try:
    c = APIClient(SERVER_NAME='127.0.0.1')
    u = User.objects.filter(is_superuser=True).first()
    c.force_authenticate(user=u)
    
    # test manual charge
    r = c.post('/api/finance/khata/manual-charge/', {'phone': '9999999999', 'name': 'test', 'amount': 100}, format='json')
    if r.status_code == 500:
        print("ERROR MANUAL CHARGE:")
        print(r.content.decode())
    
    # test outstanding credit
    r2 = c.get('/api/finance/dashboard/outstanding_credit/')
    if r2.status_code == 500:
        print("ERROR OUTSTANDING CREDIT:")
        print(r2.content.decode())
except Exception as e:
    import traceback
    traceback.print_exc()
