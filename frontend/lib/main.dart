import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'theme.dart';
import 'screens/home_screen.dart';
import 'screens/service_menu_screen.dart';
import 'screens/booking_screen.dart';
import 'screens/manager_dashboard.dart';
import 'screens/driver_dashboard.dart';
import 'screens/login_screen.dart';
import 'screens/signup_screen.dart';
import 'screens/fill_profile_screen.dart';
import 'screens/create_pin_screen.dart';
import 'screens/fingerprint_screen.dart';
import 'screens/forgot_password_screens.dart';
import 'screens/splash_screen.dart';
import 'screens/intro_screen.dart';
import 'screens/auth_options_screen.dart';
import 'providers/user_provider.dart';
import 'providers/auth_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Stripe with publishable key
  // TODO: Replace with your actual Stripe publishable key
  Stripe.publishableKey = "pk_test_51...YOUR_PUBLISHABLE_KEY";
  
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
      home: Consumer2<AuthProvider, UserProvider>(
        builder: (context, auth, user, _) {
          if (auth.isAuthenticated && user.role != null) {
            // Route based on role
            final role = user.role?.toUpperCase();
            if (role == 'MANAGER' || role == 'ADMIN') {
              return const ManagerDashboard();
            } else if (role == 'DRIVER' || role == 'TECHNICIAN' || role == 'WASHER') {
              return const DriverDashboard();
            } else {
              return const HomeScreen();
            }
          } else {
            return const FutureBuilderWrapper();
          }
        },
      ),
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/intro': (context) => const IntroScreen(),
        '/auth_options': (context) => const AuthOptionsScreen(),
        '/login': (context) => const LoginScreen(),
        '/signup': (context) => const SignupScreen(),
         '/fill_profile': (context) => const FillProfileScreen(),
        '/create_pin': (context) => const CreatePinScreen(),
        '/fingerprint_setup': (context) => const FingerprintScreen(),
        '/forgot_password_method': (context) => const ForgotPasswordMethodScreen(),
        '/otp_verification': (context) => const OtpVerificationScreen(),
        '/create_new_password': (context) => const NewPasswordScreen(),
        '/home': (context) => const HomeScreen(),
        '/services': (context) => const ServiceMenuScreen(),
        // BookingScreen requires arguments, so it's not a named route here
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
    return const SplashScreen();
  }
}
