from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import FleetLog
from finance.models import GeneralExpense, ExpenseCategory

@receiver(post_save, sender=FleetLog)
def create_expense_from_log(sender, instance, created, **kwargs):
    if created and instance.amount > 0:
        # Determine category based on log type
        cat_name = 'Automobile'
        if instance.log_type == 'FUEL':
            cat_name = 'Fuel'
        elif instance.log_type == 'MAINTENANCE':
            cat_name = 'Maintenance'
            
        category, _ = ExpenseCategory.objects.get_or_create(name=cat_name)
        
        GeneralExpense.objects.create(
            category=category,
            amount=instance.amount,
            description=f"Fleet Log: {instance.vehicle} - {instance.notes}",
            date=instance.created_at.date(),
            receipt_image=instance.receipt_photo,
            recorded_by=instance.recorded_by
        )
