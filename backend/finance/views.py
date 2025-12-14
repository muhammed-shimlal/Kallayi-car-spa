from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, F
from django.utils import timezone
from .models import Invoice, ChemicalUsageLog, PayrollEntry, GeneralExpense, ExpenseCategory
from .serializers import InvoiceSerializer, GeneralExpenseSerializer, ExpenseCategorySerializer

from django.http import HttpResponse
from django.template.loader import render_to_string
try:
    from weasyprint import HTML
except (ImportError, OSError):
    HTML = None

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        if HTML is None:
            return HttpResponse("PDF Generation not available (Missing GTK)", status=503)
            
        invoice = self.get_object()
        html_string = render_to_string('finance/invoice_pdf.html', {'invoice': invoice})
        
        pdf_file = HTML(string=html_string).write_pdf()
        
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.id}.pdf"'
        return response

class GeneralExpenseViewSet(viewsets.ModelViewSet):
    queryset = GeneralExpense.objects.all().select_related('category', 'recorded_by')
    serializer_class = GeneralExpenseSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAdminUser]

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def kpi_summary(self, request):
        today = timezone.localdate()
        
        # 1. Revenue Today
        revenue = Invoice.objects.filter(
            created_at__date=today
        ).aggregate(total=Sum('amount'))['total'] or 0.0
        
        # 2. Chemical Cost Today
        chemical_logs = ChemicalUsageLog.objects.filter(timestamp__date=today).select_related('inventory_item')
        chemical_cost = sum(log.amount_used * log.inventory_item.cost_per_unit for log in chemical_logs)

        # 3. Labor Cost Today
        labor = PayrollEntry.objects.filter(date=today).aggregate(
            total=Sum(F('base_wage') + F('commission_earned') + F('tips_earned'))
        )['total'] or 0.0
        
        # 4. General Expenses Today
        general_expenses = GeneralExpense.objects.filter(date=today).aggregate(
            total=Sum('amount')
        )['total'] or 0.0

        net_profit = float(revenue) - float(chemical_cost) - float(labor) - float(general_expenses)

        return Response({
            'revenue_today': revenue,
            'chemical_cost_today': chemical_cost,
            'labor_cost_today': labor,
            'general_expenses_today': general_expenses,
            'net_profit_today': net_profit
        })

    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        # Last 7 days revenue
        end_date = timezone.localdate()
        start_date = end_date - timezone.timedelta(days=6)
        
        data = []
        for i in range(7):
            d = start_date + timezone.timedelta(days=i)
            daily_rev = Invoice.objects.filter(created_at__date=d).aggregate(total=Sum('amount'))['total'] or 0.0
            data.append({'date': d.strftime("%Y-%m-%d"), 'value': daily_rev})
            
        return Response(data)

    @action(detail=False, methods=['get'])
    def monthly_trends(self, request):
        # Last 6 months Income vs Expense
        today = timezone.localdate()
        data = []
        
        for i in range(5, -1, -1):
            # Simple month iteration logic (can be improved)
            # Find year and month for (today - i months)
            target_month = today.month - i
            target_year = today.year
            if target_month <= 0:
                target_month += 12
                target_year -= 1
            
            # Simple filter by month/year
            month_revenue = Invoice.objects.filter(
                created_at__year=target_year, 
                created_at__month=target_month,
                is_paid=True
            ).aggregate(total=Sum('amount'))['total'] or 0.0
            
            # Expenses (General Expenses) - Could include Payroll/Chem in future
            month_expense = GeneralExpense.objects.filter(
                date__year=target_year, 
                date__month=target_month
            ).aggregate(total=Sum('amount'))['total'] or 0.0
            
            month_name = timezone.datetime(target_year, target_month, 1).strftime("%b")
            data.append({
                'month': month_name,
                'income': float(month_revenue),
                'expense': float(month_expense)
            })
            
        return Response(data)

class ReportingViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def tax_summary(self, request):
        start = request.query_params.get('start', timezone.localdate().replace(day=1).isoformat())
        end = request.query_params.get('end', timezone.localdate().isoformat())
        
        from .reports import calculate_tax_summary
        data = calculate_tax_summary(start, end)
        return Response(data)

    @action(detail=False, methods=['get'])
    def export_ledger(self, request):
        start = request.query_params.get('start', timezone.localdate().replace(day=1).isoformat())
        end = request.query_params.get('end', timezone.localdate().isoformat())
        
        from .reports import export_ledger_csv
        csv_data = export_ledger_csv(start, end)
        
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="ledger_{start}_{end}.csv"'
        return response

    @action(detail=False, methods=['get'])
    def export_expenses(self, request):
        start = request.query_params.get('start', timezone.localdate().replace(day=1).isoformat())
        end = request.query_params.get('end', timezone.localdate().isoformat())
        
        from .reports import export_expenses_csv
        csv_data = export_expenses_csv(start, end)
        
        response = HttpResponse(csv_data, content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="expenses_{start}_{end}.csv"'
        return response
