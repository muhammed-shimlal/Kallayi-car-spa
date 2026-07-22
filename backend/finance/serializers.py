from rest_framework import serializers
from .models import Invoice, GeneralExpense, ExpenseCategory

class InvoiceSerializer(serializers.ModelSerializer):
    customer_phone = serializers.CharField(source='booking.customer.phone_number', read_only=True)
    
    class Meta:
        model = Invoice
        fields = ['id', 'booking', 'amount', 'split_cash', 'split_online', 'split_khata', 'payment_method', 'is_paid', 'created_at', 'customer_phone']

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
