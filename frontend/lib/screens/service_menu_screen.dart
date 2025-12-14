import 'package:flutter/material.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class ServiceMenuScreen extends StatefulWidget {
  const ServiceMenuScreen({super.key});

  @override
  State<ServiceMenuScreen> createState() => _ServiceMenuScreenState();
}

class _ServiceMenuScreenState extends State<ServiceMenuScreen> {
  final ApiService _apiService = ApiService();
  late Future<List<ServicePackage>> _packagesFuture;

  @override
  void initState() {
    super.initState();
    _packagesFuture = _apiService.getServicePackages();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Services"), backgroundColor: Colors.transparent, elevation: 0),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLiveTracker(),
            const SizedBox(height: 30),
            Text("Select Package", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            _buildPackageSelector(),
          ],
        ),
      ),
    );
  }

  Widget _buildLiveTracker() {
    return NeumorphicContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text("Live Status", style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _buildStep("Queued", true),
              _buildLine(true),
              _buildStep("Washing", true),
              _buildLine(false),
              _buildStep("Drying", false),
              _buildLine(false),
              _buildStep("Ready", false),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStep(String label, bool isActive) {
    return Column(
      children: [
        Icon(Icons.check_circle, color: isActive ? Colors.black : Colors.grey.shade300),
        const SizedBox(height: 5),
        Text(label, style: TextStyle(fontSize: 10, color: isActive ? Colors.black : Colors.grey)),
      ],
    );
  }

  Widget _buildLine(bool isActive) {
    return Expanded(
      child: Container(
        height: 2,
        color: isActive ? Colors.black : Colors.grey.shade300,
      ),
    );
  }

  Widget _buildPackageSelector() {
    return FutureBuilder<List<ServicePackage>>(
      future: _packagesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          // Fallback
          return _buildPackageGrid([
            ServicePackage(id: 1, name: "Premium", price: 50.0, description: "Full service"),
            ServicePackage(id: 2, name: "Standard", price: 30.0, description: "Exterior only"),
          ]);
        }

        return _buildPackageGrid(snapshot.data ?? []);
      },
    );
  }

  Widget _buildPackageGrid(List<ServicePackage> packages) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 15,
        mainAxisSpacing: 15,
        childAspectRatio: 0.8,
      ),
      itemCount: packages.length,
      itemBuilder: (context, index) {
        final pkg = packages[index];
        return NeumorphicContainer(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(pkg.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 10),
              Text("\$${pkg.price}", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 10),
              Text(pkg.description, textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        );
      },
    );
  }
}
