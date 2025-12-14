import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart'; // Ensure this is needed or remove
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/service_menu_screen.dart';
import 'screens/booking_screen.dart';
import 'screens/manager_dashboard.dart';
import 'screens/driver_dashboard.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'providers/user_provider.dart';
import 'providers/auth_provider.dart';

void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => UserProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: const KallayiCarSpaApp(),
    ),
  );
}

class KallayiCarSpaApp extends StatelessWidget {
  const KallayiCarSpaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kallayi Car Spa',
      theme: AppTheme.lightTheme,
      debugShowCheckedModeBanner: false,
      home: Consumer<AuthProvider>(
        builder: (context, auth, _) {
          if (auth.isAuthenticated) {
            return const HomeScreen();
          } else {
            return const FutureBuilderWrapper();
          }
        },
      ),
      routes: {
        '/signup': (context) => const SignupScreen(),
        '/home': (context) => const HomeScreen(),
        '/services': (context) => const ServiceMenuScreen(),
        '/booking': (context) => const BookingScreen(),
        '/manager': (context) => const ManagerDashboard(),
        '/driver': (context) => const DriverDashboard(),
      },
    );
  }
}

class FutureBuilderWrapper extends StatefulWidget {
  const FutureBuilderWrapper({super.key});

  @override
  State<FutureBuilderWrapper> createState() => _FutureBuilderWrapperState();
}

class _FutureBuilderWrapperState extends State<FutureBuilderWrapper> {
  @override
  void initState() {
    super.initState();
    // Check auth status once on init
    Provider.of<AuthProvider>(context, listen: false).checkAuthStatus();
  }

  @override
  Widget build(BuildContext context) {
    return const LoginScreen();
  }
}
