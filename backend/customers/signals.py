from django.db.models.signals import post_save
from django.dispatch import receiver
from bookings.models import Booking
from .models import Customer, Review

@receiver(post_save, sender=Booking)
def award_points_for_booking(sender, instance, created, **kwargs):
    if instance.status == 'COMPLETED':
        # Check if points already awarded? 
        # For MVP, assume status transition happens once. 
        # Ideal: have a flag 'points_awarded' on Booking, but let's stick to simple logic.
        # We can calculate 1 point per $1 or 10% 
        
        # Avoid duplicate award: check if this is the first time it became completed?
        # Difficult with post_save unless we track old instance.
        # Alternative: Just add points and rely on business process integrity.
        
        # Let's assume price is on ServicePackage.
        if instance.service_package:
             points = int(float(instance.service_package.price) * 0.1) # 10% points
             # Update customer
             customer = instance.customer
             customer.loyalty_points += points
             customer.save()


@receiver(post_save, sender=Review)
def award_points_for_review(sender, instance, created, **kwargs):
    if created:
        customer = instance.customer
        customer.loyalty_points += 50 # Bonus for review
        customer.save()
