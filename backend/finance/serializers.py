from rest_framework import serializers
from .models import Invoice, GeneralExpense, ExpenseCategory

class InvoiceSerializer(serializers.ModelSerializer):
    customer_phone = serializers.CharField(source='booking.customer.phone_number', read_only=True, default='')
    customer_name = serializers.SerializerMethodField()
    vehicle_plate = serializers.CharField(source='booking.vehicle.plate_number', read_only=True, default='')
    vehicle_model = serializers.CharField(source='booking.vehicle.model', read_only=True, default='')
    service_package_name = serializers.CharField(source='booking.service_package.name', read_only=True, default='')
    service_package_price = serializers.DecimalField(source='booking.service_package.price', max_digits=10, decimal_places=2, read_only=True, default=0.00)
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)

    payment_status = serializers.SerializerMethodField()

    def get_customer_name(self, obj):
        if obj.booking and obj.booking.customer:
            c = obj.booking.customer
            if hasattr(c, 'user') and c.user:
                full_name = c.user.get_full_name()
                if full_name and full_name.strip():
                    return full_name.strip()
                if c.user.first_name:
                    return c.user.first_name
                return c.user.username
            return str(c)
        return "Walk-In Guest"

    def get_payment_status(self, obj):
        if (obj.split_khata or 0) > 0 or obj.payment_method in ['KHATA', 'CREDIT']:
            return 'UNPAID'
        return 'PAID' if obj.is_paid else 'UNPAID'

    class Meta:
        model = Invoice
        fields = [
            'id', 'booking', 'booking_id', 'amount', 'split_cash', 'split_online', 'split_khata',
            'payment_method', 'is_paid', 'payment_status', 'created_at', 'customer_name', 'customer_phone',
            'vehicle_plate', 'vehicle_model', 'service_package_name', 'service_package_price'
        ]

class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = '__all__'

class GeneralExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.username', read_only=True)
    staff_name = serializers.CharField(source='staff.first_name', read_only=True)

    class Meta:
        model = GeneralExpense
        fields = [
            'id', 'category', 'category_name', 'expense_type', 'transaction_type',
            'payment_method', 'staff', 'staff_name', 'amount', 'description', 'notes',
            'date', 'receipt_image', 'status', 'recorded_by', 'recorded_by_name',
            'created_at', 'updated_at', 'is_active'
        ]
        read_only_fields = ['recorded_by', 'created_at', 'updated_at']

from .models import SalaryPayment

class SalaryPaymentSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source='staff.first_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = SalaryPayment
        fields = [
            'id', 'staff', 'staff_name', 'payment_date', 'period_start', 'period_end',
            'calculated_payable', 'paid_amount', 'remaining_balance', 'payment_method',
            'reference_number', 'notes', 'created_by', 'created_by_name', 'created_at',
            'updated_at', 'is_active'
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']
