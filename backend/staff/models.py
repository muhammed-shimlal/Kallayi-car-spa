from django.db import models
from django.conf import settings
from bookings.models import ServicePackage, Booking
from django.utils import timezone

class StaffProfile(models.Model):
    ROLE_CHOICES = [
        ('MANAGER', 'Manager'),
        ('TECHNICIAN', 'Technician'),
        ('DRIVER', 'Driver'),
        ('WASHER', 'Washer'),
        ('ADMIN', 'Owner/Admin'),
    ]
    SALARY_TYPE_CHOICES = [
        ('DAILY', 'Daily Salary'),
        ('MONTHLY', 'Monthly Salary'),
        ('COMMISSION', 'Commission Based'),
        ('CUSTOM', 'Custom Pay'),
    ]
    COMMISSION_TYPE_CHOICES = [
        ('PERCENTAGE', 'Percentage Based'),
        ('FIXED', 'Fixed Amount Per Service'),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='staff_profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='WASHER')
    phone_number = models.CharField(max_length=20, blank=True)
    
    # Financial details
    salary_type = models.CharField(max_length=20, choices=SALARY_TYPE_CHOICES, default='COMMISSION')
    salary_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    hourly_rate = models.DecimalField(max_digits=6, decimal_places=2, default=15.00)
    base_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    commission_type = models.CharField(max_length=15, choices=COMMISSION_TYPE_CHOICES, default='PERCENTAGE')
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Percentage (0-100)")
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Fixed commission amount per service")
    joining_date = models.DateField(default=timezone.localdate)
    
    # Status & Location
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False)
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    @property
    def pending_balance(self):
        try:
            from staff.services.wallet_service import get_staff_balance_summary
            summary = get_staff_balance_summary(self.user)
            return max(float(summary.get('current_payable', 0.0)), 0.0)
        except Exception:
            return 0.0

    @property
    def due_amount(self):
        return self.pending_balance

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class TimeEntry(models.Model):
    staff = models.ForeignKey(StaffProfile, on_delete=models.CASCADE, related_name='time_entries')
    clock_in_time = models.DateTimeField()
    clock_out_time = models.DateTimeField(null=True, blank=True)
    clock_in_location = models.CharField(max_length=100, help_text="Lat,Long coordinates", blank=True)
    clock_out_location = models.CharField(max_length=100, help_text="Lat,Long coordinates", blank=True)
    
    @property
    def duration_hours(self):
        if self.clock_out_time and self.clock_in_time:
            diff = self.clock_out_time - self.clock_in_time
            return round(diff.total_seconds() / 3600, 2)
        return 0.0

    def __str__(self):
        return f"{self.staff} - {self.clock_in_time.date()}"

class SOPChecklist(models.Model):
    name = models.CharField(max_length=100)
    service_package = models.ForeignKey(ServicePackage, on_delete=models.CASCADE, related_name='sop_checklists', null=True, blank=True)
    items = models.JSONField(default=list, help_text="List of string tasks e.g. ['Vacuum', 'Wax']")
    
    def __str__(self):
        return self.name

class JobInspection(models.Model):
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='inspection')
    performed_by = models.ForeignKey(StaffProfile, on_delete=models.SET_NULL, null=True)
    checklist_data = models.JSONField(default=dict, help_text="Key-value pairs of Item: Boolean")
    photo_proof = models.ImageField(upload_to='inspections/', null=True, blank=True)
    passed = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Inspection for {self.booking}"
