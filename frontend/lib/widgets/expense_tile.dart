import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart'; // Import Google Fonts
import '../theme.dart';
import 'neumorphic_container.dart';

class ExpenseTile extends StatelessWidget {
  final String category;
  final String description; // Using description as primary title
  final String amount;
  final String date;
  final IconData icon;

  const ExpenseTile({
    super.key,
    required this.category,
    required this.description,
    required this.amount,
    required this.date,
    this.icon = Icons.receipt_long, // Default icon
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: NeumorphicContainer(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        borderRadius: 16,
        child: Row(
          children: [
            // Icon Circle
            Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: AppTheme.backgroundLight,
                shape: BoxShape.circle,
                 boxShadow: [
                   const BoxShadow(color: Colors.white, offset: Offset(-3, -3), blurRadius: 5),
                   BoxShadow(color: Colors.grey.shade400, offset: const Offset(3, 3), blurRadius: 5),
                 ],
              ),
              child: Icon(icon, color: AppTheme.accentBlue, size: 22),
            ),
            const SizedBox(width: 16),
            // Text Info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    description,
                    style: GoogleFonts.poppins(fontWeight: FontWeight.w600, fontSize: 15, color: AppTheme.textDark),
                  ),
                  Text(
                    "$date • $category", // Combine date and category
                    style: GoogleFonts.poppins(fontSize: 11, color: AppTheme.textGrey),
                  ),
                ],
              ),
            ),
            // Amount
            Text(
              "-\$$amount",
              style: GoogleFonts.poppins(
                fontWeight: FontWeight.bold,
                fontSize: 16,
                color: Colors.red.shade400, // Expense is negative/red
              ),
            ),
          ],
        ),
      ),
    );
  }
}
