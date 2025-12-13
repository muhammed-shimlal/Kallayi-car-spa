from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, F
from django.utils import timezone
from .models import Invoice, ChemicalUsageLog, PayrollEntry
from .serializers import InvoiceSerializer

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer

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
        # Cost = Sum(Usage * CostPerUnit)
        # Note: F object logic might be tricky across relationships if not careful.
        # Doing simple python iteration for MVP safety if generic Relation logic fails, 
        # but Django allows cross-model F with explicit annotation.
        # Let's use Python sum for explicit correctness on small scale.
        chemical_logs = ChemicalUsageLog.objects.filter(timestamp__date=today).select_related('inventory_item')
        chemical_cost = sum(log.amount_used * log.inventory_item.cost_per_unit for log in chemical_logs)

        # 3. Labor Cost Today
        labor = PayrollEntry.objects.filter(date=today).aggregate(
            total=Sum(F('base_wage') + F('commission_earned') + F('tips_earned'))
        )['total'] or 0.0

        net_profit = float(revenue) - float(chemical_cost) - float(labor)

        return Response({
            'revenue_today': revenue,
            'chemical_cost_today': chemical_cost,
            'labor_cost_today': labor,
            'net_profit_today': net_profit
        })

    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        # Last 7 days revenue
        end_date = timezone.localdate()
        start_date = end_date - timezone.timedelta(days=6)
        
        data = []
        # Loop strictly to ensure zero-filling
        for i in range(7):
            d = start_date + timezone.timedelta(days=i)
            daily_rev = Invoice.objects.filter(created_at__date=d).aggregate(total=Sum('amount'))['total'] or 0.0
            data.append({'date': d.strftime("%Y-%m-%d"), 'value': daily_rev})
            
        return Response(data)
