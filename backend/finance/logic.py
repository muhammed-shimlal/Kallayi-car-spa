from decimal import Decimal
from django.utils import timezone
from .models import ChemicalInventory, ChemicalUsageLog, PayrollEntry, DeferredRevenue

def calculate_wash_cost(booking):
    """
    Calculates the theoretical chemical cost for a booking based on its service package recipe.
    Deducts from inventory and logs usage.
    """
    package = booking.service_package
    if not package or not hasattr(package, 'chemical_recipe'):
        return

    recipe = package.chemical_recipe # Assumes JSON field: {"soap_a": 0.5, "wax_b": 0.1}
    if not recipe:
        return

    # This is a simplified implementation. In reality, we'd match chemical names to IDs or Slugs.
    for chemical_name, amount_needed in recipe.items():
        try:
            inventory_item = ChemicalInventory.objects.get(name__iexact=chemical_name)
            
            # Deduct from inventory
            # Ensure we are working with Decimals
            amount_decimal = Decimal(str(amount_needed))
            inventory_item.current_volume -= amount_decimal
            inventory_item.save()

            # Log usage
            ChemicalUsageLog.objects.create(
                inventory_item=inventory_item,
                booking=booking,
                amount_used=amount_decimal,
                timestamp=timezone.now()
            )
        except ChemicalInventory.DoesNotExist:
            print(f"Warning: Chemical {chemical_name} not found in inventory.")

def process_payroll_event(booking):
    """
    Calculates commission for the technician upon job completion.
    """
    technician = booking.technician
    if not technician:
        return

    package = booking.service_package
    rule = package.commission_rule if hasattr(package, 'commission_rule') else None
    
    commission_amount = Decimal('0.00')
    
    if rule:
        # Flat rate
        commission_amount += rule.flat_amount
        
        # Percentage based
        if rule.percentage > 0:
            commission_amount += package.price * (rule.percentage / Decimal('100.0'))

    if commission_amount > 0:
        # Get or create today's payroll entry for this user
        today = timezone.localdate()
        entry, created = PayrollEntry.objects.get_or_create(
            staff_user=technician,
            date=today,
            defaults={'base_wage': Decimal('0.00'), 'commission_earned': Decimal('0.00'), 'tips_earned': Decimal('0.00')}
        )
        entry.commission_earned += commission_amount
        entry.save()

def amortize_revenue():
    """
    Daily task to move deferred revenue to realized income.
    Should be run via a cron job or Celery task.
    """
    # Find all active deferred revenue records
    active_deferred = DeferredRevenue.objects.filter(remaining_balance__gt=0)
    
    for record in active_deferred:
        # Calculate daily portion
        # Simple logic: Amortize evenly over the period
        # Better logic: defined strictly by daily_rate
        
        amount_to_recognize = record.daily_amortization_rate
        if amount_to_recognize > record.remaining_balance:
            amount_to_recognize = record.remaining_balance
            
        record.remaining_balance -= amount_to_recognize
        record.save()
        
        # Here we would create a "RealizedRevenue" ledger entry
        # RevenueLedger.objects.create(..., amount=amount_to_recognize, type='RECURRING_REALIZED')
