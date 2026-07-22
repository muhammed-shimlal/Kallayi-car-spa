from django.utils import timezone
from datetime import timedelta
from bookings.models import Booking

def get_staff_work_summary(user, period='today'):
    """
    Aggregates completed vehicles count grouped by vehicle type (CAR, BIKE, AUTO, VAN, TRUCK).
    Shop revenue is strictly kept confidential.
    """
    today_date = timezone.localdate()
    completed_bookings = Booking.objects.filter(technician=user, status='COMPLETED')

    if period == 'today':
        completed_bookings = completed_bookings.filter(time_slot__date=today_date)
    elif period == 'week':
        start_of_week = today_date - timedelta(days=today_date.weekday())
        completed_bookings = completed_bookings.filter(time_slot__date__gte=start_of_week)
    elif period == 'month':
        start_of_month = today_date.replace(day=1)
        completed_bookings = completed_bookings.filter(time_slot__date__gte=start_of_month)
    elif period == 'year':
        start_of_year = today_date.replace(month=1, day=1)
        completed_bookings = completed_bookings.filter(time_slot__date__gte=start_of_year)

    counts = {
        'CAR': 0,
        'BIKE': 0,
        'AUTO': 0,
        'VAN': 0,
        'TRUCK': 0,
    }

    for b in completed_bookings.select_related('vehicle'):
        v_type = 'CAR'
        if b.vehicle and hasattr(b.vehicle, 'vehicle_type') and b.vehicle.vehicle_type:
            v_type = b.vehicle.vehicle_type
        counts[v_type] = counts.get(v_type, 0) + 1

    total_vehicles = sum(counts.values())

    return {
        'period': period,
        'counts': {
            'Cars': counts['CAR'],
            'Bikes': counts['BIKE'],
            'Auto': counts['AUTO'],
            'Van': counts['VAN'],
            'Truck': counts['TRUCK'],
        },
        'total_vehicles': total_vehicles
    }
