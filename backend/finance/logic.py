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

def calculate_staff_booking_commission(staff_profile, booking_or_package):
    """
    Calculates dynamic per-staff commission for a completed booking based on individual staff settings:
    Staff Commission = final_price * (technician.commission_rate / 100)
    Uses actual collected final_price (or package price as fallback).
    """
    if not booking_or_package:
        return Decimal('0.00')

    # Resolve collected final price or base package price
    collected_price = Decimal('0.00')
    package = None

    if hasattr(booking_or_package, 'final_price') and booking_or_package.final_price and booking_or_package.final_price > Decimal('0.00'):
        collected_price = Decimal(str(booking_or_package.final_price))
        package = getattr(booking_or_package, 'service_package', None)
    elif hasattr(booking_or_package, 'price') and booking_or_package.price:
        collected_price = Decimal(str(booking_or_package.price))
        package = booking_or_package
    elif hasattr(booking_or_package, 'service_package') and booking_or_package.service_package:
        package = booking_or_package.service_package
        collected_price = Decimal(str(package.price or 0))

    # 1. Check if the package has a specific override rule
    rule = getattr(package, 'commission_rule', None) if package else None
    if rule and (getattr(rule, 'flat_amount', 0) > 0 or getattr(rule, 'percentage', 0) > 0):
        flat = Decimal(str(getattr(rule, 'flat_amount', 0) or 0))
        pct = collected_price * (Decimal(str(getattr(rule, 'percentage', 0) or 0)) / Decimal('100.0'))
        return flat + pct

    if not staff_profile:
        return Decimal('0.00')

    comm_type = getattr(staff_profile, 'commission_type', 'PERCENTAGE')
    
    if comm_type == 'FIXED':
        fixed_val = Decimal(str(getattr(staff_profile, 'commission_amount', 0) or getattr(staff_profile, 'salary_amount', 0) or 0))
        return fixed_val
    else:
        comm_rate = Decimal(str(getattr(staff_profile, 'commission_rate', 0) or 0))
        return collected_price * (comm_rate / Decimal('100.0'))

def process_payroll_event(booking):
    """
    Calculates dynamic commission for the technician upon job completion based on final collected price.
    Uses the worker's individual commission rate (technician.commission_rate / 100).
    """
    technician = booking.technician
    if not technician:
        return

    staff_profile = getattr(technician, 'staff_profile', None)
    commission_amount = calculate_staff_booking_commission(staff_profile, booking)

    today = timezone.localdate()
    
    defaults_dict = {
        'base_wage': Decimal('0.00'), 
        'commission_earned': Decimal('0.00'), 
        'tips_earned': Decimal('0.00')
    }
    
    entry, created = PayrollEntry.objects.get_or_create(
        staff_user=technician,
        date=today,
        defaults=defaults_dict
    )
    
    if commission_amount > Decimal('0.00'):
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
