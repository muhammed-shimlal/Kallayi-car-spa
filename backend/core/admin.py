from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User

# Unregister default User admin if registered
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    actions = ['terminate_users', 'reactivate_users']

    @admin.action(description='Deactivate / Terminate selected users')
    def terminate_users(self, request, queryset):
        count = 0
        for user in queryset:
            user.is_active = False
            user.save(update_fields=['is_active'])
            if hasattr(user, 'staff_profile'):
                user.staff_profile.is_active = False
                user.staff_profile.save(update_fields=['is_active'])
            count += 1
        self.message_user(request, f"Successfully deactivated {count} user(s).", messages.SUCCESS)

    @admin.action(description='Re-activate selected users')
    def reactivate_users(self, request, queryset):
        count = 0
        for user in queryset:
            user.is_active = True
            user.save(update_fields=['is_active'])
            if hasattr(user, 'staff_profile'):
                user.staff_profile.is_active = True
                user.staff_profile.save(update_fields=['is_active'])
            count += 1
        self.message_user(request, f"Successfully re-activated {count} user(s).", messages.SUCCESS)

    def has_delete_permission(self, request, obj=None):
        """Prevent hard deletes of user accounts to safeguard database integrity."""
        return False
