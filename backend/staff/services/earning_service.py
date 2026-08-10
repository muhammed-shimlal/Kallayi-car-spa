from django.utils import timezone
from datetime import datetime, timedelta
from django.db.models import Sum, Q
from bookings.models import Booking
from finance.models import PayrollEntry

def get_staff_earnings(user):
    """
    Calculates staff earnings across timeframes: Today, Week, Month, Year, Lifetime.
    """
    staff_profile = getattr(user, 'staff_profile', None)

    today_date = timezone.localdate()
    start_of_week = today_date - timedelta(days=today_date.weekday())
    start_of_month = today_date.replace(day=1)
    start_of_year = today_date.replace(month=1, day=1)

    completed_bookings = Booking.objects.filter(technician=user, status='COMPLETED')

    from finance.logic import calculate_staff_booking_commission

    def calc_booking_earnings(bookings_qs):
        total = 0.0
        for b in bookings_qs:
            if b.service_package:
                total += float(calculate_staff_booking_commission(staff_profile, b.service_package))
        return round(total, 2)

    today_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date=today_date))
    week_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_week))
    month_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_month))
    year_earnings = calc_booking_earnings(completed_bookings.filter(time_slot__date__gte=start_of_year))
    lifetime_earnings = calc_booking_earnings(completed_bookings)

    # If staff has salary_type='DAILY' or 'MONTHLY', incorporate base salary setup if higher
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
