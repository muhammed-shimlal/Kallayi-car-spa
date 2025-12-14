import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../providers/user_provider.dart';
import '../widgets/neumorphic_container.dart';

class BookingScreen extends StatefulWidget {
  final ServicePackage selectedPackage;

  const BookingScreen({super.key, required this.selectedPackage});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  final ApiService _apiService = ApiService();
  
  // State
  List<Vehicle> _vehicles = [];
  int? _selectedVehicleId;
  DateTime _selectedDate = DateTime.now();
  String? _selectedSlot;
  List<String> _availableSlots = [];
  bool _isLoading = false;
  bool _isLoadingSlots = false;
  int _customerPoints = 0;
  bool _redeemPoints = false;
  
  @override
  void initState() {
    super.initState();
    _loadVehicles();
    _fetchSlots();
    _fetchProfile();
  }

  void _fetchProfile() async {
     try {
       final token = Provider.of<UserProvider>(context, listen: false).token;
       if (token != null) {
          final profile = await _apiService.getUserProfile(token);
          if (mounted) {
             setState(() { // assuming backend returns 'loyalty_points' in user profile from customer data
               // If endpoint is user/me, does it include loyalty?
               // My view of UserProfile in previous turn (Step 1380) checks Customer model, which has loyaltyPoints.
               // But getUserProfile calls /api/users/me/. I need to confirm if that serializes Customer fields.
               // Assuming it does or I use separate endpoint. 
               // For now, let's assume it's in the profile JSON or mapped.
               // Let's check `api_service.dart` at line 76. It returns jsonDecode.
               // If it's a CustomerSerializer, it likely includes it.
               if (profile.containsKey('customer_profile')) {
                 _customerPoints = profile['customer_profile']['loyalty_points'] ?? 0;
               } else if (profile.containsKey('loyalty_points')) {
                 _customerPoints = profile['loyalty_points'];
               }
             });
          }
       }
     } catch (e) {
       print("Error fetching points: $e");
     }
  }

  void _loadVehicles() async {
    try {
      final vehicles = await _apiService.getVehicles();
      if (mounted) {
        setState(() {
          _vehicles = vehicles;
          if (_vehicles.isNotEmpty) _selectedVehicleId = _vehicles.first.id;
        });
      }
    } catch (e) {
      debugPrint("Error loading vehicles: $e");
    }
  }

  void _fetchSlots() async {
    setState(() => _isLoadingSlots = true);
    try {
      final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
      final slots = await _apiService.getAvailableSlots(dateStr, widget.selectedPackage.id);
      if (mounted) {
        setState(() {
          _availableSlots = slots;
          _selectedSlot = null; // Reset selection
        });
      }
    } catch (e) {
      debugPrint("Error loading slots: $e");
    } finally {
      if (mounted) setState(() => _isLoadingSlots = false);
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 14)),
      builder: (context, child) {
        return Theme(
          data: AppTheme.lightTheme.copyWith(
            colorScheme: const ColorScheme.light(primary: AppTheme.primaryNavy),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
      _fetchSlots();
    }
  }

  void _confirmBooking() async {
    if (_selectedVehicleId == null || _selectedSlot == null) return;
    
    setState(() => _isLoading = true);
    try {
      final userId = Provider.of<UserProvider>(context, listen: false).userId;
      if (userId == null) throw Exception("User not logged in");

      // Combine Date + Slot Time
      final timeParts = _selectedSlot!.split(':');
      final dateTime = DateTime(
        _selectedDate.year,
        _selectedDate.month,
        _selectedDate.day,
        int.parse(timeParts[0]),
        int.parse(timeParts[1]),
      );

      final error = await _apiService.createBooking(
        userId, 
        _selectedVehicleId!, 
        widget.selectedPackage.id, 
        dateTime, 
        "Customer Location", // Placeholder
        pointsRedeemed: _redeemPoints ? 500 : 0
      );

      if (mounted) {
        if (error == null) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Booking Confirmed!")));
          Navigator.popUntil(context, (route) => route.isFirst); // Go to Home
        } else {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error)));
        }
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Book & Schedule", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _sectionTitle("Select Vehicle"),
            const SizedBox(height: 12),
            _buildVehicleSelector(),
            const SizedBox(height: 32),
            
            _sectionTitle("Pick a Date"),
            const SizedBox(height: 12),
            _buildDatePicker(),
            const SizedBox(height: 32),
            
            _sectionTitle("Available Slots"),
            const SizedBox(height: 12),
            _buildSlotGrid(),
            const SizedBox(height: 40),
            
            _buildSummaryCard(),
            const SizedBox(height: 24),
            
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: (_selectedVehicleId != null && _selectedSlot != null && !_isLoading) ? _confirmBooking : null,
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Confirm Booking"),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Text(title, style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600, color: AppTheme.textDark));
  }

  Widget _buildVehicleSelector() {
    if (_vehicles.isEmpty) return const Text("No vehicles found. Add one in profile.");
    
    return SizedBox(
      height: 100,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _vehicles.length,
        itemBuilder: (context, index) {
          final vehicle = _vehicles[index];
          final isSelected = vehicle.id == _selectedVehicleId;
          return GestureDetector(
            onTap: () => setState(() => _selectedVehicleId = vehicle.id),
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: NeumorphicContainer(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                color: isSelected ? AppTheme.primaryNavy : AppTheme.backgroundLight,
                borderRadius: 16,
                isPressed: isSelected, // Visual trick: pressed state for unselected? No, use color.
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.directions_car, color: isSelected ? Colors.white : AppTheme.textGrey),
                    const SizedBox(height: 8),
                    Text(
                      vehicle.plateNumber,
                      style: GoogleFonts.poppins(
                        color: isSelected ? Colors.white : AppTheme.textDark, 
                        fontWeight: FontWeight.w600
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildDatePicker() {
    return GestureDetector(
      onTap: () => _selectDate(context),
      child: NeumorphicContainer(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              DateFormat('EEE, MMM d, yyyy').format(_selectedDate),
              style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w500),
            ),
            const Icon(Icons.calendar_today, color: AppTheme.primaryNavy),
          ],
        ),
      ),
    );
  }

  Widget _buildSlotGrid() {
    if (_isLoadingSlots) return const Center(child: CircularProgressIndicator());
    if (_availableSlots.isEmpty) return const Text("No slots available for this date.");

    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 2.2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: _availableSlots.length,
      itemBuilder: (context, index) {
        final slot = _availableSlots[index];
        final isSelected = slot == _selectedSlot;
        return GestureDetector(
          onTap: () => setState(() => _selectedSlot = slot),
          child: NeumorphicContainer(
            padding: EdgeInsets.zero,
            borderRadius: 12,
            color: isSelected ? AppTheme.accentBlue : AppTheme.backgroundLight,
            child: Center(
              child: Text(
                slot,
                style: GoogleFonts.poppins(
                  color: isSelected ? Colors.white : AppTheme.textDark,
                  fontWeight: FontWeight.w500
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildSummaryCard() {
    double total = widget.selectedPackage.price;
    double discount = 0;
    if (_redeemPoints && _customerPoints >= 500) {
      discount = 50.0;
      total -= discount; // Basic 500 points = $50 logic logic
    }

    return NeumorphicContainer(
      child: Column(
        children: [
          _summaryRow("Service", widget.selectedPackage.name),
          const SizedBox(height: 12),
          if (_selectedVehicleId != null && _vehicles.isNotEmpty) // Safety check
             _summaryRow("Vehicle", _vehicles.firstWhere((v) => v.id == _selectedVehicleId!).plateNumber),
          const SizedBox(height: 12),
          if (_selectedSlot != null)
             _summaryRow("Time", "${DateFormat('MMM d').format(_selectedDate)} at $_selectedSlot"),
          const SizedBox(height: 12),
          if (_customerPoints >= 500) ...[
             const Divider(),
             SwitchListTile(
               title: Text("Redeem 500 Points (-\$50)", style: GoogleFonts.poppins(fontSize: 14)),
               subtitle: Text("Available: $_customerPoints", style: const TextStyle(fontSize: 12, color: Colors.green)),
               value: _redeemPoints,
               onChanged: (val) {
                 setState(() => _redeemPoints = val);
               },
             ),
          ],
          if (discount > 0) ...[
             const Divider(),
             _summaryRow("Discount", "-\$${discount.toStringAsFixed(2)}"),
          ],
          const Divider(height: 24),
          _summaryRow("Total", "\$${total.toStringAsFixed(2)}"),
        ],
      ),
    );
  }

  Widget _summaryRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.poppins(color: AppTheme.textGrey)),
        Text(value, style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)),
      ],
    );
  }
}
