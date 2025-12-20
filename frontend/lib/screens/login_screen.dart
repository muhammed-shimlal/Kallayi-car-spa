import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../services/api_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(); // Keeping username for backend compatibility
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _rememberMe = false;
  bool _obscurePassword = true;

  Future<void> _login() async {
    setState(() => _isLoading = true);
    try {
      // Step 1: Authenticate via AuthProvider
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.login(_usernameController.text, _passwordController.text);
      
      // Step 2: Fetch user profile and role via API
      final ApiService apiService = ApiService();
      final profileData = await apiService.getUserProfile(authProvider.token ?? '');
      
      // Step 3: Update UserProvider with user data including role
      final userProvider = Provider.of<UserProvider>(context, listen: false);
      await userProvider.login(
        profileData['id'] ?? 0,
        profileData['username'] ?? _usernameController.text,
        profileData['role'] ?? 'CUSTOMER',
        authProvider.token ?? '',
      );
      
      // Step 4: Get the user's role for routing
      final role = userProvider.role?.toUpperCase();
      
      if (mounted) {
        // TODO: Check if profile is complete (e.g. vehicle details). 
        // If not, navigate to FillProfileScreen. 
        // For now, adhere to role based routing.
        
        if (role == 'MANAGER' || role == 'ADMIN') {
          Navigator.of(context).pushNamedAndRemoveUntil('/manager', (route) => false);
        } else if (role == 'DRIVER' || role == 'TECHNICIAN' || role == 'WASHER') {
          Navigator.of(context).pushNamedAndRemoveUntil('/driver', (route) => false);
        } else {
          // Default to customer home screen
          Navigator.of(context).pushNamedAndRemoveUntil('/home', (route) => false);
        }
      }
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login Failed: $e'), backgroundColor: Colors.red),
        );
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
        elevation: 0,
        backgroundColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 40),
              Center(child: Icon(Icons.directions_car_filled, size: 60, color: Colors.black)), // Added Logo
              const SizedBox(height: 20),
              
              Text(
                "Login to Your Account",
                textAlign: TextAlign.center,
                style: GoogleFonts.poppins(
                  fontSize: 28, // Slightly smaller for balance
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
              ),
              const SizedBox(height: 40),
              
              // Email/Username Field
              _buildTextField(
                controller: _usernameController,
                label: "Email", // Changed to Email as per wireframe preference usually, but keeping functionality
                icon: Icons.email_outlined,
              ),
              const SizedBox(height: 20),
              
              // Password Field
              _buildTextField(
                controller: _passwordController,
                label: "Password",
                icon: Icons.lock_outline,
                isPassword: true,
                isObscure: _obscurePassword,
                onVisibilityToggle: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              
              const SizedBox(height: 20),
              
              // Remember Me 
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
              
              const SizedBox(height: 30),
              
              // Login Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.black, // Premium Black
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 5,
                    shadowColor: Colors.black.withOpacity(0.3),
                  ),
                  child: _isLoading 
                    ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        "Sign in",
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                ),
              ),
              
             const SizedBox(height: 20),
              
             // Forgot Password Link
             Center(
               child: TextButton(
                onPressed: () {
                  Navigator.pushNamed(context, '/forgot_password_method');
                },
                child: Text(
                  "Forgot the password?",
                  style: GoogleFonts.poppins(
                    color: Colors.blueAccent, // Use accent for link
                    fontWeight: FontWeight.w600,
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
                 _buildSocialIcon(Icons.facebook, Colors.blue), // Using Material Icons as placeholders if FaIcon fails or simplify
                 _buildSocialIcon(Icons.g_mobiledata, Colors.red), // simplifying for compatibility or use images
                 _buildSocialIcon(Icons.apple, Colors.black),
               ],
             ),
             
             const SizedBox(height: 24),
              // Sign Up Link (optional here providing navigation loop)
             Row(
               mainAxisAlignment: MainAxisAlignment.center,
               children: [
                 Text("Don't have an account? ", style: GoogleFonts.poppins(color: Colors.grey)),
                 TextButton(
                   onPressed: () => Navigator.pushNamed(context, '/signup'), 
                   child: Text("Sign up", style: GoogleFonts.poppins(color: Colors.black, fontWeight: FontWeight.bold))
                 )
               ],
             ),
             const SizedBox(height: 24),
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
