from rest_framework import serializers
from .models import Booking, ServicePackage

class ServicePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePackage
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    service_package_details = serializers.SerializerMethodField()
    technician_name = serializers.ReadOnlyField(source='technician.username')
    customer_name = serializers.ReadOnlyField(source='customer.name')
    vehicle_info = serializers.ReadOnlyField(source='vehicle.license_plate')

    class Meta:
        model = Booking
        fields = ['id', 'customer', 'customer_name', 'vehicle', 'vehicle_info', 'technician', 'technician_name', 
                  'service_package', 'service_package_details', 'time_slot', 'end_time', 'status', 'address', 'latitude', 'longitude']
        read_only_fields = ['end_time', 'status', 'created_at']

    def get_service_package_details(self, obj):
        if obj.service_package:
            return {
                'name': obj.service_package.name,
                'description': obj.service_package.description,
                'duration_minutes': obj.service_package.duration_minutes,
                'chemical_recipe': obj.service_package.chemical_recipe,
            }
        return None

    def validate(self, data):
        # Calculate end_time for validation
        service_package = data.get('service_package')
        time_slot = data.get('time_slot')
        
        if not service_package or not time_slot:
            return data

        from datetime import timedelta
        duration = service_package.duration_minutes
        end_time = time_slot + timedelta(minutes=duration)

        # Check for overlaps
        # Overlap if: (StartA < EndB) and (EndA > StartB)
        overlaps = Booking.objects.filter(
            time_slot__lt=end_time,
            end_time__gt=time_slot
        ).exclude(status='CANCELLED')
        
        if self.instance:
            overlaps = overlaps.exclude(pk=self.instance.pk)

        if overlaps.exists():
            raise serializers.ValidationError("This time slot is already booked.")
            
        return data
