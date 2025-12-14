import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';

class ExpenseApprovalScreen extends StatefulWidget {
  const ExpenseApprovalScreen({super.key});

  @override
  State<ExpenseApprovalScreen> createState() => _ExpenseApprovalScreenState();
}

class _ExpenseApprovalScreenState extends State<ExpenseApprovalScreen> {
  final ApiService _apiService = ApiService();
  List<dynamic> _pendingExpenses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchPendingExpenses();
  }

  Future<void> _fetchPendingExpenses() async {
    setState(() => _isLoading = true);
    try {
      final expenses = await _apiService.get('/api/finance/general-expenses/');
      
      // Filter for pending only
      final pending = (expenses as List).where((e) => e['status'] == 'PENDING').toList();
      
      if (mounted) {
        setState(() {
          _pendingExpenses = pending;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Error fetching expenses: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _approveExpense(int expenseId) async {
    try {
      await _apiService.post('/api/finance/general-expenses/$expenseId/approve/');
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense Approved'), backgroundColor: Colors.green)
      );
      _fetchPendingExpenses(); // Refresh
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red)
      );
    }
  }

  Future<void> _rejectExpense(int expenseId) async {
    try {
      await _apiService.post('/api/finance/general-expenses/$expenseId/reject/');
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Expense Rejected'),backgroundColor: Colors.orange)
      );
      _fetchPendingExpenses(); // Refresh
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red)
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Pending Approvals", style: GoogleFonts.poppins(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _pendingExpenses.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle_outline, size: 80, color: Colors.green),
                      const SizedBox(height: 16),
                      Text("All Clear!", style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.w600)),
                      Text("No pending approvals", style: GoogleFonts.poppins(color: AppTheme.textGrey)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _pendingExpenses.length,
                  itemBuilder: (context, index) {
                    final expense = _pendingExpenses[index];
                    return Dismissible(
                      key: Key(expense['id'].toString()),
                      confirmDismiss: (direction) async {
                        if (direction == DismissDirection.endToStart) {
                          // Swipe left - Reject
                          _rejectExpense(expense['id']);
                          return true;
                        } else {
                          // Swipe right - Approve
                          _approveExpense(expense['id']);
                          return true;
                        }
                      },
                      background: Container(
                        color: Colors.green,
                        alignment: Alignment.centerLeft,
                        padding: const EdgeInsets.only(left: 20),
                        child: const Icon(Icons.check, color: Colors.white, size: 32),
                      ),
                      secondaryBackground: Container(
                        color: Colors.red,
                        alignment: Alignment.centerRight,
                        padding: const EdgeInsets.only(right: 20),
                        child: const Icon(Icons.close, color: Colors.white, size: 32),
                      ),
                      child: _buildExpenseCard(expense),
                    );
                  },
                ),
    );
  }

  Widget _buildExpenseCard(Map<String, dynamic> expense) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      child: NeumorphicContainer(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  expense['category_name'] ?? 'General',
                  style: GoogleFonts.poppins(fontSize: 16, fontWeight: FontWeight.w600),
                ),
                Text(
                  "₹${expense['amount']}",
                  style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryNavy),
                ),
              ],
            ),
          const SizedBox(height: 8),
          Text(
            expense['description'] ?? 'No description',
            style: GoogleFonts.poppins(color: AppTheme.textGrey, fontSize: 14),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.calendar_today, size: 14, color: AppTheme.textGrey),
              const SizedBox(width: 4),
              Text(
                expense['date'] ?? '',
                style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textGrey),
              ),
              const SizedBox(width: 16),
              const Icon(Icons.person, size: 14, color: AppTheme.textGrey),
              const SizedBox(width: 4),
              Text(
                "Recorded by staff",
                style: GoogleFonts.poppins(fontSize: 12, color: AppTheme.textGrey),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _rejectExpense(expense['id']),
                  icon: const Icon(Icons.close, size: 18),
                  label: const Text("Reject"),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.red,
                    side: const BorderSide(color: Colors.red),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _approveExpense(expense['id']),
                  icon: const Icon(Icons.check, size: 18),
                  label: const Text("Approve"),
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                ),
              ),
            ],
          ),
        ],
      ),
      ),
    );
  }
}
