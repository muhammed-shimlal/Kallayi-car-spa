import 'package:flutter/material.dart';
import '../theme.dart';

class NeumorphicContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final Color? color;
  final Gradient? gradient;
  final bool isPressed;

  const NeumorphicContainer({
    super.key,
    required this.child,
    this.borderRadius = 20.0,
    this.padding = const EdgeInsets.all(20.0),
    this.color,
    this.gradient,
    this.isPressed = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? AppTheme.backgroundLight,
        borderRadius: BorderRadius.circular(borderRadius),
        gradient: gradient,
        boxShadow: isPressed 
          ? null // No shadow when pressed (or inset, but simple removal is safer)
          : [
            const BoxShadow(
              color: AppTheme.shadowLight,
              offset: Offset(-6, -6),
              blurRadius: 12,
            ),
            const BoxShadow(
              color: AppTheme.shadowDark,
              offset: Offset(6, 6),
              blurRadius: 12,
            ),
          ],
      ),
      child: child,
    );
  }
}
