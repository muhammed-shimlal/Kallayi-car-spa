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
    email = serializers.CharField(required=True, help_text="Registered email address")
    phone_number = serializers.CharField(required=False, allow_blank=True, help_text="Registered phone number")
    phone = serializers.CharField(required=False, allow_blank=True, help_text="Alternative alias for phone_number")

    def validate(self, data):
        email = str(data.get('email') or '').strip()
        phone = str(data.get('phone_number') or data.get('phone') or '').strip()

        if not email:
            raise serializers.ValidationError({'email': 'Registered email address is required.'})
        if not phone:
            raise serializers.ValidationError({'phone_number': 'Registered phone number is required.'})

        data['email'] = email
        data['phone_number'] = phone
        return data



class PasswordResetConfirmSerializer(serializers.Serializer):
    uidb64 = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(min_length=6, write_only=True, required=True)

    def validate_new_password(self, value):
        password_str = str(value).strip()
        if len(password_str) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters long.")
        return password_str

