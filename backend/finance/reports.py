import csv
import io
from django.db.models import Sum
from .models import Invoice, GeneralExpense, ExpenseCategory

def calculate_tax_summary(start_date, end_date):
    """
    Calculates estimated tax liability based on 18% GST.
    """
    revenue = Invoice.objects.filter(
        created_at__date__range=[start_date, end_date], 
        is_paid=True
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    expenses = GeneralExpense.objects.filter(
        date__range=[start_date, end_date]
    ).aggregate(total=Sum('amount'))['total'] or 0
    
    # Simple GST Calculation (assuming all revenue is taxable at 18%)
    gst_collected = float(revenue) * 0.18  # This is usually inclusive or exclusive. Let's assume Price is inclusive.
    # Actually, usually Price = Base + Tax. If inclusive: Tax = Price - (Price / 1.18).
    # Let's assume EXCLUSIVE for simplicity or Inclusive: Tax = Price * (18/118).
    # Let's go with Inclusive (Standard for B2C):
    tax_portion = float(revenue) * (18 / 118) 
    
    return {
        'total_revenue': float(revenue),
        'total_expenses': float(expenses),
        'tax_collected': round(tax_portion, 2),
        'net_payable': round(tax_portion, 2) # Ignoring input tax credit for MVP
    }

def export_ledger_csv(start_date, end_date):
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['Invoice ID', 'Date', 'Customer', 'Amount', 'Status', 'Category'])
    
    invoices = Invoice.objects.filter(created_at__date__range=[start_date, end_date])
    
    for inv in invoices:
        customer = "Unknown"
        if inv.booking:
             customer = str(inv.booking.customer)
        elif inv.subscription:
             customer = str(inv.subscription.customer)
             
        writer.writerow([
            inv.id,
            inv.created_at.strftime('%Y-%m-%d'),
            customer,
            inv.amount,
            "Paid" if inv.is_paid else "Unpaid",
            inv.revenue_category.name if inv.revenue_category else "General"
        ])
        
    return output.getvalue()

def export_expenses_csv(start_date, end_date):
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['ID', 'Date', 'Category', 'Description', 'Amount', 'Approved By'])
    
    expenses = GeneralExpense.objects.filter(date__range=[start_date, end_date])
    
    for exp in expenses:
        writer.writerow([
            exp.id,
            exp.date.strftime('%Y-%m-%d'),
            exp.category.name if exp.category else "Uncategorized",
            exp.description,
            exp.amount,
            exp.approved_by.username if exp.approved_by else "Auto/Pending"
        ])
        
    return output.getvalue()
