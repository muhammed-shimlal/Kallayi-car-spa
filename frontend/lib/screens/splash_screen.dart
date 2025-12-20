import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // Simulate loading or check auth
    Timer(const Duration(seconds: 3), _navigateNext);
  }

  void _navigateNext() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    // If not authenticated, go to Intro. 
    // If authenticated, AuthProvider/Main logic *should* handle it, 
    // but for this flow we explicitly go to Intro if it's a fresh start or AuthOptions.
    // For now, let's always go to Intro for the demo of new flow, 
    // or check if 'seenIntro' preference exists.
    
    // Assuming we want to show Intro for unauthenticated users:
    if (auth.isAuthenticated) {
         // Let main.dart wrapper handle auth routing usually, 
         // but if we are here, we might just pushReplacementNamed.
         // However, Main's home is a Consumer. 
         // So avoiding conflict, we just pushReplacementNamed('/intro') if not auth.
         // Actually, if auth is valid, we might want to skip intro.
         // For now, adhering to User Request flow: splash -> intro
         if (mounted) Navigator.pushReplacementNamed(context, '/intro');
    } else {
        if (mounted) Navigator.pushReplacementNamed(context, '/intro');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.blueAccent.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.directions_car_filled,
                size: 80,
                color: Colors.blueAccent,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              "Kallayi Car Spa",
              style: GoogleFonts.poppins(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 48),
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Colors.blueAccent),
            ),
          ],
        ),
      ),
    );
  }
}
