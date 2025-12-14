import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../services/api_service.dart';
import '../providers/user_provider.dart';

class BookingScreen extends StatefulWidget {
  const BookingScreen({super.key});

  @override
  State<BookingScreen> createState() => _BookingScreenState();
}

class _BookingScreenState extends State<BookingScreen> {
  double _timeSlot = 9.0;
  bool _isLoading = false;
  final TextEditingController _addressController = TextEditingController();

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Book Service"), backgroundColor: Colors.transparent, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Select Vehicle", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 15),
            _buildVehicleSelector(),
            const SizedBox(height: 30),
            Text("Select Time Slot", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 15),
            _buildTimeSlider(),
            const SizedBox(height: 30),
            Text("Service Address", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 15),
            _buildLocationPicker(),
            const SizedBox(height: 40),
            _buildConfirmButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildVehicleSelector() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _buildVehicleOption("Toyota Fortuner", true),
          const SizedBox(width: 15),
          _buildVehicleOption("Honda City", false),
        ],
      ),
    );
  }

  Widget _buildVehicleOption(String name, bool isSelected) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
      decoration: BoxDecoration(
        color: isSelected ? Colors.black : AppTheme.backgroundPrimary,
        borderRadius: BorderRadius.circular(15),
        border: isSelected ? null : Border.all(color: Colors.grey.shade300),
      ),
      child: Text(
        name,
        style: TextStyle(color: isSelected ? Colors.white : Colors.black),
      ),
    );
  }

  Widget _buildTimeSlider() {
    // Basic date for MVP: Today
    final dateStr = "${DateTime.now().year}-${DateTime.now().month.toString().padLeft(2,'0')}-${DateTime.now().day.toString().padLeft(2,'0')}";
    
    return FutureBuilder<List<String>>(
      future: ApiService().getAvailableSlots(dateStr, 1), // Hardcoded package 1
      builder: (context, snapshot) {
         if (snapshot.connectionState == ConnectionState.waiting) {
           return LinearProgressIndicator();
         }
         
         List<String> slots = snapshot.data ?? [];
         if (slots.isEmpty) {
           return Text("No slots available today");
         }
         
         return Wrap(
           spacing: 10,
           runSpacing: 10,
           children: slots.map((slot) {
             // Let's parse slot to double for _timeSlot
             final doubleVal = double.tryParse(slot.split(':')[0]) ?? 9.0;
             final isActive = _timeSlot == doubleVal;
             
             return ChoiceChip(
               label: Text(slot),
               selected: isActive,
               onSelected: (selected) {
                 setState(() {
                   _timeSlot = doubleVal;
                 });
               },
             );
           }).toList(),
         );
      },
    );
  }

  Widget _buildLocationPicker() {
    return NeumorphicContainer(
      child: TextField(
        controller: _addressController,
        decoration: InputDecoration(
          hintText: "Enter service address",
          border: InputBorder.none,
          contentPadding: EdgeInsets.symmetric(horizontal: 15, vertical: 10),
        ),
      ),
    );
  }

  Widget _buildConfirmButton() {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
        ),
        onPressed: _isLoading ? null : () async {
          setState(() { _isLoading = true; });
          
          // Trigger booking
          try {
            final userProvider = Provider.of<UserProvider>(context, listen: false);
            if (userProvider.userId == null) {
              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Please login to book")));
              return;
            }
            
            final error = await ApiService().createBooking(
              userProvider.userId!, 
              1, // Hardcoded vehicle ID 
              1, // Hardcoded package ID 
              DateTime.now().add(Duration(hours: _timeSlot.toInt())),
              _addressController.text, 
            );
            
            if (mounted) {
              if (error == null) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Booking Confirmed!")));
                Navigator.pop(context);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error), backgroundColor: Colors.red));
              }
            }
          } finally {
            if (mounted) {
              setState(() { _isLoading = false; });
            }
          }
        },
        child: _isLoading 
          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
          : Text("Confirm Booking", style: TextStyle(color: Colors.white, fontSize: 18)),
      ),
    );
  }
}
