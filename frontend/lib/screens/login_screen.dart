import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/user_provider.dart';
import '../services/api_service.dart';
import 'home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;

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
        // Route based on role
        if (role == 'MANAGER' || role == 'ADMIN') {
          Navigator.of(context).pushReplacementNamed('/manager');
        } else if (role == 'DRIVER' || role == 'TECHNICIAN' || role == 'WASHER') {
          Navigator.of(context).pushReplacementNamed('/driver');
        } else {
          // Default to customer home screen
          Navigator.of(context).pushReplacementNamed('/home');
        }
      }
      
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Kallayi Car Spa Login')),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            TextField(
              controller: _usernameController,
              decoration: const InputDecoration(labelText: 'Username', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _passwordController,
              decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
              obscureText: true,
            ),
            const SizedBox(height: 30),
            _isLoading
                ? const CircularProgressIndicator()
                : ElevatedButton(
                    onPressed: _login,
                    style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50)),
                    child: const Text('Login'),
                  ),
          ],
        ),
      ),
    );
  }
}
