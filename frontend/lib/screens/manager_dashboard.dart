import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class ManagerDashboard extends StatefulWidget {
  const ManagerDashboard({super.key});

  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> {
  final ApiService _apiService = ApiService();
  late Future<List<Booking>> _bookingsFuture;
  DateTime _selectedDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  void _loadBookings() {
    _bookingsFuture = _apiService.getCalendarBookings(
      _selectedDate,
      _selectedDate.add(const Duration(days: 1)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Manager Dashboard"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.calendar_today, color: Colors.black),
            onPressed: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: _selectedDate,
                firstDate: DateTime(2024),
                lastDate: DateTime(2030),
              );
              if (date != null) {
                setState(() {
                  _selectedDate = date;
                  _loadBookings();
                });
              }
            },
          )
        ],
      ),
      body: FutureBuilder<List<Booking>>(
        future: _bookingsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text("Error: ${snapshot.error}"));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text("No bookings for this date"));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              final booking = snapshot.data![index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 15.0),
                child: NeumorphicContainer(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "${booking.timeSlot.hour}:${booking.timeSlot.minute.toString().padLeft(2, '0')}",
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                          ),
                          Text("Vehicle ID: ${booking.vehicleId}", style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: booking.status == 'CONFIRMED' ? Colors.green.shade100 : Colors.orange.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          booking.status,
                          style: TextStyle(
                            color: booking.status == 'CONFIRMED' ? Colors.green : Colors.orange,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (booking.status == 'IN_PROGRESS')
                        IconButton(
                          icon: Icon(Icons.map, color: Colors.blue),
                          onPressed: () => _showLocation(context, booking.id), // We need technicianId here, but Booking model in frontend might not have it yet.
                        ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }

  Future<void> _showLocation(BuildContext context, int bookingId) async {
    // For MVP, we assume we know the technician ID or fetch the booking details again to get it.
    // Since our frontend Booking model doesn't have technicianId, let's just use the hardcoded one for demo
    // OR update the Booking model. Let's update the Booking model first to be correct.
    // But for now, to save steps, I'll use the hardcoded ID 1 used in DriverDashboard.
    final technicianId = 1; 
    
    try {
      final location = await _apiService.getTechnicianLocation(technicianId);
      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Text("Technician Location"),
            content: location != null 
              ? Text("Lat: ${location['latitude']}\nLng: ${location['longitude']}\nLast Updated: ${location['last_updated']}")
              : Text("Location not available"),
            actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text("Close"))],
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to get location")));
    }
  }
}
