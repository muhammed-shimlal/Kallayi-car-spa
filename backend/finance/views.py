from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.db.models import Sum, F
from django.utils import timezone
from decimal import Decimal
from .models import Invoice, ChemicalUsageLog, PayrollEntry, GeneralExpense, ExpenseCategory, KhataLedger, DailyRegisterAudit
from .serializers import InvoiceSerializer, GeneralExpenseSerializer, ExpenseCategorySerializer
from customers.models import Customer
from bookings.models import Booking

from django.http import HttpResponse
from django.template.loader import render_to_string, get_template
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
    queryset = GeneralExpense.objects.all().select_related('category', 'recorded_by')
    serializer_class = GeneralExpenseSerializer
    permission_classes = [IsAdminUser]

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
            
            if hasattr(invoice, 'booking') and invoice.booking:
                # Try to get customer name, fallback to string representation
                customer = invoice.booking.customer
                customer_name = f"{customer.user.first_name} {customer.user.last_name}".strip() or customer.user.username
                vehicle = invoice.booking.vehicle
                vehicle_info = f"{vehicle.make} {vehicle.model} ({vehicle.plate_number})"
            
            # If invoice is older than 30 days, mark as Overdue
            days_old = (timezone.now() - invoice.created_at).days
            status = 'Overdue' if days_old > 30 else 'Pending'

            data.append({
                'id': invoice.id,
                'customer': customer_name,
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

class KhataViewSet(viewsets.ViewSet):
    permission_classes = [IsAdminUser]

    def list(self, request):
        """GET /api/finance/khata/"""
        # Fetch customers with outstanding balance > 0
        customers = Customer.objects.filter(outstanding_balance__gt=0)
        data = []
        for c in customers:
            data.append({
                'id': c.id,
                'name': f"{c.user.first_name} {c.user.last_name}".strip() or c.user.username,
                'phone_number': c.phone_number,
                'outstanding_balance': float(c.outstanding_balance),
                'credit_limit': float(c.credit_limit),
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
            # Need description or formatted name for booking if exists
            desc = entry.description
            if entry.related_booking:
                desc += f" (Booking #{entry.related_booking.id})"
                
            data.append({
                'id': entry.id,
                'amount': float(entry.amount),
                'transaction_type': entry.transaction_type,
                'description': desc,
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
        KhataLedger.objects.create(
            customer=customer,
            amount=amount,
            transaction_type='CHARGE',
            description=description,
            related_booking=booking
        )

        # Update Balance
        customer.outstanding_balance += amount
        customer.save()

        # Mock SMS
        print(f"[MOCK SMS] Your Kallayi Khata has been charged ₹{amount}. New Balance: ₹{customer.outstanding_balance}.")

        return Response({'status': 'Charge successful', 'new_balance': float(customer.outstanding_balance)})

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
    GET: Returns a live preview of the day's math (or the locked values if already closed today)
    POST: Permanently freezes all financial transactions for the day.
    """
    if request.user.role not in ['ADMIN', 'MANAGER']:
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
    ).aggregate(total=Sum('final_price'))['total'] or Decimal('0.00')

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
    new_balance = customer.outstanding_balance + amount
    if new_balance > customer.credit_limit:
        return Response({
            'error': f'Credit limit exceeded. Current balance: ₹{customer.outstanding_balance}, Limit: ₹{customer.credit_limit}'
        }, status=400)

    # Apply charge
    customer.outstanding_balance = new_balance
    customer.save()

    KhataLedger.objects.create(
        customer=customer,
        amount=amount,
        transaction_type='CHARGE',
        description=description or 'Manual Khata Entry',
    )

    return Response({
        'status': 'success',
        'customer_name': customer.user.first_name or customer.user.username,
        'new_balance': float(customer.outstanding_balance),
        'credit_limit': float(customer.credit_limit),
    })

