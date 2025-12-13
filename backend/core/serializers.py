from rest_framework import serializers
from django.contrib.auth.models import User
from .models import StaffProfile

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
    password = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=StaffProfile.ROLE_CHOICES)
    phone_number = serializers.CharField(required=False)

    class Meta:
        model = User
        fields = ['username', 'password', 'email', 'first_name', 'last_name', 'role', 'phone_number']

    def create(self, validated_data):
        role = validated_data.pop('role')
        phone = validated_data.pop('phone_number', '')
        user = User.objects.create_user(**validated_data)
        StaffProfile.objects.create(user=user, role=role, phone_number=phone)
        return user
