from rest_framework import serializers
from .models import StaffProfile, TimeEntry, SOPChecklist, JobInspection

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
