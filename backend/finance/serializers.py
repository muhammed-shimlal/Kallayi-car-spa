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

    class Meta:
        model = GeneralExpense
        fields = ['id', 'category', 'category_name', 'amount', 'description', 'date', 'receipt_image', 'recorded_by', 'recorded_by_name', 'created_at']
        read_only_fields = ['recorded_by', 'created_at']
