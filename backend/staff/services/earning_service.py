from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Q
from bookings.models import Booking
from finance.models import PayrollEntry

def get_staff_earnings(user):
    """
    Calculates staff earnings across timeframes: Today, Week, Month, Year, Lifetime.
    """
    today_date = timezone.localdate()
    start_of_week = today_date - timedelta(days=today_date.weekday())
    start_of_month = today_date.replace(day=1)
    start_of_year = today_date.replace(month=1, day=1)

    completed_bookings = Booking.objects.filter(technician=user, status='COMPLETED')

    staff_profile = getattr(user, 'staff_profile', None)
    comm_rate = (float(staff_profile.commission_rate) / 100.0) if (staff_profile and staff_profile.commission_rate) else 0.0

    def calc_booking_earnings(bookings_qs):
        total = 0.0
        for b in bookings_qs:
            if b.service_package:
                if b.service_package.commission_rule:
                    rule = b.service_package.commission_rule
                    flat = float(rule.flat_amount or 0.0)
                    pct = float(b.service_package.price or 0.0) * (float(rule.percentage or 0.0) / 100.0)
                    total += flat + pct
                elif comm_rate > 0:
                    total += float(b.service_package.price or 0.0) * comm_rate
                else:
                    total += float(b.service_package.price or 0.0) * 0.15
        return round(total, 2)

    today_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date=today_date))
    week_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_week))
    month_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_month))
    year_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_year))
    lifetime_earnings = calc_booking_earnings(completed_bookings)

    # If staff has salary_type='DAILY' or 'MONTHLY', incorporate base salary setup if higher
    staff_profile = getattr(user, 'staff_profile', None)
    if staff_profile:
        sal_type = staff_profile.salary_type
        sal_amt = float(staff_profile.salary_amount or 0.0)
        if sal_type == 'DAILY':
            today_earnings = max(today_earnings, sal_amt)
        elif sal_type == 'MONTHLY':
            daily_equiv = round(sal_amt / 30.0, 2)
            today_earnings = max(today_earnings, daily_equiv)

    return {
        'today': round(today_earnings, 2),
        'week': round(week_earnings, 2),
        'month': round(month_earnings, 2),
        'year': round(year_earnings, 2),
        'lifetime': round(lifetime_earnings, 2),
    }
