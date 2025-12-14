from django.db import models
from django.conf import settings
from bookings.models import Booking, ServicePackage

class RevenueCategory(models.Model):
    name = models.CharField(max_length=50) # e.g., "Wash", "Detail", "Retail", "Subscription"
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class ExpenseCategory(models.Model):
    name = models.CharField(max_length=50) # e.g., "Chemicals", "Utilities", "Labor"
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name

class GeneralExpense(models.Model):
    """
    Tracks operational overhead like Rent, Utilities, Maintenance, etc.
    """
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, related_name='expenses')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    date = models.DateField()
    receipt_image = models.ImageField(upload_to='receipts/', null=True, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} - {self.amount} ({self.date})"

class ChemicalInventory(models.Model):
    name = models.CharField(max_length=100)
    current_volume = models.DecimalField(max_digits=10, decimal_places=2, help_text="Current volume in UOM")
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    uom = models.CharField(max_length=20, default='oz') # Unit of Measure: oz, gallons, liters
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=10.0)

    def __str__(self):
        return f"{self.name} ({self.current_volume} {self.uom})"

class ChemicalUsageLog(models.Model):
    inventory_item = models.ForeignKey(ChemicalInventory, on_delete=models.CASCADE)
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True)
    amount_used = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Used {self.amount_used} of {self.inventory_item.name}"

class CommissionRule(models.Model):
    """
    Defines how much a staff member earns for a specific service or upsell.
    """
    name = models.CharField(max_length=100)
    flat_amount = models.DecimalField(max_digits=6, decimal_places=2, default=0.00)
    percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage of service price (0-100)")
    
    def __str__(self):
        return self.name

class PayrollEntry(models.Model):
    """
    Daily aggregation of earnings for a staff member.
    """
    staff_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date = models.DateField()
    base_wage = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    commission_earned = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    tips_earned = models.DecimalField(max_digits=8, decimal_places=2, default=0.00)
    
    class Meta:
        unique_together = ('staff_user', 'date')

    @property
    def total_daily_earnings(self):
        return self.base_wage + self.commission_earned + self.tips_earned

    def __str__(self):
        return f"{self.staff_user.username} - {self.date}"

class DeferredRevenue(models.Model):
    """
    Tracks subscription income that is received but not yet 'earned'.
    """
    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_balance = models.DecimalField(max_digits=10, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    daily_amortization_rate = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Deferred: {self.customer} ({self.remaining_balance} remaining)"

class Invoice(models.Model):
    PAYMENT_METHODS = [
        ('CASH', 'Cash'),
        ('CARD', 'Card'),
        ('ONLINE', 'Online'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='invoice', null=True, blank=True)
    subscription = models.ForeignKey('customers.MemberSubscription', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    revenue_category = models.ForeignKey(RevenueCategory, on_delete=models.SET_NULL, null=True, blank=True)
    is_deferred = models.BooleanField(default=False, help_text="If true, this income is amortized over time (e.g. Subs)")
    is_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice #{self.id} - {self.booking}"
