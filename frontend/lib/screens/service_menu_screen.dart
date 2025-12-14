import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import 'booking_screen.dart';

class ServiceMenuScreen extends StatefulWidget {
  const ServiceMenuScreen({super.key});

  @override
  State<ServiceMenuScreen> createState() => _ServiceMenuScreenState();
}

class _ServiceMenuScreenState extends State<ServiceMenuScreen> {
  final ApiService _apiService = ApiService();
  late Future<List<ServicePackage>> _servicesFuture;

  @override
  void initState() {
    super.initState();
    _servicesFuture = _apiService.getServicePackages();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Our Services", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: FutureBuilder<List<ServicePackage>>(
        future: _servicesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text("Error loading services", style: GoogleFonts.poppins(color: Colors.red)));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text("No services available"));
          }

          final services = snapshot.data!;
          return GridView.builder(
            padding: const EdgeInsets.all(20),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 20,
              mainAxisSpacing: 20,
              childAspectRatio: 0.75, // Tall cards
            ),
            itemCount: services.length,
            itemBuilder: (context, index) {
              return _buildServiceCard(services[index]);
            },
          );
        },
      ),
    );
  }

  Widget _buildServiceCard(ServicePackage service) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => BookingScreen(selectedPackage: service)),
        );
      },
      child: NeumorphicContainer(
        padding: const EdgeInsets.all(16),
        borderRadius: 20,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon Placeholder (gradient circle)
            Container(
              height: 50,
              width: 50,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [AppTheme.primaryNavy, AppTheme.accentBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: const Icon(Icons.cleaning_services, color: Colors.white),
            ),
            const Spacer(),
            // Title
            Text(
              service.name,
              style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.textDark),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 5),
            // Description (short)
            Text(
              service.description,
              style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textGrey),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            // Duration
            Row(
              children: [
                const Icon(Icons.timer, size: 12, color: AppTheme.textGrey),
                const SizedBox(width: 4),
                Text(
                  "${service.durationMinutes} mins",
                  style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textGrey),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Price & Button
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "\$${service.price.toInt()}",
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryNavy),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.accentBlue,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text("Book", style: GoogleFonts.poppins(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                )
              ],
            )
          ],
        ),
      ),
    );
  }
}
