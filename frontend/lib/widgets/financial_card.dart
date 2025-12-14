import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart'; // Import Google Fonts
import '../theme.dart';
import 'neumorphic_container.dart';

class FinancialCard extends StatelessWidget {
  final String title;
  final String amount;
  final IconData icon;
  final bool isHighlighted;

  const FinancialCard({
    super.key,
    required this.title,
    required this.amount,
    required this.icon,
    this.isHighlighted = false,
  });

  @override
  Widget build(BuildContext context) {
    return NeumorphicContainer(
      padding: const EdgeInsets.all(16),
      // Use gradient for highlighted cards (e.g. Net Profit)
      gradient: isHighlighted
          ? const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppTheme.primaryNavy, Color(0xFF34495E)],
            )
          : null,
      color: isHighlighted ? null : AppTheme.backgroundLight,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Icon
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: isHighlighted ? Colors.white.withValues(alpha: 0.2) : AppTheme.backgroundLight,
              shape: BoxShape.circle,
              boxShadow: isHighlighted ? null : [
                 const BoxShadow(color: Colors.white, offset: Offset(-3, -3), blurRadius: 5),
                 BoxShadow(color: Colors.grey.shade400, offset: const Offset(3, 3), blurRadius: 5),
              ],
            ),
            child: Icon(
              icon,
              color: isHighlighted ? Colors.white : AppTheme.primaryNavy,
              size: 20,
            ),
          ),
          const Spacer(),
          // Amount
          Text(
            amount,
            style: GoogleFonts.poppins(
              fontSize: 19, // Slightly larger
              fontWeight: FontWeight.bold,
              color: isHighlighted ? Colors.white : AppTheme.textDark,
            ),
          ),
          // Title
          Text(
            title,
            style: GoogleFonts.poppins(
              fontSize: 12,
              fontWeight: FontWeight.w500,
              color: isHighlighted ? Colors.white70 : AppTheme.textGrey,
            ),
          ),
        ],
      ),
    );
  }
}
