from django.core.management.base import BaseCommand
from customers.models import Customer
from notifications.services import WhatsAppNotificationService


class Command(BaseCommand):
    help = 'Sends WhatsApp payment reminders to all customers with an outstanding Khata balance'

    def handle(self, *args, **options):
        customers_with_debt = Customer.objects.filter(outstanding_balance__gt=0)
        
        if not customers_with_debt.exists():
            self.stdout.write(self.style.SUCCESS('No customers have an outstanding Khata balance. All is well.'))
            return

        count = 0
        for customer in customers_with_debt:
            balance = customer.outstanding_balance
            phone = customer.phone_number or (getattr(customer, 'user', None) and customer.user.username) or 'N/A'
            
            self.stdout.write(self.style.WARNING(f"[SENDING WHATSAPP KHATA REMINDER TO {phone} | Balance: Rs.{balance}]"))
            success = WhatsAppNotificationService.send_khata_reminder(customer, balance)
            if success:
                count += 1
            
        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully dispatched {count} WhatsApp Khata reminders.'))
