import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../services/api_service.dart';

class InvoiceScreen extends StatefulWidget {
  final int? bookingId;
  final int? invoiceId;
  const InvoiceScreen({super.key, this.bookingId, this.invoiceId});

  @override
  State<InvoiceScreen> createState() => _InvoiceScreenState();
}

class _InvoiceScreenState extends State<InvoiceScreen> {
  final ApiService _apiService = ApiService();
  late Future<Map<String, dynamic>> _invoiceFuture;

  @override
  void initState() {
    super.initState();
    _loadInvoice();
  }

  void _loadInvoice() {
    // Add small delay to allow backend to generate invoice
    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          if (widget.invoiceId != null) {
            _invoiceFuture = _apiService.getInvoiceById(widget.invoiceId!);
          } else if (widget.bookingId != null) {
            _invoiceFuture = _apiService.getInvoice(widget.bookingId!);
          } else {
             _invoiceFuture = Future.error("No Invoice ID or Booking ID provided");
          }
        });
      }
    });
  }

  Future<void> _pay(int invoiceId, String method) async {
    try {
      await _apiService.payInvoice(invoiceId, method);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Payment Successful!")));
      Navigator.pop(context); // Go back to dashboard
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Payment Failed"), backgroundColor: Colors.red));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Invoice"), backgroundColor: Colors.transparent, elevation: 0),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _invoiceFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text("Generating Invoice..."));
          } else if (!snapshot.hasData) {
            return const Center(child: Text("Invoice not found"));
          }

          final invoice = snapshot.data!;
          final isPaid = invoice['is_paid'] as bool;

          return Padding(
            padding: const EdgeInsets.all(20.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NeumorphicContainer(
                  child: Column(
                    children: [
                      Text("Invoice #${invoice['id']}", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 20),
                      Text("Amount Due", style: TextStyle(color: Colors.grey)),
                      Text("\$${invoice['amount']}", style: TextStyle(fontSize: 40, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 20),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                        decoration: BoxDecoration(
                          color: isPaid ? Colors.green.shade100 : Colors.red.shade100,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          isPaid ? "PAID" : "UNPAID",
                          style: TextStyle(
                            color: isPaid ? Colors.green : Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                if (!isPaid) ...[
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 20),
                    ),
                    onPressed: () => _pay(invoice['id'], 'CASH'),
                    child: Text("Collect Cash", style: TextStyle(color: Colors.white)),
                  ),
                  const SizedBox(height: 15),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                      padding: const EdgeInsets.symmetric(vertical: 20),
                    ),
                    onPressed: () => _pay(invoice['id'], 'CARD'),
                    child: Text("Pay with Card", style: TextStyle(color: Colors.white)),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}
