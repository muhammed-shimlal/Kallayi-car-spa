from rest_framework import serializers
from .models import Customer
from django.contrib.auth.models import User
from .models import CustomerVehicle

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class CustomerSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Customer
        fields = '__all__'

from .models import SubscriptionPlan

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'

from .models import Review, Coupon

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = '__all__'
        
class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class CustomerVehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerVehicle
        fields = '__all__'
        read_only_fields = ['customer', 'created_at']


class CustomerRegistrationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=True)
    phone = serializers.CharField(max_length=20, required=True)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(max_length=128, required=True, write_only=True)

    def validate_email(self, value):
        email_clean = value.strip().lower()
        if not email_clean.endswith('@gmail.com'):
            raise serializers.ValidationError("Please use a valid Gmail address (@gmail.com). Temp mails are not allowed.")
        if User.objects.filter(email__iexact=email_clean).exclude(username__startswith='guest_').exclude(username__startswith='walkin_').exists():
            raise serializers.ValidationError("An account with this Gmail address already exists. Please log in.")
        return email_clean