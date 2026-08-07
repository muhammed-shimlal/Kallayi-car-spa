from rest_framework import serializers
from .models import Booking, ServicePackage

class ServicePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePackage
        fields = '__all__'

class BookingSerializer(serializers.ModelSerializer):
    service_package_details = serializers.SerializerMethodField()
    technician_name = serializers.SerializerMethodField()
    customer_name = serializers.SerializerMethodField()
    customer_phone = serializers.SerializerMethodField()
    vehicle_info = serializers.SerializerMethodField()
    vehicle_plate = serializers.SerializerMethodField()
    service_package_name = serializers.SerializerMethodField()
    invoice_status = serializers.SerializerMethodField()
    invoice_amount = serializers.SerializerMethodField()
    payment_method = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        if obj.customer:
            if hasattr(obj.customer, 'user') and obj.customer.user:
                full_name = obj.customer.user.get_full_name()
                if full_name and full_name.strip():
                    return full_name.strip()
                if obj.customer.user.first_name:
                    return obj.customer.user.first_name
                return obj.customer.user.username
            return str(obj.customer)
        return "Walk-In Guest"

    def get_customer_phone(self, obj):
        if obj.customer and hasattr(obj.customer, 'phone_number'):
            return obj.customer.phone_number or ""
        return ""

    def get_vehicle_plate(self, obj):
        if obj.vehicle:
            return obj.vehicle.plate_number or ""
        return "Unknown Plate"

    def get_vehicle_info(self, obj):
        if obj.vehicle:
            make = getattr(obj.vehicle, 'make', '')
            model = getattr(obj.vehicle, 'model', 'Unknown')
            plate = obj.vehicle.plate_number or ''
            return f"{plate} ({make} {model})".strip() if (make or model) else plate
        return "Unknown Vehicle"

    def get_service_package_name(self, obj):
        if obj.service_package:
            return obj.service_package.name
        return "Walk-In Wash"

    def get_technician_name(self, obj):
        if obj.technician:
            return obj.technician.get_full_name() or obj.technician.username
        return "Unassigned"

    def get_payment_method(self, obj):
        try:
            return obj.invoice.payment_method
        except Exception:
            return "CASH"

    # Add optional fields to silence legacy client payload mismatches
    transaction_id = serializers.CharField(required=False, allow_null=True, allow_blank=True, write_only=True)
    split_cash = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True, write_only=True)
    payment_status = serializers.CharField(required=False, allow_null=True, allow_blank=True, default='UNPAID', write_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'customer', 'customer_name', 'customer_phone', 'vehicle', 'vehicle_info', 'vehicle_plate', 'technician', 'technician_name', 
                  'service_package', 'service_package_name', 'service_package_details', 'time_slot', 'end_time', 'status',
                  'address', 'latitude', 'longitude', 'transaction_id', 'payment_method', 'split_cash', 'payment_status',
                  'created_at', 'invoice_status', 'invoice_amount']
        read_only_fields = ['customer', 'end_time', 'status', 'created_at']
        extra_kwargs = {
            'address': {'required': False, 'allow_blank': True},
            'latitude': {'required': False},
            'longitude': {'required': False},
            'technician': {'required': False, 'allow_null': True},
        }

    def get_invoice_status(self, obj):
        """Returns 'PAID' or 'UNPAID' based on the related Invoice.is_paid boolean."""
        try:
            return 'PAID' if obj.invoice.is_paid else 'UNPAID'
        except Exception:
            return 'UNPAID'

    def get_invoice_amount(self, obj):
        """Returns the invoice amount as a string, or fallback to service package price."""
        try:
            return str(obj.invoice.amount)
        except Exception:
            if obj.service_package:
                return str(obj.service_package.price)
            return "0.00"

    def get_service_package_details(self, obj):
        if obj.service_package:
            return {
                'id': obj.service_package.id,
                'name': obj.service_package.name,
                'description': obj.service_package.description,
                'price': str(obj.service_package.price),
                'duration_minutes': obj.service_package.duration_minutes,
                'chemical_recipe': obj.service_package.chemical_recipe,
            }
        return None

    def create(self, validated_data):
        # Remove legacy payment fields so they don't break Native Django Model allocation
        validated_data.pop('transaction_id', None)
        validated_data.pop('payment_method', None)
        validated_data.pop('split_cash', None)
        validated_data.pop('payment_status', None)
        
        return super().create(validated_data)

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
