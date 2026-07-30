from rest_framework import permissions

def get_user_role(user):
    """
    Derives the user's role directly from backend database records.
    Never trusts client-provided headers or payload data.
    """
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return 'ADMIN'
    if hasattr(user, 'staff_profile') and user.staff_profile.is_active:
        return user.staff_profile.role
    if user.is_staff:
        return 'MANAGER'
    if hasattr(user, 'customer'):
        return 'CUSTOMER'
    return 'CUSTOMER'


class IsAdmin(permissions.BasePermission):
    """
    Allows access only to Admin/Manager users.
    (is_superuser, is_staff, or staff_profile role in ['ADMIN', 'MANAGER'])
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        return role in ['ADMIN', 'MANAGER']


class IsStaffUser(permissions.BasePermission):
    """
    Allows access to Staff users (WASHER, DRIVER, TECHNICIAN) as well as Admins/Managers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        return role in ['ADMIN', 'MANAGER', 'WASHER', 'DRIVER', 'TECHNICIAN']


class IsCustomerUser(permissions.BasePermission):
    """
    Allows access to Customer users as well as Admins/Managers.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        return role in ['ADMIN', 'MANAGER', 'CUSTOMER']


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Object-level permission: Admins can access everything; regular users can only access their own objects.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_user_role(request.user)
        if role in ['ADMIN', 'MANAGER']:
            return True
        # Check various ownership attributes
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'customer'):
            if hasattr(request.user, 'customer'):
                return obj.customer == request.user.customer
            return obj.customer.user == request.user
        if hasattr(obj, 'technician'):
            return obj.technician == request.user
        if hasattr(obj, 'staff'):
            if hasattr(request.user, 'staff_profile'):
                return obj.staff == request.user.staff_profile
            return obj.staff.user == request.user
        return False
