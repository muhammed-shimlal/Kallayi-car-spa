import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../providers/user_provider.dart';
import '../widgets/neumorphic_container.dart';
import 'service_menu_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  Booking? _activeBooking;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkActiveBooking();
    _checkForReview();
  }

  void _checkActiveBooking() async {
    final userId = Provider.of<UserProvider>(context, listen: false).userId;
    if (userId != null) {
      final booking = await _apiService.getMyActiveBooking(userId);
      if (mounted) {
        setState(() {
          _activeBooking = booking;
          _isLoading = false;
        });
      }
    } else {
        if (mounted) setState(() => _isLoading = false);
    }
  }

  void _checkForReview() async {
    final userId = Provider.of<UserProvider>(context, listen: false).userId;
    if (userId != null) {
       try {
         final bookings = await _apiService.getPendingReviewBookings(userId);
         if (bookings.isNotEmpty && mounted) {
           // Basic check: if review doesn't exist (assuming backend filtered or we blindly show logic)
           // For simple simulation: Just pick the first one and show dialog
           // Ideally we check local storage to not annoy user if they dismissed.
           // Show dialog
           Future.delayed(const Duration(seconds: 2), () => _showReviewDialog(bookings.first));
         }
       } catch (e) {
         print("Error checking reviews: $e");
       }
    }
  }

  void _showReviewDialog(Booking booking) {
    int rating = 5;
    final commentController = TextEditingController();

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Text("Rate Your Wash", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        content: StatefulBuilder(
          builder: (context, setState) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("How was your service for ${booking.timeSlot.toString().split(' ')[0]}?", style: GoogleFonts.poppins()),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(5, (index) {
                    return IconButton(
                      icon: Icon(
                        index < rating ? Icons.star : Icons.star_border,
                        color: Colors.amber,
                        size: 32,
                      ),
                      onPressed: () => setState(() => rating = index + 1),
                    );
                  }),
                ),
                TextField(controller: commentController, decoration: const InputDecoration(labelText: "Add a comment (optional)"))
              ],
            );
          },
        ),
        actions: [
          TextButton(child: const Text("Skip"), onPressed: () => Navigator.pop(context)),
          ElevatedButton(
            child: const Text("Submit"),
            onPressed: () async {
              try {
                await _apiService.submitReview(booking.id, rating, commentController.text);
                if (context.mounted) {
                   Navigator.pop(context);
                   ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Thanks! +50 Points Added 🌟")));
                }
              } catch (e) {
                print("Error: $e");
                // Dismiss anyway for UX
                if (context.mounted) Navigator.pop(context);
              }
            },
          )
        ],
      )
    );
  }

  @override
  Widget build(BuildContext context) {
    final username = Provider.of<UserProvider>(context).username;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Hello, ${username ?? 'Guest'}", 
                          style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                      Text("Ready for a shine?", 
                          style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textGrey)),
                    ],
                  ),
                  NeumorphicContainer(
                    padding: const EdgeInsets.all(10),
                    borderRadius: 12,
                    child: const Icon(Icons.notifications_none, color: AppTheme.textDark),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              
              // Active Job Tracker
              if (_activeBooking != null) ...[
                Text("Active Job", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
                const SizedBox(height: 16),
                _buildLiveTracker(_activeBooking!),
                const SizedBox(height: 32),
              ],

              // CTA Card
              NeumorphicContainer(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryNavy, AppTheme.accentBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Book a Wash", 
                              style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                          const SizedBox(height: 8),
                          Text("Get your car looking brand new in minutes.", 
                              style: GoogleFonts.poppins(fontSize: 12, color: Colors.white70)),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: AppTheme.primaryNavy,
                              elevation: 0,
                            ),
                            onPressed: () {
                              Navigator.push(context, MaterialPageRoute(builder: (context) => const ServiceMenuScreen()));
                            }, 
                            child: const Text("View Services"),
                          )
                        ],
                      ),
                    ),
                    const Icon(Icons.local_car_wash, size: 80, color: Colors.white24),
                  ],
                ),
              ),

              const SizedBox(height: 32),
              /* 
              // Could add Recent Wash History list here later
              Text("Recent History", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
              */
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLiveTracker(Booking booking) {
    // Determine step based on status
    // PENDING -> 0 (Queued)
    // IN_PROGRESS -> 1 (Washing)
    // COMPLETED -> 3 (Ready) 
    // We can simulate intermediate steps if backend supports them, else simplified.
    
    int currentStep = 0;
    if (booking.status == 'IN_PROGRESS') currentStep = 1;
    // Note: If completed, it usually leaves this screen or shows invoices, but handling edge case:
    if (booking.status == 'COMPLETED') currentStep = 3;

    return NeumorphicContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               Text("Washing in Progress", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, color: AppTheme.textDark)),
               Container(
                 padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                 decoration: BoxDecoration(color: Colors.green.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                 child: Text(booking.status, style: GoogleFonts.poppins(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold)),
               )
             ],
           ),
           const SizedBox(height: 20),
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               _buildStep(0, currentStep, "Queued", Icons.schedule),
               _buildConnector(0, currentStep),
               _buildStep(1, currentStep, "Washing", Icons.cleaning_services),
               _buildConnector(1, currentStep),
               _buildStep(2, currentStep, "Polishing", Icons.auto_awesome), 
             ],
           )
        ],
      ),
    );
  }

  Widget _buildStep(int stepIndex, int currentStep, String label, IconData icon) {
    final isActive = stepIndex <= currentStep;
    final isCurrent = stepIndex == currentStep;
    
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isActive ? AppTheme.accentBlue : AppTheme.backgroundLight,
            shape: BoxShape.circle,
            boxShadow: isActive ? [
               BoxShadow(color: AppTheme.accentBlue.withOpacity(0.4), blurRadius: 8, offset: const Offset(0, 4))
            ] : null,
            border: Border.all(color: isActive ? Colors.transparent : Colors.grey.shade300),
          ),
          child: Icon(icon, color: isActive ? Colors.white : Colors.grey, size: 18),
        ),
        const SizedBox(height: 8),
        Text(label, style: GoogleFonts.poppins(fontSize: 10, color: isActive ? AppTheme.textDark : AppTheme.textGrey, fontWeight: isActive ? FontWeight.bold : FontWeight.normal))
      ],
    );
  }

  Widget _buildConnector(int stepIndex, int currentStep) {
    final isActive = stepIndex < currentStep;
    return Expanded(
      child: Container(
        height: 2,
        color: isActive ? AppTheme.accentBlue : Colors.grey.shade300,
      ),
    );
  }
}
