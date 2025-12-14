import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/financial_card.dart';
import '../widgets/expense_tile.dart';
import '../widgets/neumorphic_container.dart';
import 'reports_screen.dart';

class ManagerDashboard extends StatefulWidget {
  const ManagerDashboard({super.key});

  @override
  State<ManagerDashboard> createState() => _ManagerDashboardState();
}

class _ManagerDashboardState extends State<ManagerDashboard> {
  final ApiService _apiService = ApiService();
  Map<String, dynamic> _kpiData = {};
  List<dynamic> _recentExpenses = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  Future<void> _fetchData() async {
    try {
      final kpi = await _apiService.getDashboardStats();
      final expenses = await _apiService.getRecentExpenses();
      if (mounted) {
        setState(() {
          _kpiData = kpi;
          _recentExpenses = expenses;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint("Error fetching dashboard data: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showAddExpenseModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent, // transparent to show rounded corners
      builder: (context) => Container(
        decoration: const BoxDecoration(
          color: AppTheme.backgroundLight,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: const AddExpenseForm(),
      ),
    ).then((_) => _fetchData()); // Refresh on close
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Parse KPI Data
    final currency = NumberFormat.simpleCurrency();
    final revenue = double.tryParse(_kpiData['revenue'].toString()) ?? 0;
    final expenses = double.tryParse(_kpiData['general_expenses_total'].toString()) ?? 0;
    final labor = double.tryParse(_kpiData['labor_cost'].toString()) ?? 0;
    final netProfit = double.tryParse(_kpiData['net_profit'].toString()) ?? 0;

    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 32),
              _buildFinancialGrid(currency, revenue, expenses, labor, netProfit),
              const SizedBox(height: 32),
              _buildRecentTransactionHeader(),
              const SizedBox(height: 16),
              _buildRecentExpensesList(currency),
              const SizedBox(height: 80), // Space for FAB
            ],
          ),
        ),
      ),
      floatingActionButton: NeumorphicContainer(
        padding: EdgeInsets.zero,
        borderRadius: 30, // Circle
        color: AppTheme.accentBlue, // Fallback
        child: Container(
          height: 60,
          width: 60,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [AppTheme.accentBlue, Color(0xFF2980B9)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: IconButton(
            icon: const Icon(Icons.add, color: Colors.white, size: 30),
            onPressed: _showAddExpenseModal,
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("Welcome back,", style: GoogleFonts.poppins(fontSize: 14, color: AppTheme.textGrey)),
            Text("Owner", style: GoogleFonts.poppins(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
          ],
        ),
        Row(
          children: [
            IconButton(
              icon: const Icon(Icons.analytics_outlined, color: AppTheme.primaryNavy),
              onPressed: () {
                Navigator.push(context, MaterialPageRoute(builder: (c) => const ReportsScreen()));
              },
            ),
            NeumorphicContainer(
              padding: const EdgeInsets.all(10),
              borderRadius: 12,
              child: const Icon(Icons.notifications_none, color: AppTheme.textDark),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFinancialGrid(NumberFormat currency, double revenue, double expenses, double labor, double netProfit) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 20,
      mainAxisSpacing: 20,
      childAspectRatio: 1.0, // Square cards
      children: [
        FinancialCard(
          title: "Revenue",
          amount: currency.format(revenue),
          icon: Icons.attach_money,
        ),
        FinancialCard(
          title: "Expenses",
          amount: currency.format(expenses),
          icon: Icons.trending_down,
        ),
        FinancialCard(
          title: "Labor",
          amount: currency.format(labor),
          icon: Icons.group,
        ),
        FinancialCard(
          title: "Net Profit",
          amount: currency.format(netProfit),
          icon: Icons.account_balance_wallet,
          isHighlighted: true, // Gradient Highlighting
        ),
      ],
    );
  }

  Widget _buildRecentTransactionHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text("Recent Expenses", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
        TextButton(
          onPressed: () {}, 
          child: Text("See all", style: GoogleFonts.poppins(color: AppTheme.accentBlue)),
        )
      ],
    );
  }

  Widget _buildRecentExpensesList(NumberFormat currency) {
    if (_recentExpenses.isEmpty) {
      return Center(child: Text("No expenses recorded", style: GoogleFonts.poppins(color: AppTheme.textGrey)));
    }
    return Column(
      children: _recentExpenses.map<Widget>((expense) {
        return ExpenseTile(
          category: expense['category_name'] ?? 'General',
          description: expense['description'] ?? 'Expense',
          date: expense['date'] ?? '',
          amount: expense['amount'].toString(),
        );
      }).toList(),
    );
  }
}

class AddExpenseForm extends StatefulWidget {
  const AddExpenseForm({super.key});

  @override
  State<AddExpenseForm> createState() => _AddExpenseFormState();
}

class _AddExpenseFormState extends State<AddExpenseForm> {
  final _amountController = TextEditingController();
  final _descController = TextEditingController();
  final ApiService _apiService = ApiService();
  File? _imageFile;
  final ImagePicker _picker = ImagePicker();
  bool _isLoading = false;
  
  List<dynamic> _categories = [];
  int? _selectedCategoryId;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  void _loadCategories() async {
    try {
      final cats = await _apiService.getExpenseCategories();
      if (mounted) setState(() => _categories = cats);
    } catch (e) {
      debugPrint("Error loading categories: $e");
    }
  }

  Future<void> _pickImage() async {
    final XFile? picked = await _picker.pickImage(source: ImageSource.camera);
    if (picked != null) {
      setState(() => _imageFile = File(picked.path));
    }
  }

  void _submit() async {
    if (_amountController.text.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      await _apiService.addGeneralExpense(
        _descController.text, 
        double.parse(_amountController.text), 
        _selectedCategoryId, 
        DateTime.now(),
        _imageFile?.path
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Expense Added")));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Add Expense", style: GoogleFonts.poppins(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.textDark)),
              IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close))
            ],
          ),
          const SizedBox(height: 20),
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            style: GoogleFonts.poppins(),
            decoration: const InputDecoration(labelText: "Amount", prefixText: "\$"),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _selectedCategoryId,
            decoration: const InputDecoration(labelText: "Category"),
            items: _categories.map<DropdownMenuItem<int>>((cat) {
              return DropdownMenuItem<int>(
                value: cat['id'],
                child: Text(cat['name'], style: GoogleFonts.poppins()),
              );
            }).toList(),
            onChanged: (val) => setState(() => _selectedCategoryId = val),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descController,
             style: GoogleFonts.poppins(),
            decoration: const InputDecoration(labelText: "Description"),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              NeumorphicContainer(
                padding: EdgeInsets.zero,
                borderRadius: 12,
                child: IconButton(
                  onPressed: _pickImage,
                  icon: const Icon(Icons.camera_alt, color: AppTheme.primaryNavy),
                ),
              ),
              const SizedBox(width: 12),
              if (_imageFile != null) 
                Expanded(child: Text("Image selected", style: GoogleFonts.poppins(fontSize: 12)))
            ],
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _isLoading ? null : _submit,
            child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("Save Expense"),
          ),
        ],
      ),
    );
  }
}
