from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import FleetLog
from finance.models import GeneralExpense, ExpenseCategory
import logging

logger = logging.getLogger(__name__)

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

@receiver(post_save, sender=FleetLog)
def check_maintenance_alert(sender, instance, created, **kwargs):
    """
    After a fleet log is created, check if the vehicle needs service
    based on odometer reading and alert managers.
    """
    if created and instance.odometer > 0:
        vehicle = instance.vehicle
        
        # Check if maintenance is due
        if vehicle.needs_service(instance.odometer):
            # Log alert (in production, create a notification or send email)
            logger.warning(
                f"MAINTENANCE ALERT: {vehicle.plate_number} needs service! "
                f"Current: {instance.odometer}km, Last service: {vehicle.last_service_odometer}km"
            )
            
            # You could create a Notification model entry here for the manager to see
            # For now, we'll just log it. In a real system, you'd:
            # Notification.objects.create(
            #     user=<manager_user>,
            #     title="Vehicle Maintenance Due",
            #     message=f"{vehicle} needs service at {instance.odometer}km"
            # )

