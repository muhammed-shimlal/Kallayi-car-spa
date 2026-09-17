from rest_framework import serializers
from .models import Booking, ServicePackage, ServicePackagePrice

class ServicePackagePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicePackagePrice
        fields = ['id', 'vehicle_type', 'price']

class ServicePackageSerializer(serializers.ModelSerializer):
    tiered_prices = ServicePackagePriceSerializer(many=True, required=False)
    base_price = serializers.SerializerMethodField()

    class Meta:
        model = ServicePackage
        fields = '__all__'

    def get_base_price(self, obj):
        request = self.context.get('request')
        v_type = None
        if request:
            v_type = request.query_params.get('vehicle_type')
        
        if v_type:
            v_upper = v_type.strip().upper()
            prices = getattr(obj, '_prefetched_objects_cache', {}).get('tiered_prices')
            if prices is not None:
                match = next((p for p in prices if p.vehicle_type.upper() == v_upper), None)
            else:
                match = obj.tiered_prices.filter(vehicle_type__iexact=v_upper).first()
            if match:
                return str(match.price)

        return str(obj.price)

    def create(self, validated_data):
        tiered_prices_data = validated_data.pop('tiered_prices', [])
        if not validated_data.get('price') and tiered_prices_data:
            validated_data['price'] = tiered_prices_data[0].get('price', 0.00)
        
        package = ServicePackage.objects.create(**validated_data)
        
        for price_data in tiered_prices_data:
            ServicePackagePrice.objects.create(package=package, **price_data)
            
        return package

    def update(self, instance, validated_data):
        tiered_prices_data = validated_data.pop('tiered_prices', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if tiered_prices_data is not None:
            for price_data in tiered_prices_data:
                v_type = price_data.get('vehicle_type')
                price_val = price_data.get('price')
                if v_type:
                    ServicePackagePrice.objects.update_or_create(
                        package=instance,
                        vehicle_type=v_type,
                        defaults={'price': price_val}
                    )
            first_price = instance.tiered_prices.first()
            if first_price:
                instance.price = first_price.price

        instance.save()
        return instance

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
            if hasattr(obj, 'invoice') and obj.invoice:
                if (getattr(obj.invoice, 'split_khata', 0) or 0) > 0 or obj.invoice.payment_method in ['KHATA', 'CREDIT']:
                    return 'KHATA'
                return obj.invoice.payment_method or 'CASH'
            return "CASH"
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
                  'base_price', 'final_price', 'discount_amount', 'discount_percentage',
                  'address', 'latitude', 'longitude', 'transaction_id', 'payment_method', 'split_cash', 'payment_status',
                  'created_at', 'invoice_status', 'invoice_amount']
        read_only_fields = ['customer', 'end_time', 'status', 'created_at', 'discount_amount', 'discount_percentage']
        extra_kwargs = {
            'address': {'required': False, 'allow_blank': True},
            'latitude': {'required': False},
            'longitude': {'required': False},
            'technician': {'required': False, 'allow_null': True},
            'base_price': {'required': False},
            'final_price': {'required': False},
        }

    def get_invoice_status(self, obj):
        """Returns 'PAID', 'UNPAID', or 'CREDIT' based on the related Invoice & Khata payment status."""
        try:
            if hasattr(obj, 'invoice') and obj.invoice:
                if (getattr(obj.invoice, 'split_khata', 0) or 0) > 0 or obj.invoice.payment_method in ['KHATA', 'CREDIT']:
                    return 'CREDIT'
                return 'PAID' if obj.invoice.is_paid else 'UNPAID'
            return 'UNPAID'
        except Exception:
            return 'UNPAID'

    def get_invoice_amount(self, obj):
        """Returns the invoice amount as a string, or fallback to service package price."""
        try:
            return str(obj.invoice.amount)
        except Exception:
            if obj.final_price and obj.final_price > 0:
                return str(obj.final_price)
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
                'vehicle_type': getattr(obj.service_package, 'vehicle_type', 'ALL'),
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
        # Calculate pricing & discount validation
        service_package = data.get('service_package')
        base_price = data.get('base_price')
        if service_package and base_price is None:
            vehicle = data.get('vehicle')
            if vehicle and hasattr(vehicle, 'vehicle_type'):
                tier = service_package.tiered_prices.filter(vehicle_type__iexact=vehicle.vehicle_type).first()
                if tier:
                    base_price = tier.price
            if base_price is None:
                base_price = service_package.price
        final_price = data.get('final_price')

        if final_price is not None:
            if final_price < 0:
                raise serializers.ValidationError({"final_price": "Final price cannot be negative."})
            if base_price is not None and final_price > base_price:
                raise serializers.ValidationError({"final_price": f"Final price (₹{final_price}) cannot exceed base catalog price (₹{base_price})."})

        # Calculate end_time for validation
        time_slot = data.get('time_slot')
        
        if not service_package or not time_slot:
            return data

        from datetime import timedelta
        duration = service_package.duration_minutes
        end_time = time_slot + timedelta(minutes=duration)

        # Check for overlaps
        overlaps = Booking.objects.filter(
            time_slot__lt=end_time,
            end_time__gt=time_slot
        ).exclude(status='CANCELLED')
        
        if self.instance:
            overlaps = overlaps.exclude(pk=self.instance.pk)

        if overlaps.exists():
            raise serializers.ValidationError("This time slot is already booked.")
            
        return data
