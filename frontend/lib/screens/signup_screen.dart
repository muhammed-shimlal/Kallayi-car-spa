import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import '../services/api_service.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  
  bool _isLoading = false;
  bool _rememberMe = false;
  bool _obscurePassword = true;

  Future<void> _signUp() async {
    if (_usernameController.text.isEmpty || _emailController.text.isEmpty || _passwordController.text.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all fields")));
        return;
    }

    setState(() => _isLoading = true);
    final api = ApiService();

    try {
      await api.register(
        _usernameController.text,
        _emailController.text,
        _passwordController.text,
      );

      // On Success, navigate to Login
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Account Created! Please Login.")));
         Navigator.pushReplacementNamed(context, '/login');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
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
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
               const SizedBox(height: 10),
               Center(child: Icon(Icons.directions_car_filled, size: 60, color: Colors.black)), // Logo
               const SizedBox(height: 20),
               Text(
                "Create Your Account",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 32),
              
              _buildTextField(controller: _emailController, label: "Email", icon: Icons.email_outlined),
              const SizedBox(height: 16),
              _buildTextField(controller: _usernameController, label: "Username", icon: Icons.person_outline),
               const SizedBox(height: 16),
              _buildTextField(
                controller: _passwordController, 
                label: "Password", 
                icon: Icons.lock_outline,
                isPassword: true,
                isObscure: _obscurePassword,
                onVisibilityToggle: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              
              const SizedBox(height: 20),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                   Checkbox(
                    value: _rememberMe,
                    activeColor: Colors.black, // Black checkbox
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                    onChanged: (val) => setState(() => _rememberMe = val!),
                   ),
                   Text("Remember me", style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
                ],
              ),
              
              const SizedBox(height: 24),
              
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _signUp,
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
                        "Sign up",
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                ),
              ),
              
              const SizedBox(height: 40),
              
              // Social Login Divider & Row
             Row(
               children: [
                 Expanded(child: Divider(color: Colors.grey.shade300)),
                 Padding(
                   padding: const EdgeInsets.symmetric(horizontal: 16),
                   child: Text("or continue with", style: GoogleFonts.poppins(color: Colors.grey.shade600, fontSize: 12)),
                 ),
                 Expanded(child: Divider(color: Colors.grey.shade300)),
               ],
             ),
             const SizedBox(height: 24),
             
             Row(
               mainAxisAlignment: MainAxisAlignment.spaceEvenly,
               children: [
                 _buildSocialIcon(Icons.facebook, Colors.blue),
                 _buildSocialIcon(Icons.g_mobiledata, Colors.red),
                 _buildSocialIcon(Icons.apple, Colors.black),
               ],
             ),
             
             const SizedBox(height: 24),
             
             Row(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 Text("Already have an account? ", style: GoogleFonts.poppins(color: Colors.grey)),
                 TextButton(
                   onPressed: () => Navigator.pushReplacementNamed(context, '/login'), 
                   child: Text("Sign in", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold))
                 )
               ],
             ),
             const SizedBox(height: 40),
             ],
          ),
        ),
      ),
    );
  }

  Widget _buildSocialIcon(IconData icon, Color color) {
    return Container(
      width: 60, height: 60,
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 30),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    bool isPassword = false,
    bool isObscure = false,
    VoidCallback? onVisibilityToggle,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: TextField(
        controller: controller,
        obscureText: isPassword ? isObscure : false,
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: Colors.grey.shade500),
          suffixIcon: isPassword 
            ? IconButton(
                icon: Icon(isObscure ? Icons.visibility_off : Icons.visibility, color: Colors.grey.shade500),
                onPressed: onVisibilityToggle,
              )
            : null,
          labelText: label,
          labelStyle: GoogleFonts.poppins(color: Colors.grey.shade500),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        ),
      ),
    );
  }
}
