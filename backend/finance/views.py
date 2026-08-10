from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from core.permissions import IsAdmin, IsStaffUser, IsCustomerUser, IsOwnerOrAdmin, get_user_role
from django.db.models import Sum, F
from django.utils import timezone
from decimal import Decimal
from .models import Invoice, ChemicalUsageLog, PayrollEntry, GeneralExpense, ExpenseCategory, KhataLedger, DailyRegisterAudit, CollectionBank
from .serializers import InvoiceSerializer, GeneralExpenseSerializer, ExpenseCategorySerializer, CollectionBankSerializer
from customers.models import Customer
from bookings.models import Booking

from django.http import HttpResponse
from django.template.loader import render_to_string, get_template

class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        user = self.request.user
        role = get_user_role(user)
        base_qs = Invoice.objects.select_related(
            'booking', 'booking__customer', 'booking__customer__user', 'booking__vehicle', 'booking__service_package'
        )
        if role in ['ADMIN', 'MANAGER', 'WASHER', 'DRIVER', 'TECHNICIAN']:
            return base_qs.all()
        if hasattr(user, 'customer'):
            from django.db.models import Q
            from customers.views import normalize_phone
            c_phone = user.customer.phone_number or ""
            clean_phone = normalize_phone(c_phone)
            q = Q(booking__customer=user.customer) | Q(booking__customer__user=user)
            if clean_phone:
                q |= Q(booking__customer__phone_number__icontains=clean_phone)
            return base_qs.filter(q).distinct()
        return base_qs.none()

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        from io import BytesIO
        try:
            from xhtml2pdf import pisa
        except ImportError:
            return HttpResponse("PDF generation not available (xhtml2pdf not installed).", status=503)
            
        invoice = self.get_object()
        
        # Safely get booking and customer info for the template
        booking = getattr(invoice, 'booking', None)
        customer_phone = booking.customer.phone_number if booking and booking.customer else ''
        
        context = {
            'invoice': invoice,
            'booking': booking,
            'customer_phone': customer_phone,
        }
        
        html_string = render_to_string('finance/invoice_pdf.html', context)
        
        result = BytesIO()
        pdf = pisa.CreatePDF(BytesIO(html_string.encode('utf-8')), dest=result)
        
        if pdf.err:
            return HttpResponse("Error generating PDF.", status=500)
            
        response = HttpResponse(result.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.id}.pdf"'
        return response
        if HTML is None:
            return HttpResponse("PDF Generation not available (Missing GTK)", status=503)
            
        invoice = self.get_object()
        html_string = render_to_string('finance/invoice_pdf.html', {'invoice': invoice})
        
        pdf_file = HTML(string=html_string).write_pdf()
        
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="invoice_{invoice.id}.pdf"'
        return response
    
    # Add this inside class InvoiceViewSet(viewsets.ModelViewSet):

    @action(detail=True, methods=['patch', 'post'])
    def mark_paid(self, request, pk=None):
        """Manually mark an invoice as paid (e.g., cash received later)"""
        invoice = self.get_object()
        
        if invoice.is_paid:
            return Response({'status': 'Invoice is already paid'}, status=400)
            
        invoice.is_paid = True
        invoice.payment_method = 'CASH' # Record that this was settled manually
        invoice.save()

        # Update the associated booking status if it exists
        if hasattr(invoice, 'booking') and invoice.booking:
            if invoice.booking.status != 'COMPLETED':
                invoice.booking.status = 'COMPLETED'
                invoice.booking.save()

        return Response({'status': 'Invoice settled successfully'})

class GeneralExpenseViewSet(viewsets.ModelViewSet):
    queryset = GeneralExpense.objects.select_related('category', 'recorded_by', 'staff').order_by('-date', '-id')
    serializer_class = GeneralExpenseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve a pending expense"""
        expense = self.get_object()
        expense.status = 'APPROVED'
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save()
        return Response({'status': 'Expense approved'})

    def destroy(self, request, *args, **kwargs):
        """Delete expense record."""
        expense = self.get_object()
        expense.delete()
        return Response(status=204)

from .models import SalaryPayment
from .serializers import SalaryPaymentSerializer

class SalaryPaymentViewSet(viewsets.ModelViewSet):
    queryset = SalaryPayment.objects.filter(is_active=True).select_related('staff', 'created_by')
    serializer_class = SalaryPaymentSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        payment = self.get_object()
        payment.is_active = False
        payment.save()
        return Response(status=204)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject a pending expense"""
        expense = self.get_object()
        expense.status = 'REJECTED'
        expense.approved_by = request.user
        expense.approved_at = timezone.now()
        expense.save()
        return Response({'status': 'Expense rejected'})

class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    queryset = ExpenseCategory.objects.all()
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated, IsAdmin]

class DashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]

    @action(detail=False, methods=['get'])
    def kpi_summary(self, request):
        from bookings.models import Booking
        from django.db.models import Q
        
        today = timezone.localdate()
        
        try:
            # 1. Today's Actual Service Revenue (Actual service date time_slot__date is today)
            today_service_invoices = Invoice.objects.filter(
                Q(booking__time_slot__date=today) | Q(booking__isnull=True, created_at__date=today)
            )
            revenue_today = float(today_service_invoices.aggregate(total=Sum('amount'))['total'] or 0.0)

            # Standalone bookings for today with no attached invoice yet
            bookings_today_no_inv = Booking.objects.filter(
                time_slot__date=today,
                invoice__isnull=True
            )
            for b in bookings_today_no_inv:
                if b.service_package and b.service_package.price:
                    revenue_today += float(b.service_package.price)

            # 2. Pre-booking Advances (Future bookings paid/created today)
            pre_booking_invoices = Invoice.objects.filter(
                created_at__date=today,
                booking__time_slot__date__gt=today
            )
            pre_booking_revenue = float(pre_booking_invoices.aggregate(total=Sum('amount'))['total'] or 0.0)

            bookings_future_no_inv = Booking.objects.filter(
                created_at__date=today,
                time_slot__date__gt=today,
                invoice__isnull=True
            )
            for b in bookings_future_no_inv:
                if b.service_package and b.service_package.price:
                    pre_booking_revenue += float(b.service_package.price)

            # 3. Chemical Cost Today
            chemical_logs = ChemicalUsageLog.objects.filter(timestamp__date=today).select_related('inventory_item')
            chemical_cost = 0.0
            for log in chemical_logs:
                if log.inventory_item and log.inventory_item.cost_per_unit and log.amount_used:
                    chemical_cost += float(log.amount_used) * float(log.inventory_item.cost_per_unit)

            # 4. Labor Cost Today
            labor = float(PayrollEntry.objects.filter(date=today).aggregate(
                total=Sum(F('base_wage') + F('commission_earned') + F('tips_earned'))
            )['total'] or 0.0)
            
            # 5. General Expenses Today
            general_expenses = float(GeneralExpense.objects.filter(date=today).aggregate(
                total=Sum('amount')
            )['total'] or 0.0)

            # 6. Today's Total Credit (Khata / Credit generated today)
            today_khata_ledger = float(KhataLedger.objects.filter(
                transaction_type='CHARGE',
                created_at__date=today
            ).aggregate(total=Sum('amount'))['total'] or 0.0)

            today_invoice_khata = float(Invoice.objects.filter(
                created_at__date=today
            ).aggregate(total=Sum('split_khata'))['total'] or 0.0)

            today_total_credit = max(today_khata_ledger, today_invoice_khata)

            net_profit = revenue_today - chemical_cost - labor - general_expenses

            # 7. Today's Washed Vehicles count
            today_washed_count = Booking.objects.filter(
                status__in=['COMPLETED', 'Completed', 'completed']
            ).filter(
                Q(created_at__date=today) | 
                Q(start_time__date=today) | 
                Q(end_time__date=today) |
                Q(time_slot__date=today)
            ).distinct().count()

            return Response({
                'revenue_today': round(revenue_today, 2),
                'today_revenue': round(revenue_today, 2),
                'pre_booking_revenue': round(pre_booking_revenue, 2),
                'today_total_credit': round(today_total_credit, 2),
                'chemical_cost_today': round(chemical_cost, 2),
                'labor_cost_today': round(labor, 2),
                'general_expenses_today': round(general_expenses, 2),
                'net_profit_today': round(net_profit, 2),
                'today_washed_count': today_washed_count
            })
        except Exception as e:
            print(f"Error in kpi_summary: {e}")
            return Response({
                'revenue_today': 0.0,
                'today_revenue': 0.0,
                'pre_booking_revenue': 0.0,
                'today_total_credit': 0.0,
                'chemical_cost_today': 0.0,
                'labor_cost_today': 0.0,
                'general_expenses_today': 0.0,
                'net_profit_today': 0.0,
                'today_washed_count': 0,
                'error': str(e)
            })

    @action(detail=False, methods=['get'])
    def revenue_chart(self, request):
        """
        GET /api/finance/dashboard/revenue_chart/
        Returns last 7 days of daily revenue and wash count data for Recharts.
        """
        from bookings.models import Booking
        import datetime
        from django.db.models import Q, Sum

        end_date = timezone.localdate()
        start_date = end_date - datetime.timedelta(days=6)

        data = []
        current = start_date
        while current <= end_date:
            day_str = current.strftime("%b %d")
            
            day_invoices = Invoice.objects.filter(created_at__date=current)
            inv_rev = float(day_invoices.aggregate(total=Sum('amount'))['total'] or 0.0)

            day_bookings_no_inv = Booking.objects.filter(
                created_at__date=current,
                invoice__isnull=True
            )
            bk_rev = sum(float(b.service_package.price) for b in day_bookings_no_inv if b.service_package and b.service_package.price)

            total_rev = inv_rev + bk_rev

            wash_count = Booking.objects.filter(
                status__in=['COMPLETED', 'Completed', 'completed']
            ).filter(
                Q(created_at__date=current) | Q(time_slot__date=current)
            ).distinct().count()

            data.append({
                'name': day_str,
                'date': day_str,
                'full_date': current.strftime("%Y-%m-%d"),
                'revenue': round(total_rev, 2),
                'value': round(total_rev, 2),
                'washes': wash_count
            })

            current += datetime.timedelta(days=1)

        return Response(data)

    @action(detail=False, methods=['get'])
    def outstanding_credit(self, request):
        """
        GET /api/finance/dashboard/outstanding_credit/
        Returns sum of outstanding Khata credit balances and top debtor list.
        """
        from customers.models import Customer
        from django.db.models import Sum

        total_outstanding = float(Customer.objects.aggregate(total=Sum('outstanding_balance'))['total'] or 0.0)
        
        customers = Customer.objects.filter(outstanding_balance__gt=0).order_by('-outstanding_balance')[:10]
        debtors = []
        for c in customers:
            name = c.user.get_full_name() or c.user.first_name or c.user.username if c.user else 'Customer'
            debtors.append({
                'id': c.id,
                'name': name,
                'phone': c.phone_number,
                'outstanding_balance': float(c.outstanding_balance),
                'credit_limit': float(c.credit_limit)
            })

        return Response({
            'total_outstanding_credit': round(total_outstanding, 2),
            'total_debtors_count': Customer.objects.filter(outstanding_balance__gt=0).count(),
            'debtors': debtors
        })


class CollectionBankViewSet(viewsets.ModelViewSet):
    """
    Dedicated API ViewSet for Collection Bank (Bank Deposits).
    Endpoints:
      - GET /api/finance/bank-deposits/ -> Returns real aggregated stats + history
      - POST /api/finance/bank-deposits/ -> Creates or updates deposit record
    """
    queryset = CollectionBank.objects.all().order_by('-date', '-created_at')
    serializer_class = CollectionBankSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    def list(self, request, *args, **kwargs):
        today = timezone.localdate()
        first_day_of_month = today.replace(day=1)
        start_of_week = today - timezone.timedelta(days=today.weekday())

        total_all_time = float(CollectionBank.objects.aggregate(total=Sum('amount'))['total'] or 0.0)
        total_this_month = float(CollectionBank.objects.filter(date__gte=first_day_of_month).aggregate(total=Sum('amount'))['total'] or 0.0)
        total_this_week = float(CollectionBank.objects.filter(date__gte=start_of_week).aggregate(total=Sum('amount'))['total'] or 0.0)

        history_qs = CollectionBank.objects.all().order_by('-date', '-created_at')
        history_data = CollectionBankSerializer(history_qs, many=True).data

        return Response({
            'total_all_time': round(total_all_time, 2),
            'total_this_month': round(total_this_month, 2),
            'total_this_week': round(total_this_week, 2),
            'history': history_data
        })

    def create(self, request, *args, **kwargs):
        user = request.user
        amount_raw = request.data.get('amount')
        if amount_raw is None or str(amount_raw).strip() == '':
            return Response({'error': 'Amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_raw))
        except Exception:
            return Response({'error': 'Please enter a valid numeric amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount < 0:
            return Response({'error': 'Deposit amount cannot be negative.'}, status=status.HTTP_400_BAD_REQUEST)

        date_val = request.data.get('date') or timezone.localdate().isoformat()
        notes = request.data.get('notes') or 'Daily Reserved Savings Deposit'

        entry, created = CollectionBank.objects.update_or_create(
            date=date_val,
            defaults={
                'amount': amount,
                'notes': notes,
                'recorded_by': user if user.is_authenticated else None
            }
        )

        today = timezone.localdate()
        first_day_of_month = today.replace(day=1)
        start_of_week = today - timezone.timedelta(days=today.weekday())

        total_all_time = float(CollectionBank.objects.aggregate(total=Sum('amount'))['total'] or 0.0)
        total_this_month = float(CollectionBank.objects.filter(date__gte=first_day_of_month).aggregate(total=Sum('amount'))['total'] or 0.0)
        total_this_week = float(CollectionBank.objects.filter(date__gte=start_of_week).aggregate(total=Sum('amount'))['total'] or 0.0)

        history_qs = CollectionBank.objects.all().order_by('-date', '-created_at')
        history_data = CollectionBankSerializer(history_qs, many=True).data

        return Response({
            'message': 'Bank deposit saved successfully!',
            'data': CollectionBankSerializer(entry).data,
            'total_all_time': round(total_all_time, 2),
            'total_this_month': round(total_this_month, 2),
            'total_this_week': round(total_this_week, 2),
            'history': history_data
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['post', 'get'])
    def deposit(self, request):
        if request.method == 'GET':
            return self.list(request)
        return self.create(request)


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
    
    # Add this inside class DashboardViewSet(viewsets.ViewSet):

    @action(detail=False, methods=['get'])
    def outstanding_credit(self, request):
        """Fetch all unpaid invoices for the Accounts Receivable table"""
        # Find all invoices where is_paid is False
        unpaid_invoices = Invoice.objects.filter(is_paid=False).select_related('booking')
        
        data = []
        for invoice in unpaid_invoices:
            # Safely extract customer and vehicle info if booking exists
            customer_name = "Unknown"
            vehicle_info = "N/A"
            customer_phone = "No Phone"
            
            if hasattr(invoice, 'booking') and invoice.booking:
                if invoice.booking.customer:
                    customer = invoice.booking.customer
                    customer_name = f"{customer.user.first_name} {customer.user.last_name}".strip() or customer.user.username
                    customer_phone = customer.phone_number
                vehicle = invoice.booking.vehicle
                if vehicle:
                    vehicle_info = f"{vehicle.model} ({vehicle.plate_number})"
            
            # If invoice is older than 30 days, mark as Overdue
            days_old = (timezone.now() - invoice.created_at).days
            status = 'Overdue' if days_old > 30 else 'Pending'

            data.append({
                'id': invoice.id,
                'customer': customer_name,
                'customer_phone': customer_phone,
                'vehicle': vehicle_info,
                'amount': float(invoice.amount),
                'date': invoice.created_at.strftime("%Y-%m-%d"),
                'status': status
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_my_ledger(request):
    """GET /api/finance/khata/my-ledger/"""
    user = request.user
    customer = getattr(user, 'customer', None)
    if not customer:
        from customers.views import claim_or_link_customer
        customer = claim_or_link_customer(user)

    from customers.views import normalize_phone
    from django.db.models import Q, Sum

    raw_phone = (customer.phone_number or user.username or '').strip()
    clean_phone = normalize_phone(raw_phone)

    # Gather all customer IDs that belong to this user or matching phone number
    customer_ids = set()
    if customer and customer.id:
        customer_ids.add(customer.id)

    matching_customers = Customer.objects.filter(
        Q(user=user) | 
        (Q(phone_number__icontains=clean_phone) if clean_phone else Q(pk=customer.id))
    )
    for c in matching_customers:
        customer_ids.add(c.id)

    customer_ids = list(customer_ids)

    entries = KhataLedger.objects.filter(customer_id__in=customer_ids).order_by('-created_at')

    total_credit = float(
        KhataLedger.objects.filter(customer_id__in=customer_ids)
        .filter(Q(transaction_type__iexact='CHARGE') | Q(transaction_type__iexact='CREDIT'))
        .aggregate(total=Sum('amount'))['total'] or 0.0
    )

    total_settled = float(
        KhataLedger.objects.filter(customer_id__in=customer_ids)
        .filter(Q(transaction_type__iexact='SETTLEMENT') | Q(transaction_type__iexact='PAYMENT'))
        .aggregate(total=Sum('amount'))['total'] or 0.0
    )

    # Aggregate outstanding balance across matching profiles
    outstanding_balance = max(0.0, float(
        Customer.objects.filter(id__in=customer_ids).aggregate(total=Sum('outstanding_balance'))['total'] or customer.outstanding_balance or 0.0
    ))

    credit_limit = float(customer.credit_limit or 5000.0)

    data = []
    for entry in entries:
        desc = entry.description
        if entry.related_booking:
            desc += f" (Booking #{entry.related_booking.id})"

        plate_number = 'N/A'
        if entry.related_booking and entry.related_booking.vehicle:
            plate_number = entry.related_booking.vehicle.plate_number
        else:
            import re
            match = re.search(r'([A-Z]{2}-\d{2}-[A-Z0-9]+-\d{4})', desc)
            if match:
                plate_number = match.group(1)

        img_url = None
        if entry.number_plate_image:
            try:
                url_str = entry.number_plate_image.url
                if url_str.startswith('http'):
                    img_url = url_str
                else:
                    img_url = request.build_absolute_uri(url_str)
            except Exception:
                img_url = str(entry.number_plate_image)

        data.append({
            'id': f"KHATA-{entry.id}",
            'raw_id': entry.id,
            'amount': float(entry.amount),
            'transaction_type': entry.transaction_type,
            'description': desc,
            'plate_number': plate_number,
            'number_plate_image': img_url,
            'date': entry.created_at.strftime("%Y-%m-%d %H:%M"),
        })

    return Response({
        'total_credit': round(total_credit, 2),
        'total_settled': round(total_settled, 2),
        'outstanding_balance': round(outstanding_balance, 2),
        'credit_limit': credit_limit,
        'transactions': data
    })

class KhataViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_ledger(self, request):
        """GET /api/finance/khata/my-ledger/"""
        return customer_my_ledger(request)

    def list(self, request):
        """GET /api/finance/khata/"""
        # Fetch customers with outstanding balance > 0
        customers = Customer.objects.filter(outstanding_balance__gt=0)
        data = []
        for c in customers:
            v_count = c.vehicles.count() if hasattr(c, 'vehicles') else 0
            data.append({
                'id': c.id,
                'name': f"{c.user.first_name} {c.user.last_name}".strip() or c.user.username,
                'phone_number': c.phone_number,
                'outstanding_balance': float(c.outstanding_balance),
                'credit_limit': float(c.credit_limit),
                'vehicle_count': v_count,
            })
        return Response(data)

    def retrieve(self, request, pk=None):
        """GET /api/finance/khata/<customer_id>/"""
        try:
            customer = Customer.objects.get(pk=pk)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)
        
        entries = KhataLedger.objects.filter(customer=customer).order_by('-created_at')
        data = []
        for entry in entries:
            desc = entry.description
            if entry.related_booking:
                desc += f" (Booking #{entry.related_booking.id})"
                
            plate_number = 'N/A'
            if entry.related_booking and entry.related_booking.vehicle:
                plate_number = entry.related_booking.vehicle.plate_number
            else:
                import re
                match = re.search(r'([A-Z]{2}-\d{2}-[A-Z0-9]+-\d{4})', desc)
                if match:
                    plate_number = match.group(1)

            img_url = None
            if entry.number_plate_image:
                try:
                    img_url = entry.number_plate_image.url
                except Exception:
                    img_url = str(entry.number_plate_image)

            data.append({
                'id': entry.id,
                'amount': float(entry.amount),
                'transaction_type': entry.transaction_type,
                'description': desc,
                'plate_number': plate_number,
                'number_plate_image': img_url,
                'date': entry.created_at.strftime("%Y-%m-%d %H:%M"),
            })
        return Response(data)

    @action(detail=False, methods=['post'])
    def charge(self, request):
        """POST /api/finance/khata/charge/"""
        customer_id = request.data.get('customer_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        description = request.data.get('description', 'Khata Charge')
        booking_id = request.data.get('booking_id')
        number_plate_image = request.FILES.get('number_plate_image')

        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)

        if customer.outstanding_balance + amount > customer.credit_limit:
            return Response({'error': 'Credit limit exceeded'}, status=400)

        booking = None
        if booking_id:
            try:
                booking = Booking.objects.get(pk=booking_id)
            except Booking.DoesNotExist:
                pass

        # Create Charge
        entry = KhataLedger.objects.create(
            customer=customer,
            amount=amount,
            transaction_type='CHARGE',
            description=description,
            related_booking=booking,
            number_plate_image=number_plate_image
        )

        # Update Balance
        customer.outstanding_balance += amount
        customer.save()

        # Mock SMS
        print(f"[MOCK SMS] Your Kallayi Khata has been charged ₹{amount}. New Balance: ₹{customer.outstanding_balance}.")

        return Response({
            'status': 'Charge successful',
            'new_balance': float(customer.outstanding_balance),
            'entry_id': entry.id
        })

    @action(detail=False, methods=['post'])
    def settle(self, request):
        """POST /api/finance/khata/settle/"""
        customer_id = request.data.get('customer_id')
        amount = Decimal(str(request.data.get('amount', 0)))
        description = request.data.get('description', 'Cash Payment')

        try:
            customer = Customer.objects.get(pk=customer_id)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)

        if amount <= 0:
            return Response({'error': 'Amount must be greater than 0'}, status=400)

        # Create Settlement
        KhataLedger.objects.create(
            customer=customer,
            amount=amount,
            transaction_type='SETTLEMENT',
            description=description
        )

        # Update Balance dynamically
        customer.outstanding_balance -= amount
        # For simplicity, bounding it to zero if overpaid 
        if customer.outstanding_balance < 0:
            customer.outstanding_balance = Decimal('0.00')
            
        customer.save()

        # Mock SMS
        print(f"[MOCK SMS] Payment received! ₹{amount} has been credited to your Kallayi Khata. New Balance: ₹{customer.outstanding_balance}.")

        return Response({'status': 'Settlement successful', 'new_balance': float(customer.outstanding_balance)})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def close_register(request):
    """
    End-of-Day (EOD) Register Close & Data Lock.
    """
    user = request.user
    is_authorized = user.is_superuser or user.is_staff
    if not is_authorized and hasattr(user, 'staff_profile'):
        is_authorized = user.staff_profile.role in ['ADMIN', 'MANAGER']
        
    if not is_authorized:
        return Response({'error': 'You do not have permission to access the register.'}, status=403)

    today = timezone.localdate()
    
    # Check if existing lock exists
    existing_lock = DailyRegisterAudit.objects.filter(date=today, is_locked=True).first()

    if existing_lock:
        if request.method == 'POST':
            return Response({'error': 'The register for today is already closed and locked.'}, status=400)
            
        # Return the locked data instead of calculating live
        return Response({
            'is_locked': True,
            'closed_by': getattr(existing_lock.closed_by, 'username', 'Unknown'),
            'closed_at': existing_lock.closed_at,
            'gross_revenue': float(existing_lock.gross_revenue),
            'total_expenses': float(existing_lock.total_expenses),
            'expected_cash_in_till': float(existing_lock.expected_cash_in_till)
        })

    # === CALCULATION LOGIC (For both live preview GET and lock POST) ===

    # Calculate Gross Revenue (Value of all Complete Bookings)
    gross_revenue = Booking.objects.filter(
        created_at__date=today,
        status='COMPLETED'
    ).aggregate(total=Sum('service_package__price'))['total'] or Decimal('0.00')

    # Calculate Total Expenses (Shop expenses)
    total_expenses = GeneralExpense.objects.filter(
        date=today
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # Calculate Expected Cash In Till
    # 1. Total Cash Payments Received
    cash_payments = Invoice.objects.filter(
        created_at__date=today,
        is_paid=True,
        payment_method='CASH'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    # 2. Khata Settlements (Cash received for old debts)
    khata_settlements = KhataLedger.objects.filter(
        created_at__date=today,
        transaction_type='SETTLEMENT'
    ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    total_cash_in = cash_payments + khata_settlements

    # 3. Staff Payouts (assuming cash payouts today)
    labor_payouts = PayrollEntry.objects.filter(
        date=today
    ).aggregate(total=Sum(F('base_wage') + F('commission_earned') + F('tips_earned')))['total'] or Decimal('0.00')

    expected_cash_in_till = total_cash_in - total_expenses - labor_payouts

    if request.method == 'GET':
        return Response({
            'is_locked': False,
            'gross_revenue': float(gross_revenue),
            'total_expenses': float(total_expenses),
            'expected_cash_in_till': float(expected_cash_in_till),
            'cash_in_hand': float(total_cash_in),
            'labor_payouts': float(labor_payouts),
        })

    if request.method == 'POST':
        # Create the Lock
        DailyRegisterAudit.objects.create(
            date=today,
            closed_by=request.user,
            gross_revenue=gross_revenue,
            total_expenses=total_expenses,
            expected_cash_in_till=expected_cash_in_till,
            is_locked=True
        )

        return Response({
            'message': 'Register successfully closed. All financial data for today is now locked.',
            'gross_revenue': float(gross_revenue),
            'total_expenses': float(total_expenses),
            'expected_cash_in_till': float(expected_cash_in_till),
            'is_locked': True
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_dashboard(request):
    """Aggregation engine: busiest hours, package popularity, top staff."""
    from django.db.models import Count
    from django.db.models.functions import ExtractHour

    # Permission check
    user = request.user
    is_authorized = user.is_staff or user.is_superuser
    if not is_authorized and hasattr(user, 'staff_profile'):
        is_authorized = user.staff_profile.role in ['ADMIN', 'MANAGER']
    if not is_authorized:
        return Response({'error': 'Forbidden'}, status=403)

    completed_bookings = Booking.objects.filter(status='COMPLETED')

    # ── Query 1: Busiest Hours ──────────────────────────────────────────────
    busiest_hours_qs = (
        completed_bookings
        .annotate(hour=ExtractHour('created_at'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('hour')
    )
    busiest_hours = [
        {
            'hour': f"{(row['hour'] % 12) or 12} {'AM' if row['hour'] < 12 else 'PM'}",
            'raw_hour': row['hour'],
            'count': row['count']
        }
        for row in busiest_hours_qs
    ]

    # ── Query 2: Package Popularity ─────────────────────────────────────────
    package_qs = (
        completed_bookings
        .filter(service_package__isnull=False)
        .values('service_package__name')
        .annotate(
            total_washes=Count('id'),
            total_revenue=Sum('service_package__price')
        )
        .order_by('-total_revenue')
    )
    packages = [
        {
            'name': row['service_package__name'],
            'total_washes': row['total_washes'],
            'total_revenue': float(row['total_revenue'] or 0)
        }
        for row in package_qs
    ]

    # ── Query 3: Top Staff Performers ───────────────────────────────────────
    staff_qs = (
        completed_bookings
        .filter(technician__isnull=False)
        .values('technician__first_name', 'technician__username')
        .annotate(jobs_completed=Count('id'))
        .order_by('-jobs_completed')[:10]
    )
    top_staff = [
        {
            'name': row['technician__first_name'] or row['technician__username'],
            'jobs_completed': row['jobs_completed']
        }
        for row in staff_qs
    ]

    return Response({
        'busiest_hours': busiest_hours,
        'packages': packages,
        'top_staff': top_staff,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_invoice_pdf(request, booking_id):
    """
    Generate a beautifully branded PDF invoice for a given booking.
    Uses WeasyPrint for modern CSS and Flexbox support.
    """
    from django.template.loader import get_template
    from django.http import HttpResponse

    try:
        from weasyprint import HTML
    except ImportError:
        return HttpResponse("PDF generation not available (WeasyPrint not installed).", status=503)

    try:
        booking = Booking.objects.select_related(
            'customer__user', 'vehicle', 'service_package'
        ).get(pk=booking_id)
    except Booking.DoesNotExist:
        return HttpResponse("Booking not found.", status=404)

    # Try to get associated invoice for payment info
    invoice = None
    try:
        invoice = Invoice.objects.get(booking=booking)
    except Invoice.DoesNotExist:
        pass

    customer_phone = booking.customer.phone_number if booking and booking.customer else ''

    context = {
        'booking': booking,
        'invoice': invoice,
        'customer_phone': customer_phone,
    }

    template = get_template('finance/invoice_pdf.html')
    html_string = template.render(context)

    try:
        # WeasyPrint flawlessly renders Flexbox, CSS Variables, and Google Fonts
        pdf_file = HTML(string=html_string).write_pdf()

        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Kallayi_Invoice_{booking.id}.pdf"'
        return response
    except Exception as e:
        return HttpResponse(f"Error generating PDF: {str(e)}", status=500)
    """
    Generate a beautifully branded PDF invoice for a given booking.
    Uses xhtml2pdf (pure Python, no GTK dependency).
    """
    from io import BytesIO

    try:
        from xhtml2pdf import pisa
    except ImportError:
        return HttpResponse("PDF generation not available (xhtml2pdf not installed).", status=503)

    try:
        booking = Booking.objects.select_related(
            'customer__user', 'vehicle', 'service_package'
        ).get(pk=booking_id)
    except Booking.DoesNotExist:
        return HttpResponse("Booking not found.", status=404)

    # Try to get associated invoice for payment info
    invoice = None
    try:
        invoice = Invoice.objects.get(booking=booking)
    except Invoice.DoesNotExist:
        pass

    customer_phone = booking.customer.phone_number if booking.customer else ''

    context = {
        'booking': booking,
        'invoice': invoice,
        'customer_phone': customer_phone,
    }

    template = get_template('finance/invoice_pdf.html')
    html_string = template.render(context)

    result = BytesIO()
    pdf = pisa.CreatePDF(BytesIO(html_string.encode('utf-8')), dest=result)

    if pdf.err:
        return HttpResponse("Error generating PDF.", status=500)

    response = HttpResponse(result.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Kallayi_Invoice_{booking.id}.pdf"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def manual_khata_charge(request):
    """Manually add a credit charge to a customer's Khata (find or create by phone)."""
    user = request.user
    if not user.is_superuser and not (hasattr(user, 'staff_profile') and user.staff_profile.role in ['ADMIN', 'MANAGER']):
        return Response({'error': 'Forbidden'}, status=403)

    phone = request.data.get('phone', '').strip()
    name = request.data.get('name', '').strip()
    amount = request.data.get('amount')
    description = request.data.get('description', 'Manual Khata Entry').strip()

    if not phone:
        return Response({'error': 'Phone number is required.'}, status=400)
    if not amount or float(amount) <= 0:
        return Response({'error': 'A valid positive amount is required.'}, status=400)

    amount = Decimal(str(amount))

    # Find or create customer by phone
    from django.contrib.auth.models import User as AuthUser
    customer = Customer.objects.filter(phone_number=phone).first()

    if not customer:
        if not name:
            return Response({'error': 'Customer not found. Please provide a name to register them.'}, status=400)
        # Auto-create User + Customer
        base_username = name.lower().replace(' ', '_')
        username = base_username
        counter = 1
        while AuthUser.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        new_user = AuthUser.objects.create_user(username=username, password='Kallayi123!', first_name=name)
        customer = Customer.objects.create(user=new_user, phone_number=phone, credit_limit=Decimal('5000.00'))

    # Credit limit check
    current_balance = Decimal(str(customer.outstanding_balance))
    credit_limit = Decimal(str(customer.credit_limit))
    new_balance = current_balance + amount

    if new_balance > credit_limit:
        return Response({
            'error': f'Credit limit exceeded. Current balance: ₹{current_balance}, Limit: ₹{credit_limit}'
        }, status=400)

    # Apply charge
    customer.outstanding_balance = new_balance
    customer.save()

    number_plate_image = request.FILES.get('number_plate_image')

    KhataLedger.objects.create(
        customer=customer,
        amount=amount,
        transaction_type='CHARGE',
        description=description or 'Manual Khata Entry',
        number_plate_image=number_plate_image,
    )

    return Response({
        'status': 'success',
        'customer_name': customer.user.first_name or customer.user.username,
        'new_balance': float(customer.outstanding_balance),
        'credit_limit': float(customer.credit_limit),
    })

