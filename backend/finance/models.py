from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
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
    Tracks operational overhead and staff transactions (Advances, Bonuses, Deductions, Reimbursements, Incentives).
    """
    EXPENSE_TYPE_CHOICES = [
        ('BUSINESS', 'Business Expense'),
        ('STAFF', 'Staff Expense'),
    ]
    TRANSACTION_TYPE_CHOICES = [
        ('ADVANCE', 'Advance'),
        ('DEDUCTION', 'Deduction'),
        ('BONUS', 'Bonus'),
        ('REIMBURSEMENT', 'Reimbursement'),
        ('INCENTIVE', 'Incentive'),
    ]
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CARD', 'Card'),
        ('CHEQUE', 'Cheque'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('PAID', 'Paid'),
        ('CANCELLED', 'Cancelled'),
    ]
    
    category = models.ForeignKey(ExpenseCategory, on_delete=models.SET_NULL, null=True, related_name='expenses')
    expense_type = models.CharField(max_length=10, choices=EXPENSE_TYPE_CHOICES, default='BUSINESS', db_index=True)
    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_TYPE_CHOICES, null=True, blank=True, db_index=True)
    payment_method = models.CharField(max_length=15, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    date = models.DateField(default=timezone.localdate, db_index=True)
    receipt_image = models.ImageField(upload_to='receipts/', null=True, blank=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='expenses_recorded')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='APPROVED', db_index=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses_approved')
    approved_at = models.DateTimeField(null=True, blank=True)
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.expense_type} - {self.amount} ({self.date}) [{self.status}]"

class SalaryPayment(models.Model):
    """
    Tracks official salary payouts to staff members with historical financial snapshots.
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CARD', 'Card'),
        ('CHEQUE', 'Cheque'),
    ]

    staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='salary_payments')
    payment_date = models.DateField(default=timezone.localdate, db_index=True)
    period_start = models.DateField()
    period_end = models.DateField()
    calculated_payable = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2)
    remaining_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_method = models.CharField(max_length=15, choices=PAYMENT_METHOD_CHOICES, default='CASH')
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='salary_payments_created')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='salary_payments_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Salary Payout ₹{self.paid_amount} to {self.staff.username} on {self.payment_date}"

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
    is_settled = models.BooleanField(default=False)
    settled_at = models.DateTimeField(null=True, blank=True)
    
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
        ('SPLIT', 'Split Payment'),
    ]

    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='invoice', null=True, blank=True)
    subscription = models.ForeignKey('customers.MemberSubscription', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    final_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    discount_reason = models.CharField(max_length=255, blank=True, default='')
    revenue_category = models.ForeignKey(RevenueCategory, on_delete=models.SET_NULL, null=True, blank=True)
    is_deferred = models.BooleanField(default=False, help_text="If true, this income is amortized over time (e.g. Subs)")
    is_paid = models.BooleanField(default=False)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHODS, null=True, blank=True)
    split_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    split_online = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    split_khata = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    cash_collected_by_staff = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='cash_collections')
    collector_type = models.CharField(max_length=10, choices=[('ADMIN', 'Admin / Counter'), ('STAFF', 'Staff Member')], default='ADMIN')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        b_price = Decimal(str(self.base_price or 0))
        f_price = Decimal(str(self.final_price or 0)) if self.final_price is not None else Decimal('0.00')
        amt = Decimal(str(self.amount or 0))

        if f_price > Decimal('0.00'):
            amt = f_price
        elif amt > Decimal('0.00') and f_price <= Decimal('0.00'):
            f_price = amt

        if self.booking:
            if b_price <= Decimal('0.00'):
                b_price = Decimal(str(self.booking.base_price or (self.booking.service_package.price if self.booking.service_package else amt)))
            if self.booking.final_price and Decimal(str(self.booking.final_price)) > Decimal('0.00'):
                f_price = Decimal(str(self.booking.final_price))
                amt = f_price
            if self.booking.discount_amount:
                self.discount_amount = Decimal(str(self.booking.discount_amount))
            if self.booking.discount_percentage:
                self.discount_percentage = Decimal(str(self.booking.discount_percentage))
            if not self.discount_reason and getattr(self.booking, 'discount_reason', ''):
                self.discount_reason = self.booking.discount_reason

        if b_price > Decimal('0.00'):
            if f_price <= Decimal('0.00'):
                f_price = amt if amt > Decimal('0.00') else b_price
            diff = b_price - f_price
            disc_amt = max(diff, Decimal('0.00'))
            disc_pct = round((disc_amt / b_price) * Decimal('100.0'), 2)
            
            self.base_price = b_price
            self.final_price = f_price
            self.amount = f_price
            self.discount_amount = disc_amt
            self.discount_percentage = disc_pct
        else:
            self.base_price = b_price
            self.final_price = f_price
            self.amount = amt if amt > Decimal('0.00') else f_price
            self.discount_amount = Decimal('0.00')
            self.discount_percentage = Decimal('0.00')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"Invoice #{self.id} - {self.booking}"

class KhataLedger(models.Model):
    """
    Double-entry ledger for the Digital Khata (Credit) System
    """
    TRANSACTION_TYPES = [
        ('CHARGE', 'Charge to Khata'),
        ('SETTLEMENT', 'Settlement Payment'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PARTIALLY_PAID', 'Partially Paid'),
        ('SETTLED', 'Settled'),
    ]

    customer = models.ForeignKey('customers.Customer', on_delete=models.CASCADE, related_name='khata_entries')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255)
    related_booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name='khata_charges')
    invoice = models.ForeignKey('finance.Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='khata_entries')
    number_plate_image = models.ImageField(upload_to='khata_proofs/', null=True, blank=True)
    transaction_date = models.DateTimeField(default=timezone.now, db_index=True)
    due_date = models.DateTimeField(null=True, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    settled_at = models.DateTimeField(null=True, blank=True)
    last_reminder_sent_at = models.DateTimeField(null=True, blank=True)
    reminder_count = models.IntegerField(default=0)
    customer_phone = models.CharField(max_length=25, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['status', 'due_date'], name='idx_khata_due_status_django'),
        ]

    def __str__(self):
        return f"{self.transaction_type} of ₹{self.amount} for {self.customer} ({self.status})"

class DailyRegisterAudit(models.Model):
    """
    End-of-Day (EOD) Register Close & Data Lock table.
    Once closed, prevents historical modifications for that day.
    """
    date = models.DateField(default=timezone.now, unique=True)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='registered_closed')
    closed_at = models.DateTimeField(auto_now_add=True)
    gross_revenue = models.DecimalField(max_digits=10, decimal_places=2)
    expected_cash_in_till = models.DecimalField(max_digits=10, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2)
    is_locked = models.BooleanField(default=True)

    def __str__(self):
        return f"Audit for {self.date} - Locked: {self.is_locked}"


class CollectionBank(models.Model):
    """
    Daily deposit / savings asset set aside from daily revenue.
    Unique per date (defaults to today).
    """
    date = models.DateField(default=timezone.localdate, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='collection_bank_entries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Collection Bank ₹{self.amount} for {self.date}"

