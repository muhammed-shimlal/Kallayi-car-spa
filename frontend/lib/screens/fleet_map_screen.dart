import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import 'dart:async';

class FleetMapScreen extends StatefulWidget {
  const FleetMapScreen({super.key});

  @override
  State<FleetMapScreen> createState() => _FleetMapScreenState();
}

class _FleetMapScreenState extends State<FleetMapScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _locations = [];
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchLocations();
    // Auto-refresh every 30 seconds
    _timer = Timer.periodic(const Duration(seconds: 30), (timer) => _fetchLocations());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _fetchLocations() async {
    try {
      final data = await _apiService.getAllTechnicianLocations();
      if (mounted) {
        setState(() {
          _locations = data;
        });
      }
    } catch (e) {
      debugPrint("Error loading locations: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Live Fleet Monitor", style: GoogleFonts.poppins(color: AppTheme.textDark, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textDark),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchLocations)
        ],
      ),
      body: _locations.isEmpty 
          ? const Center(child: Text("No active technicians found."))
          : ListView.builder(
              padding: const EdgeInsets.all(20),
              itemCount: _locations.length,
              itemBuilder: (context, index) {
                final loc = _locations[index];
                // Assuming backend returns {technician: user_id, latitude: x, longitude: y, last_updated: t}
                // Need to maybe toggle viewing mode if we want a map. For now, detailed cards.
                return Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: NeumorphicContainer(
                    child: ListTile(
                      leading: Container(
                        padding: const EdgeInsets.all(10),
                        decoration: const BoxDecoration(color: Colors.greenAccent, shape: BoxShape.circle),
                        child: const Icon(Icons.person_pin_circle, color: Colors.white),
                      ),
                      title: Text("Technician #${loc['technician']}", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                              Text("Lat: ${loc['latitude']?.toStringAsFixed(4)}, Lng: ${loc['longitude']?.toStringAsFixed(4)}"),
                              Text("Updated: ${loc['last_updated']?.toString().split('.')[0] ?? 'Just now'}", style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ]
                      ),
                      trailing: const Icon(Icons.map, color: AppTheme.accentBlue),
                      onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Focusing on map... (Placeholder)")));
                      },
                    ),
                  ),
                );
              },
            ),
    );
  }
}
