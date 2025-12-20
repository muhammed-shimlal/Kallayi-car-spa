import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/user_provider.dart';
import '../services/api_service.dart';

class FillProfileScreen extends StatefulWidget {
  const FillProfileScreen({super.key});

  @override
  State<FillProfileScreen> createState() => _FillProfileScreenState();
}

class _FillProfileScreenState extends State<FillProfileScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController(); // Just for display/update if allowed
  final _phoneController = TextEditingController();
  final _plateController = TextEditingController();
  final _brandController = TextEditingController();
  
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Pre-fill user data if available
    final user = Provider.of<UserProvider>(context, listen: false);
    _nameController.text = user.username ?? ""; // or fetch full name if separate
    // _emailController.text = user.email ?? ""; // API might need to provide email
  }

  Future<void> _submitProfile() async {
    if (_nameController.text.isEmpty || _plateController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all required fields")));
      return;
    }

    setState(() => _isLoading = true);
    final userProvider = Provider.of<UserProvider>(context, listen: false);
    final api = ApiService();

    try {
      // 1. Update Profile (Name, Phone)
      await api.updateProfile(userProvider.userId!, {
        'first_name': _nameController.text, // Assuming separate First/Last or just Name
        'last_name': '', // or split name
        // 'phone_number': _phoneController.text, // If supported by backend user model or profile
      });

      // 2. Add Vehicle
      await api.addVehicle({
        'license_plate': _plateController.text,
         // 'make': _brandController.text, // If backend supports it
         // 'model': 'Unknown', 
         // 'customer': userProvider.userId // Explicit customer ID or handle by headers
      });

      if (mounted) {
         // Proceed to Security Setup
         // Navigator.pushNamed(context, '/create_pin'); // Not implemented yet
         // For now go Home
         Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
      }
    } catch (e) {
      if (mounted) {
        // Show error but maybe proceed if it's just duplicate vehicle or something
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
        // On error, stay here
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        title: Text("Fill Your Profile", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
               // Profile Photo Placeholder
               Center(
                 child: Stack(
                   children: [
                     Container(
                       width: 100,
                       height: 100,
                       decoration: BoxDecoration(
                         color: Colors.grey.shade200,
                         shape: BoxShape.circle,
                       ),
                       child: const Icon(Icons.person, size: 60, color: Colors.grey),
                     ),
                     Positioned(
                       bottom: 0,
                       right: 0,
                       child: Container(
                         decoration: const BoxDecoration(
                           color: Colors.black, // Black edit button
                           shape: BoxShape.circle,
                           ),
                         child: IconButton(
                           icon: const Icon(Icons.edit, size: 16, color: Colors.white),
                           onPressed: () {},
                         ),
                       ),
                     )
                   ],
                 ),
               ),
               const SizedBox(height: 32),
               
               _buildTextField(controller: _nameController, label: "Full Name"),
               const SizedBox(height: 16),
               _buildTextField(controller: _phoneController, label: "Phone Number", inputType: TextInputType.phone),
               const SizedBox(height: 16),
               _buildTextField(controller: _emailController, label: "Email", inputType: TextInputType.emailAddress),
               const SizedBox(height: 16),
               
               // Vehicle Section
               Align(
                 alignment: Alignment.centerLeft,
                 child: Text("Vehicle Details", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold)),
               ),
               const SizedBox(height: 16),
               _buildTextField(controller: _plateController, label: "Vehicle Number Plate"),
               const SizedBox(height: 16),
               _buildTextField(controller: _brandController, label: "Vehicle Brand (e.g. Toyota)"),

               const SizedBox(height: 48),
               
               SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitProfile,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black, // Premium Black
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 5,
                    shadowColor: Colors.black.withOpacity(0.3),
                  ),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        "Continue",
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    TextInputType inputType = TextInputType.text
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: TextField(
        controller: controller,
        keyboardType: inputType,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.poppins(color: Colors.grey.shade500),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }
}
