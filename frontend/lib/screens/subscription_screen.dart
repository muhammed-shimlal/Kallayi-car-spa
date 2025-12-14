import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import 'invoice_screen.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  final ApiService _apiService = ApiService();
  List<SubscriptionPlan> _plans = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPlans();
  }

  void _loadPlans() async {
    try {
      final plans = await _apiService.getSubscriptionPlans();
      if (mounted) {
        setState(() {
          _plans = plans;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error loading plans: $e")));
      }
    }
  }

  void _subscribe(int planId) async {
    try {
      final result = await _apiService.purchaseSubscriptionPlan(planId);
      if (mounted) {
        final invoiceId = result['invoice_id'];
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Subscription Invoice Created!")));
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => InvoiceScreen(invoiceId: invoiceId)), 
        );
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Purchase failed: $e")));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Membership Plans", style: GoogleFonts.poppins(color: AppTheme.textDark, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textDark),
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: _plans.length,
            itemBuilder: (context, index) {
              final plan = _plans[index];
              return Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: NeumorphicContainer(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(plan.name, style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy)),
                          Text("₹${plan.price}", style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.accentBlue)),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(plan.description, style: GoogleFonts.poppins(color: AppTheme.textGrey)),
                      const SizedBox(height: 20),
                      SizedBox(
                         width: double.infinity,
                         child: ElevatedButton(
                           style: ElevatedButton.styleFrom(
                             backgroundColor: AppTheme.primaryNavy,
                             padding: const EdgeInsets.symmetric(vertical: 12),
                             shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                           ),
                           onPressed: () => _subscribe(plan.id),
                           child: const Text("Subscribe Now", style: TextStyle(fontSize: 16)),
                         ),
                      )
                    ],
                  ),
                ),
              );
            },
          ),
    );
  }
}
