import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class FingerprintScreen extends StatelessWidget {
  const FingerprintScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(backgroundColor: Colors.white, elevation: 0),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Text(
                "Set Your Fingerprint", 
                style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold)
              ),
              const SizedBox(height: 16),
              Text(
                "Add a fingerprint to make your account more secure",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(color: Colors.grey),
              ),
              const SizedBox(height: 48),
              
              Icon(Icons.fingerprint, size: 120, color: Colors.blueAccent),
              
              const SizedBox(height: 48),
              
              Text(
                "Please put your finger on the sensor to continue",
                 textAlign: TextAlign.center,
                 style: GoogleFonts.poppins(color: Colors.grey),
              ),
              
              const Spacer(),
              
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                         // Skip to Home
                         Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
                      },
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        side: BorderSide(color: Colors.blueAccent.withOpacity(0.5)),
                        minimumSize: Size(0, 56)
                      ),
                      child: Text("Skip", style: GoogleFonts.poppins(color: Colors.blueAccent)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                         // Success -> Home
                         _showSuccess(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueAccent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        minimumSize: Size(0, 56)
                      ),
                      child: Text("Continue", style: GoogleFonts.poppins(color: Colors.white)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _showSuccess(BuildContext context) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.check_circle, color: Colors.blueAccent, size: 60),
            const SizedBox(height: 24),
            Text("Congratulations!", style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 10),
            Text("Your account is ready to use", textAlign: TextAlign.center),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blueAccent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
                child: const Text("Go to Home", style: TextStyle(color: Colors.white)),
              ),
            )
          ],
        ),
      ),
    );
  }
}
