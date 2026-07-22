from django.contrib import admin, messages
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection

@admin.register(StaffProfile)
class StaffProfileAdmin(admin.ModelAdmin):
    list_display = ('get_username', 'get_full_name', 'role', 'phone_number', 'salary_type', 'salary_amount', 'is_active', 'joining_date')
    list_filter = ('is_active', 'role', 'salary_type', 'joining_date')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'phone_number')
    actions = ['terminate_staff_members', 'reactivate_staff_members']

    @admin.display(description='Username')
    def get_username(self, obj):
        return obj.user.username if obj.user else '—'

    @admin.display(description='Full Name')
    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username if obj.user else '—'

    @admin.action(description='Terminate selected staff members (Soft Delete)')
    def terminate_staff_members(self, request, queryset):
        count = 0
        for staff in queryset:
            staff.is_active = False
            staff.save(update_fields=['is_active'])
            if staff.user:
                staff.user.is_active = False
                staff.user.save(update_fields=['is_active'])
            count += 1
        self.message_user(request, f"Successfully terminated {count} staff member(s).", messages.SUCCESS)

    @admin.action(description='Re-activate selected staff members')
    def reactivate_staff_members(self, request, queryset):
        count = 0
        for staff in queryset:
            staff.is_active = True
            staff.save(update_fields=['is_active'])
            if staff.user:
                staff.user.is_active = True
                staff.user.save(update_fields=['is_active'])
            count += 1
        self.message_user(request, f"Successfully re-activated {count} staff member(s).", messages.SUCCESS)

    def has_delete_permission(self, request, obj=None):
        """Prevent hard deletes from Django admin to protect database integrity."""
        return False

@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ('staff', 'clock_in_time', 'clock_out_time', 'duration_hours')
    list_filter = ('clock_in_time',)
    search_fields = ('staff__user__username', 'staff__user__first_name')

@admin.register(SOPChecklist)
class SOPChecklistAdmin(admin.ModelAdmin):
    list_display = ('name', 'service_package')

@admin.register(JobInspection)
class JobInspectionAdmin(admin.ModelAdmin):
    list_display = ('booking', 'performed_by', 'passed', 'created_at')
    list_filter = ('passed', 'created_at')
