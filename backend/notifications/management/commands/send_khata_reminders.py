from django.core.management.base import BaseCommand
from customers.models import Customer

class Command(BaseCommand):
    help = 'Sends gentle reminder mock SMS to all customers with an outstanding Khata balance'

    def handle(self, *args, **options):
        customers_with_debt = Customer.objects.filter(outstanding_balance__gt=0)
        
        if not customers_with_debt.exists():
            self.stdout.write(self.style.SUCCESS('No customers have an outstanding Khata balance. All is well.'))
            return

        count = 0
        for customer in customers_with_debt:
            name = customer.user.first_name or customer.user.username
            balance = customer.outstanding_balance
            
            # Mock SMS
            mock_sms = f"Hi {name}, a gentle reminder that your Khata balance is ₹{balance}. Click here to pay: https://kallayi-spa.com/pay"
            self.stdout.write(self.style.WARNING(f"---\n[SENDING SMS TO {customer.phone_number or 'UNKNOWN NUMBER'}]"))
            self.stdout.write(mock_sms)
            
            count += 1
            
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully sent {count} Khata reminders.'))
