import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color backgroundPrimary = Color(0xFFF2F2F2);
  static const Color surfaceCardLight = Color(0xFFFFFFFF);
  static const Color surfaceCardDark = Color(0xFF121212);
  static const Color textPrimaryOnLight = Color(0xFF1A1A1A);
  static const Color textSecondaryOnLight = Color(0xFF888888);
  static const Color textPrimaryOnDark = Color(0xFFFFFFFF);
  static const Color accentActive = Color(0xFF000000);
  static const Color accentInactive = Color(0xFFE0E0E0);

  static ThemeData get lightTheme {
    return ThemeData(
      scaffoldBackgroundColor: backgroundPrimary,
      primaryColor: accentActive,
      textTheme: GoogleFonts.poppinsTextTheme().apply(
        bodyColor: textPrimaryOnLight,
        displayColor: textPrimaryOnLight,
      ),
      colorScheme: ColorScheme.light(
        primary: accentActive,
        surface: surfaceCardLight,
        background: backgroundPrimary,
      ),
    );
  }
}
