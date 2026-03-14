import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from customers.models import Customer
from staff.models import StaffProfile

def create_users():
    # 1. Admin
    admin_phone = "+919999999999"
    admin_pass = "admin123"
    
    admin_user, created = User.objects.get_or_create(username=admin_phone)
    admin_user.set_password(admin_pass)
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()
    
    # 2. Staff (Washer)
    staff_phone = "+918888888888"
    staff_pass = "staff123"
    
    staff_user, created = User.objects.get_or_create(username=staff_phone)
    staff_user.set_password(staff_pass)
    staff_user.save()
    
    StaffProfile.objects.get_or_create(
        user=staff_user,
        defaults={'role': 'WASHER'}
    )

    # 3. Customer
    customer_phone = "+917777777777"
    customer_pass = "customer123"
    
    cust_user, created = User.objects.get_or_create(username=customer_phone)
    cust_user.set_password(customer_pass)
    cust_user.save()
    
    Customer.objects.get_or_create(
        user=cust_user,
        defaults={'phone_number': customer_phone}
    )

    print("✅ TEST ACCOUNTS CREATED SUCCESSFULLY")
    print("-" * 30)
    print(f"👑 ADMIN    | Phone: {admin_phone} | Pass: {admin_pass}")
    print(f"🛠️ STAFF    | Phone: {staff_phone} | Pass: {staff_pass}")
    print(f"🚗 CUSTOMER | Phone: {customer_phone} | Pass: {customer_pass}")
    print("-" * 30)

if __name__ == '__main__':
    create_users()
