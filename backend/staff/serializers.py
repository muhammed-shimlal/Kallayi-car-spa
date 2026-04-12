from rest_framework import serializers
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection
from django.contrib.auth.models import User

class StaffProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = StaffProfile
        fields = '__all__'

class TimeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeEntry
        fields = '__all__'
        read_only_fields = ['duration_hours']

class SOPChecklistSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOPChecklist
        fields = '__all__'

class JobInspectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobInspection
        fields = '__all__'


class StaffDirectorySerializer(serializers.ModelSerializer):
    """Serializer for the Staff Directory CRUD — exposes User + StaffProfile as a flat object."""
    first_name = serializers.CharField(source='user.first_name')
    username = serializers.CharField(source='user.username', read_only=True)
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    user_id = serializers.ReadOnlyField(source='user.id')

    class Meta:
        model = StaffProfile
        fields = [
            'id', 'user_id','first_name', 'username', 'phone_number',
            'role', 'base_salary', 'commission_rate', 'is_active', 'joining_date',
        ]

    def create(self, validated_data):
        user_data = validated_data.pop('user', {})
        first_name = user_data.get('first_name', 'Staff')

        # Auto-generate a username from first_name
        base_username = first_name.lower().replace(' ', '_')
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        user = User.objects.create_user(
            username=username,
            password='Kallayi123!',
            first_name=first_name,
            is_staff=True,
        )

        profile = StaffProfile.objects.create(user=user, **validated_data)
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        if 'first_name' in user_data:
            instance.user.first_name = user_data['first_name']
            instance.user.save()

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
