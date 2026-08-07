from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from django.db.models import Q

UserModel = get_user_model()

def normalize_phone(phone_str):
    if not phone_str:
        return ''
    digits = ''.join(c for c in phone_str if c.isdigit())
    if len(digits) == 12 and digits.startswith('91'):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith('0'):
        digits = digits[1:]
    return digits

class EmailBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL.
    Recognizes username, email, or phone number in various formats.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get(UserModel.USERNAME_FIELD)

        if not username or not password:
            return None

        clean_phone = normalize_phone(str(username))

        # Build query to search by username, email, or normalized phone number variants
        q_filter = Q(username__iexact=username) | Q(email__iexact=username)
        if clean_phone and len(clean_phone) >= 7:
            q_filter |= Q(username__icontains=clean_phone)
            q_filter |= Q(customer__phone_number__icontains=clean_phone)
            q_filter |= Q(username=clean_phone)
            q_filter |= Q(username=f"+91{clean_phone}")

        users = list(UserModel.objects.filter(q_filter).distinct())

        for user in users:
            if user.check_password(password) and self.user_can_authenticate(user):
                return user

        # Run password hasher to prevent timing attacks
        UserModel().set_password(password)
        return None

