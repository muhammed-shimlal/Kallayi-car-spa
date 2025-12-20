import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

class AuthOptionsScreen extends StatelessWidget {
  const AuthOptionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Logo or Image
              // const Icon(Icons.directions_car_filled, size: 80, color: Colors.blueAccent),
              // Use Text or custom logo if available. Wireframe shows just title "Let's you in" with a logo above?
              // Let's use a simple Car Icon for now but Black/Dark
              const Icon(Icons.directions_car_filled, size: 80, color: Colors.black),
              const SizedBox(height: 32),
              
              Text(
                "Let's you in",
                style: GoogleFonts.poppins(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 48),

              // Social Buttons
              _buildSocialButton(
                icon: FontAwesomeIcons.facebookF,
                text: "Continue with Facebook",
                color: Colors.white,
                textColor: Colors.black87,
                borderColor: Colors.grey.shade300,
                onPressed: () {},
              ),
              const SizedBox(height: 16),
              _buildSocialButton(
                icon: FontAwesomeIcons.google,
                text: "Continue with Google",
                color: Colors.white,
                textColor: Colors.black87,
                borderColor: Colors.grey.shade300,
                onPressed: () {},
              ),
              const SizedBox(height: 16),
              _buildSocialButton(
                icon: FontAwesomeIcons.apple,
                text: "Continue with Apple",
                color: Colors.white,
                textColor: Colors.black87,
                borderColor: Colors.grey.shade300,
                onPressed: () {},
              ),

              const SizedBox(height: 32),
              
              // Divider
              Row(
                children: [
                   Expanded(child: Divider(color: Colors.grey.shade300)),
                   Padding(
                     padding: const EdgeInsets.symmetric(horizontal: 16),
                     child: Text("or", style: GoogleFonts.poppins(color: Colors.grey.shade600)),
                   ),
                   Expanded(child: Divider(color: Colors.grey.shade300)),
                ],
              ),
              
              const SizedBox(height: 32),

              // Password Sign In Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.pushNamed(context, '/login'); 
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black, // Premium Black
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 5,
                    shadowColor: Colors.black.withOpacity(0.3),
                  ),
                  child: Text(
                    "Sign in with password",
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),

              const Spacer(),

              // Sign Up Link
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account? ",
                    style: GoogleFonts.poppins(color: Colors.grey.shade600),
                  ),
                  TextButton(
                    onPressed: () {
                      Navigator.pushNamed(context, '/signup');
                    },
                    child: Text(
                      "Sign up",
                      style: GoogleFonts.poppins(
                        color: Colors.black, // Dark link
                        fontWeight: FontWeight.w600,
                      ),
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

  Widget _buildSocialButton({
    required IconData icon,
    required String text,
    required Color color,
    required Color textColor,
    required Color borderColor,
    required VoidCallback onPressed,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: color,
          side: BorderSide(color: borderColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        icon: FaIcon(icon, size: 20, color: textColor),
        label: Text(
          text,
          style: GoogleFonts.poppins(
            fontSize: 16,
            fontWeight: FontWeight.w500,
            color: textColor,
          ),
        ),
      ),
    );
  }
}
