import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// 1. Forgot Password Method Selection
class ForgotPasswordMethodScreen extends StatefulWidget {
  const ForgotPasswordMethodScreen({super.key});

  @override
  State<ForgotPasswordMethodScreen> createState() => _ForgotPasswordMethodScreenState();
}

class _ForgotPasswordMethodScreenState extends State<ForgotPasswordMethodScreen> {
  int _selectedMethod = 0; // 0: SMS, 1: Email

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(title: Text("Forgot Password", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold)), backgroundColor: Colors.white, elevation: 0, leading: BackButton(color: Colors.black)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
             Expanded(
               child: Column(
                 children: [
                   const SizedBox(height: 20),
                   Image.network('https://cdn-icons-png.flaticon.com/512/6195/6195699.png', height: 150), // Placeholder Lock Icon
                   const SizedBox(height: 24),
                   Text("Select which contact details should we use to reset your password", textAlign: TextAlign.center, style: GoogleFonts.poppins(fontSize: 16)),
                   const SizedBox(height: 32),
                   
                   _buildMethodOption(0, Icons.sms, "via SMS:", "+1 111 ******99"),
                   const SizedBox(height: 20),
                   _buildMethodOption(1, Icons.email, "via Email:", "and***@yourdomain.com"),
                 ],
               ),
             ),
             SizedBox(
               width: double.infinity,
               height: 56,
               child: ElevatedButton(
                 onPressed: () {
                   Navigator.pushNamed(context, '/otp_verification');
                 },
                 style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                 child: Text("Continue", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18)),
               ),
             )
          ],
        ),
      ),
    );
  }

  Widget _buildMethodOption(int index, IconData icon, String title, String detail) {
    final isSelected = _selectedMethod == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedMethod = index),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? Colors.blueAccent : Colors.grey.shade200, width: 2),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: Colors.blueAccent.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: Colors.blueAccent),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.poppins(color: Colors.grey, fontSize: 14)),
                  const SizedBox(height: 8),
                  Text(detail, style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              )
            )
          ],
        ),
      ),
    );
  }
}

// 2. OTP Verification
class OtpVerificationScreen extends StatelessWidget {
  const OtpVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(title: Text("Forgot Password", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold)), backgroundColor: Colors.white, elevation: 0, leading: BackButton(color: Colors.black)),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
             const SizedBox(height: 40),
             Text("Code has been sent to +1 111 ******99", textAlign: TextAlign.center, style: GoogleFonts.poppins(fontSize: 16)),
             const SizedBox(height: 60),
             
             Row(
               mainAxisAlignment: MainAxisAlignment.spaceEvenly,
               children: List.generate(4, (index) => _buildOtpDigit(context)),
             ), 
             
             const SizedBox(height: 60),
             Text("Resend code in 55s", style: GoogleFonts.poppins(color: Colors.blueAccent)),
             
             const Spacer(),
             
             SizedBox(
               width: double.infinity,
               height: 56,
               child: ElevatedButton(
                 onPressed: () {
                   Navigator.pushNamed(context, '/create_new_password');
                 },
                 style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                 child: Text("Verify", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18)),
               ),
             )
          ],
        ),
      ),
    );
  }
  
  Widget _buildOtpDigit(BuildContext context) {
    return Container(
      width: 60, height: 60,
      decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(16)),
      child: TextField(
        textAlign: TextAlign.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        decoration: const InputDecoration(border: InputBorder.none, counterText: ""),
        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
      ),
    );
  }
}

// 3. Create New Password
class NewPasswordScreen extends StatefulWidget {
  const NewPasswordScreen({super.key});

  @override
  State<NewPasswordScreen> createState() => _NewPasswordScreenState();
}

class _NewPasswordScreenState extends State<NewPasswordScreen> {
  bool _rememberMe = false;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(title: Text("Create New Password", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold)), backgroundColor: Colors.white, elevation: 0, leading: BackButton(color: Colors.black)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
             Image.network('https://cdn-icons-png.flaticon.com/512/2889/2889676.png', height: 200),
             const SizedBox(height: 24),
             Text("Create Your New Password", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w500)),
             const SizedBox(height: 24),
             
             _buildTextField("New Password"),
             const SizedBox(height: 16),
             _buildTextField("Confirm New Password"),
             
             const SizedBox(height: 20),
             Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   Checkbox(
                    value: _rememberMe,
                    activeColor: Colors.blueAccent,
                    onChanged: (val) => setState(() => _rememberMe = val!),
                   ),
                   Text("Remember me", style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
                ],
              ),
             
             const SizedBox(height: 40),
             SizedBox(
               width: double.infinity,
               height: 56,
               child: ElevatedButton(
                 onPressed: () {
                    // Success UI
                    showDialog(context: context,  barrierDismissible: false, builder: (_) => const SuccessDialog());
                 },
                 style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                 child: Text("Continue", style: GoogleFonts.poppins(color: Colors.white, fontSize: 18)),
               ),
             )
          ],
        ),
      ),
    );
  }
  
  Widget _buildTextField(String label) {
     return Container(
      decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
      child: TextField(
        obscureText: true,
        decoration: InputDecoration(
          prefixIcon: const Icon(Icons.lock, color: Colors.grey),
          suffixIcon: const Icon(Icons.visibility_off, color: Colors.grey),
          labelText: label,
          labelStyle: GoogleFonts.poppins(color: Colors.grey),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }
}

class SuccessDialog extends StatelessWidget {
  const SuccessDialog({super.key});

  @override
  Widget build(BuildContext context) {
     return AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.verified_user, color: Colors.blueAccent, size: 60),
            const SizedBox(height: 24),
            Text("Congratulations!", style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Text("Your account is ready to use", textAlign: TextAlign.center),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false), // Go to login
                style: ElevatedButton.styleFrom(backgroundColor: Colors.blueAccent, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
                child: const Text("Go to Login", style: TextStyle(color: Colors.white)),
              ),
            )
          ],
        ),
      );
  }
}
