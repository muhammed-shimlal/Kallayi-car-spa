import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../providers/user_provider.dart';
import 'invoice_screen.dart';

class DriverDashboard extends StatefulWidget {
  const DriverDashboard({super.key});

  @override
  State<DriverDashboard> createState() => _DriverDashboardState();
}

class _DriverDashboardState extends State<DriverDashboard> {
  final ApiService _apiService = ApiService();
  late Future<List<Booking>> _jobsFuture;

  @override
  void initState() {
    super.initState();
    // Defer loading jobs until we have context with provider
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadJobs();
    });
  }

  void _loadJobs() {
    final userId = Provider.of<UserProvider>(context, listen: false).userId;
    if (userId != null) {
      setState(() {
        _jobsFuture = _apiService.getDriverJobs(userId);
      });
    }
  }

  bool _isUpdating = false;

  Future<void> _updateStatus(int bookingId, String newStatus) async {
    if (_isUpdating) return;
    
    setState(() { _isUpdating = true; });
    try {
      await _apiService.updateJobStatus(bookingId, newStatus);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Status updated to $newStatus")));
      
      if (newStatus == 'COMPLETED') {
        if (mounted) {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (context) => InvoiceScreen(bookingId: bookingId)),
          );
        }
      }
      
      _loadJobs();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to update status"), backgroundColor: Colors.red));
    } finally {
       if (mounted) setState(() { _isUpdating = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Driver Dashboard"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(icon: Icon(Icons.refresh, color: Colors.black), onPressed: _loadJobs)
        ],
      ),
      body: Column(
        children: [
          _buildClockControls(),
          Expanded(
            child: FutureBuilder<List<Booking>>(
              future: _jobsFuture,
              builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              } else if (snapshot.hasError) {
                 // Fallback for demo if no backend user exists yet
                return Center(child: Text("No jobs assigned (or backend error)"));
              } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const Center(child: Text("No active jobs"));
              }

              return ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: snapshot.data!.length,
                itemBuilder: (context, index) {
                  final job = snapshot.data![index];
                  return _buildJobCard(job);
                },
              );
            },
          ),
        ),
          if (_isUpdating)
            Container(
              color: Colors.black12,
              child: const Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    );
  }

  Widget _buildJobCard(Booking job) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: NeumorphicContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text("Job #${job.id}", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(job.status, style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text("Time: ${job.timeSlot.toString().split('.')[0]}"),
            Text("Vehicle ID: ${job.vehicleId}"),
            Text("Address: ${job.address}", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w500)),
            const SizedBox(height: 20),
            Row(
              children: [
                if (job.status == 'PENDING' || job.status == 'CONFIRMED')
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.black),
                      onPressed: () => _updateStatus(job.id, 'IN_PROGRESS'),
                      child: Text("Start Job", style: TextStyle(color: Colors.white)),
                    ),
                  ),
                if (job.status == 'IN_PROGRESS') ...[
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                      onPressed: () => _updateStatus(job.id, 'COMPLETED'),
                      child: Text("Complete Job", style: TextStyle(color: Colors.white)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  IconButton(
                    icon: Icon(Icons.location_on, color: Colors.blue),
                    onPressed: _shareLocation,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _shareLocation() async {
    try {
      // Check permission
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Location permission denied")));
          return;
        }
      }
      
      Position position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
      final userId = Provider.of<UserProvider>(context, listen: false).userId;
      if (userId != null) {
        await _apiService.updateLocation(userId, position.latitude, position.longitude);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Location updated!")));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to update location: $e")));
    }
  }

  Widget _buildClockControls() {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(Icons.login),
              label: Text("Clock In"),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                padding: EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: () async {
                final token = Provider.of<UserProvider>(context, listen: false).token;
                if (token != null) {
                  try {
                    await _apiService.clockIn(token, "Dashboard");
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Clocked In!")));
                  } catch (e) {
                     ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                  }
                }
              },
            ),
          ),
          SizedBox(width: 10),
          Expanded(
            child: ElevatedButton.icon(
              icon: Icon(Icons.logout),
              label: Text("Clock Out"),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                padding: EdgeInsets.symmetric(vertical: 15),
              ),
              onPressed: () async {
                 final token = Provider.of<UserProvider>(context, listen: false).token;
                if (token != null) {
                  try {
                    await _apiService.clockOut(token, "Dashboard");
                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Clocked Out!")));
                  } catch (e) {
                     ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
                  }
                }
              },
            ),
          ),
        ],
      ),
    );
  }
}
