from rest_framework import serializers
from .models import Vehicle, TechnicianLocation

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'

class TechnicianLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TechnicianLocation
        fields = '__all__'

from .models import ServiceVehicle, FleetLog

class ServiceVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceVehicle
        fields = '__all__'

class FleetLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetLog
        fields = '__all__'
