import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  final ApiService _apiService = ApiService();
  
  DateTime _startDate = DateTime.now().subtract(const Duration(days: 30));
  DateTime _endDate = DateTime.now();
  
  Map<String, dynamic>? _taxSummary;
  List<dynamic>? _monthlyTrends;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  void _fetchData() async {
    setState(() => _isLoading = true);
    try {
      final tax = await _apiService.getTaxSummary(_startDate, _endDate);
      final trends = await _apiService.getMonthlyTrends();
      
      if (mounted) {
        setState(() {
          _taxSummary = tax;
          _monthlyTrends = trends;
        });
      }
    } catch (e) {
      debugPrint("Error loading reports: $e");
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _selectDateRange(BuildContext context) async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2023),
      lastDate: DateTime.now(),
      initialDateRange: DateTimeRange(start: _startDate, end: _endDate),
      builder: (context, child) {
        return Theme(
           data: AppTheme.lightTheme.copyWith(
            colorScheme: const ColorScheme.light(primary: AppTheme.primaryNavy),
           ),
           child: child!
        );
      }
    );
    
    if (picked != null) {
      setState(() {
        _startDate = picked.start;
        _endDate = picked.end;
      });
      _fetchData(); // Refresh tax summary
    }
  }

  void _downloadLedger() async {
    final url = _apiService.getLedgerDownloadUrl(_startDate, _endDate);
    _launchUrl(url);
  }

  void _downloadExpenses() async {
    final url = _apiService.getExpensesDownloadUrl(_startDate, _endDate);
    _launchUrl(url);
  }

  void _launchUrl(String urlString) async {
    // Cannot use url_launcher as dependency is missing.
    // Show Snackbar to copy URL.
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text("Download Link: $urlString"),
        action: SnackBarAction(label: "Copy", onPressed: () {}),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundLight,
      appBar: AppBar(
        title: Text("Financial Reports", style: GoogleFonts.poppins(color: AppTheme.textDark, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppTheme.textDark),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchData,
          )
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator()) 
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDateSelector(),
                const SizedBox(height: 24),
                
                Text("Tax Liability (GST)", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                _buildTaxCard(),
                const SizedBox(height: 32),

                Text("Profit Trends (Last 6 Months)", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                _buildTrendChart(),
                const SizedBox(height: 32),

                Text("Data Exports", style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                _buildExportButtons(),
              ],
            ),
          ),
    );
  }

  Widget _buildDateSelector() {
    return GestureDetector(
      onTap: () => _selectDateRange(context),
      child: NeumorphicContainer(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text("Report Period", style: GoogleFonts.poppins(color: AppTheme.textGrey, fontSize: 12)),
                Text(
                  "${DateFormat('MMM d').format(_startDate)} - ${DateFormat('MMM d, yyyy').format(_endDate)}",
                  style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16)
                ),
              ],
            ),
            const Icon(Icons.date_range, color: AppTheme.primaryNavy),
          ],
        ),
      ),
    );
  }

  Widget _buildTaxCard() {
    if (_taxSummary == null) return const SizedBox();
    final tax = _taxSummary!['tax_collected'] ?? 0;
    final revenue = _taxSummary!['total_revenue'] ?? 0;
    
    return NeumorphicContainer(
      child: Column(
        children: [
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               Text("Total Revenue", style: GoogleFonts.poppins(color: AppTheme.textGrey)),
               Text("₹$revenue", style: GoogleFonts.poppins(fontWeight: FontWeight.w500)),
             ],
           ),
           const Divider(height: 24),
           Row(
             mainAxisAlignment: MainAxisAlignment.spaceBetween,
             children: [
               Text("EST. GST PAYABLE", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.redAccent)),
               Text("₹$tax", style: GoogleFonts.poppins(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.redAccent)),
             ],
           ),
           const SizedBox(height: 8),
           Text("*Based on 18% GST (Tax Inclusive)", style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textGrey)),
        ],
      )
    );
  }

  Widget _buildTrendChart() {
    if (_monthlyTrends == null || _monthlyTrends!.isEmpty) {
      return const Text("No trend data available.");
    }

    return NeumorphicContainer(
      padding: const EdgeInsets.all(16),
      child: SizedBox(
        height: 250,
        child: BarChart(
          BarChartData(
            alignment: BarChartAlignment.spaceAround,
            maxY: _getMaxValue() * 1.2, // Add 20% padding
            barTouchData: BarTouchData(
              enabled: true,
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  final month = _monthlyTrends![groupIndex]['month'];
                  final value = rod.toY.toInt();
                  final label = rodIndex == 0 ? 'Expense' : 'Income';
                  return BarTooltipItem(
                    '$month\n$label: ₹$value',
                    GoogleFonts.poppins(color: Colors.white, fontSize: 12),
                  );
                },
              ),
            ),
            titlesData: FlTitlesData(
              show: true,
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  getTitlesWidget: (value, meta) {
                    if (value.toInt() >= 0 && value.toInt() < _monthlyTrends!.length) {
                      final month = _monthlyTrends![value.toInt()]['month'];
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(
                          month,
                          style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textGrey),
                        ),
                      );
                    }
                    return const SizedBox();
                  },
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 50,
                  getTitlesWidget: (value, meta) {
                    return Text(
                      '₹${(value / 1000).toStringAsFixed(0)}k',
                      style: GoogleFonts.poppins(fontSize: 10, color: AppTheme.textGrey),
                    );
                  },
                ),
              ),
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
            ),
            gridData: const FlGridData(show: true, drawVerticalLine: false),
            borderData: FlBorderData(show: false),
            barGroups: _buildBarGroups(),
          ),
        ),
      ),
    );
  }

  double _getMaxValue() {
    double max = 100;
    for (var item in _monthlyTrends!) {
      final income = (item['income'] ?? 0).toDouble();
      final expense = (item['expense'] ?? 0).toDouble();
      if (income > max) max = income;
      if (expense > max) max = expense;
    }
    return max;
  }

  List<BarChartGroupData> _buildBarGroups() {
    return List.generate(_monthlyTrends!.length, (index) {
      final item = _monthlyTrends![index];
      final expense = (item['expense'] ?? 0).toDouble();
      final income = (item['income'] ?? 0).toDouble();

      return BarChartGroupData(
        x: index,
        barRods: [
          BarChartRodData(
            toY: expense,
            color: Colors.redAccent,
            width: 12,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
          ),
          BarChartRodData(
            toY: income,
            color: Colors.green,
            width: 12,
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(4),
              topRight: Radius.circular(4),
            ),
          ),
        ],
      );
    });
  }

  Widget _bar(double height, Color color) {
    if (height < 2) height = 2;
    return Container(
      width: 12,
      height: height,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4)
      ),
    );
  }

  Widget _buildExportButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.download),
            label: const Text("Sales CSV"),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryNavy),
            onPressed: _downloadLedger,
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.receipt_long),
            label: const Text("Expenses CSV"),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.blueGrey),
            onPressed: _downloadExpenses,
          ),
        ),
      ],
    );
  }
}
