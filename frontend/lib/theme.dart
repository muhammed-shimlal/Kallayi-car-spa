import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Neumorphic Palette
  static const Color backgroundLight = Color(0xFFE0E5EC); // Light Blue-Grey
  static const Color primaryNavy = Color(0xFF2C3E50);     // Deep Navy
  static const Color accentBlue = Color(0xFF4A90E2);      // Bright Blue
  
  static const Color shadowLight = Color(0xFFFFFFFF);     // Top-Left Shadow
  static const Color shadowDark = Color(0xFFA3B1C6);      // Bottom-Right Shadow
  
  static const Color textDark = Color(0xFF2D3436);
  static const Color textGrey = Color(0xFF636E72);

  static ThemeData get lightTheme {
    return ThemeData(
      scaffoldBackgroundColor: backgroundLight,
      primaryColor: primaryNavy,
      useMaterial3: true,
      
      // Typography
      textTheme: GoogleFonts.poppinsTextTheme().apply(
        bodyColor: textDark,
        displayColor: textDark,
      ),

      // App Bar
      appBarTheme: const AppBarTheme(
        backgroundColor: backgroundLight,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: primaryNavy),
        titleTextStyle: TextStyle(color: primaryNavy, fontSize: 22, fontWeight: FontWeight.w600),
      ),
      
      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryNavy,
          foregroundColor: Colors.white,
          elevation: 10,
          shadowColor: shadowDark,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
      
      // Floating Action Button
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: accentBlue,
        foregroundColor: Colors.white,
        elevation: 10,
      ),
    );
  }
}
