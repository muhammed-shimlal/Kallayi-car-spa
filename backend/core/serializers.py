from rest_framework import serializers
from django.contrib.auth.models import User
from staff.models import StaffProfile

class StaffProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffProfile
        fields = ['id', 'role', 'phone_number', 'base_salary', 'commission_rate', 'joining_date', 'current_latitude', 'current_longitude', 'is_online', 'last_location_update']
        read_only_fields = ['joining_date', 'last_location_update']

class UserSerializer(serializers.ModelSerializer):
    staff_profile = StaffProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'staff_profile']

class StaffCreateSerializer(serializers.ModelSerializer):
    # Serializer for creating a user and a staff profile together
    password = serializers.CharField(write_only=True, required=False, default='Kallayi@123')
    role = serializers.ChoiceField(choices=StaffProfile.ROLE_CHOICES)
    phone_number = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role', 'phone_number']

    def create(self, validated_data):
        role = validated_data.pop('role')
        phone = validated_data.pop('phone_number', '')
        password = validated_data.pop('password', 'Kallayi@123')
        validated_data['is_staff'] = True
        user = User.objects.create_user(password=password, **validated_data)
        StaffProfile.objects.create(user=user, role=role, phone_number=phone)
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=False, allow_blank=True, help_text="Registered phone number")
    phone = serializers.CharField(required=False, allow_blank=True, help_text="Alternative alias for phone_number")
    email = serializers.CharField(required=False, allow_blank=True, help_text="Email or account username")

    def validate(self, data):
        phone = str(data.get('phone_number') or data.get('phone') or data.get('email') or '').strip()
        if not phone:
            raise serializers.ValidationError({'phone_number': 'Registered phone number or account identifier is required.'})
        data['phone_number'] = phone
        data['email'] = phone
        return data


class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField(required=False, allow_blank=True)
    token = serializers.CharField(required=False, allow_blank=True)
    otp_code = serializers.CharField(required=False, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_blank=True)
    new_password = serializers.CharField(min_length=6, write_only=True, required=True)


class PasswordResetOTPRequestSerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        phone_input = str(data.get('phone_number') or data.get('phone') or '').strip()
        if not phone_input:
            raise serializers.ValidationError({'phone_number': 'Registered phone number is required.'})
        data['phone_number'] = phone_input
        return data


class PasswordResetOTPVerifySerializer(serializers.Serializer):
    phone_number = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    otp_code = serializers.CharField(required=True, min_length=6, max_length=6)
    new_password = serializers.CharField(min_length=6, write_only=True, required=True)

    def validate(self, data):
        phone_input = str(data.get('phone_number') or data.get('phone') or '').strip()
        otp = str(data.get('otp_code') or '').strip()
        password = str(data.get('new_password') or '').strip()

        if not phone_input:
            raise serializers.ValidationError({'phone_number': 'Registered phone number is required.'})
        if not otp or len(otp) != 6:
            raise serializers.ValidationError({'otp_code': 'A valid 6-digit OTP code is required.'})
        if len(password) < 6:
            raise serializers.ValidationError({'new_password': 'Password must be at least 6 characters long.'})

        data['phone_number'] = phone_input
        data['otp_code'] = otp
        data['new_password'] = password
        return data


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate(self, data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not user or not user.is_authenticated:
            raise serializers.ValidationError({'detail': 'Authentication credentials were not provided.'})

        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')

        # 1. Verify current password
        if not user.check_password(current_password):
            raise serializers.ValidationError({'current_password': 'The current password you entered is incorrect.'})

        # 2. Confirm matching new passwords
        if new_password != confirm_password:
            raise serializers.ValidationError({'confirm_password': 'New password and confirmation password do not match.'})

        # 3. Disallow reusing the current password
        if new_password == current_password:
            raise serializers.ValidationError({'new_password': 'New password cannot be the same as your current password.'})

        # 4. Enforce minimum length and complexity
        if len(new_password) < 8:
            raise serializers.ValidationError({'new_password': 'New password must be at least 8 characters long.'})

        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as err:
            raise serializers.ValidationError({'new_password': list(err.messages)})

        return data

