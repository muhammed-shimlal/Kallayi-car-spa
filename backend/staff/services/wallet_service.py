from django.utils import timezone
from django.db.models import Sum
from finance.models import GeneralExpense, SalaryPayment
from bookings.models import Booking
from staff.models import TimeEntry

def get_staff_balance_summary(user):
    """
    Computes My Balance summary based on staff.salary_type and fetches salary payment history.
    """
    today_date = timezone.localdate()
    staff_profile = getattr(user, 'staff_profile', None)
    salary_type = staff_profile.salary_type if staff_profile else 'COMMISSION'
    salary_amount = float(staff_profile.salary_amount or 0.0) if staff_profile else 0.0

    # 1. Transactions breakdown
    staff_txs = GeneralExpense.objects.filter(
        staff=user,
        expense_type='STAFF',
        is_active=True
    )

    advances = float(staff_txs.filter(transaction_type='ADVANCE', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0.0)
    deductions = float(staff_txs.filter(transaction_type='DEDUCTION', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0.0)
    bonuses = float(staff_txs.filter(transaction_type='BONUS', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0.0)
    reimbursements = float(staff_txs.filter(transaction_type='REIMBURSEMENT', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0.0)
    incentives = float(staff_txs.filter(transaction_type='INCENTIVE', status='APPROVED').aggregate(Sum('amount'))['amount__sum'] or 0.0)

    # 2. Total Salary Paid from SalaryPayment table
    salary_payments = SalaryPayment.objects.filter(staff=user, is_active=True).order_by('-payment_date')
    salary_paid = float(salary_payments.aggregate(Sum('paid_amount'))['paid_amount__sum'] or 0.0)

    # 3. Calculate gross earned based on salary_type
    gross_earned = 0.0
    if salary_type == 'COMMISSION':
        completed_bookings = Booking.objects.filter(technician=user, status='COMPLETED')
        comm_rate = (float(staff_profile.commission_rate) / 100.0) if (staff_profile and staff_profile.commission_rate) else 0.15
        for b in completed_bookings:
            if b.service_package:
                if b.service_package.commission_rule:
                    rule = b.service_package.commission_rule
                    flat = float(rule.flat_amount or 0.0)
                    pct = float(b.service_package.price or 0.0) * (float(rule.percentage or 0.0) / 100.0)
                    gross_earned += flat + pct
                else:
                    gross_earned += float(b.service_package.price or 0.0) * comm_rate
    elif salary_type == 'DAILY':
        days_worked = TimeEntry.objects.filter(staff=staff_profile, clock_in_time__isnull=False).values('clock_in_time__date').distinct().count()
        days_worked = max(days_worked, 1) # Default to at least 1 day if active
        gross_earned = days_worked * salary_amount
    elif salary_type == 'MONTHLY':
        gross_earned = salary_amount
    else: # CUSTOM
        gross_earned = float(staff_profile.base_salary or 0.0) if staff_profile else 0.0

    current_payable = (gross_earned + bonuses + reimbursements + incentives) - (advances + deductions + salary_paid)

    history = []
    for sp in salary_payments[:10]:
        history.append({
            'id': sp.id,
            'payment_date': sp.payment_date.strftime('%Y-%m-%d'),
            'period_start': sp.period_start.strftime('%Y-%m-%d'),
            'period_end': sp.period_end.strftime('%Y-%m-%d'),
            'calculated_payable': float(sp.calculated_payable),
            'paid_amount': float(sp.paid_amount),
            'remaining_balance': float(sp.remaining_balance),
            'payment_method': sp.payment_method,
            'reference_number': sp.reference_number,
            'notes': sp.notes,
        })

    return {
        'salary_type': salary_type,
        'gross_earned': round(gross_earned, 2),
        'bonuses': round(bonuses, 2),
        'reimbursements': round(reimbursements, 2),
        'incentives': round(incentives, 2),
        'advances': round(advances, 2),
        'deductions': round(deductions, 2),
        'salary_paid': round(salary_paid, 2),
        'current_payable': round(current_payable, 2),
        'salary_history': history
    }
