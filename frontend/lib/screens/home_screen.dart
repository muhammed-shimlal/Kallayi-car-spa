import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../providers/user_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _apiService = ApiService();
  late Future<List<Vehicle>> _vehiclesFuture;

  @override
  void initState() {
    super.initState();
    _vehiclesFuture = _apiService.getVehicles();
  }

  @override
  Widget build(BuildContext context) {
    final username = Provider.of<UserProvider>(context).username ?? "User";
    
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Hello,", style: TextStyle(fontSize: 18, color: Colors.grey)),
                      Text(username, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                    ],
                  ),
                  NeumorphicContainer(
                    padding: const EdgeInsets.all(10),
                    borderRadius: 50,
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pushNamed(context, '/manager');
                      },
                      child: const Icon(Icons.admin_panel_settings_outlined),
                    ),
                  ),
                  const SizedBox(width: 10),
                  NeumorphicContainer(
                    padding: const EdgeInsets.all(10),
                    borderRadius: 50,
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pushNamed(context, '/driver');
                      },
                      child: const Icon(Icons.directions_car_filled_outlined),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30),
              _buildVehicleCarousel(),
              const SizedBox(height: 30),
              _buildStatusBar(),
              const SizedBox(height: 30),
              _buildQuickActions(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildVehicleCarousel() {
    return FutureBuilder<List<Vehicle>>(
      future: _vehiclesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        } else if (snapshot.hasError) {
          // Fallback UI for demo if backend is not reachable
          return _buildVehicleCard(Vehicle(id: 0, model: "Toyota Fortuner", plateNumber: "KL-11-AX-1234"));
        } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
           return _buildVehicleCard(Vehicle(id: 0, model: "No Vehicles", plateNumber: "Add a vehicle"));
        }

        return SizedBox(
          height: 180,
          child: PageView.builder(
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              return Padding(
                padding: const EdgeInsets.only(right: 15.0),
                child: _buildVehicleCard(snapshot.data![index]),
              );
            },
          ),
        );
      },
    );
  }

  Widget _buildVehicleCard(Vehicle vehicle) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.black,
        borderRadius: BorderRadius.circular(24),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.black87, Colors.black],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(Icons.directions_car, color: Colors.white, size: 40),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(vehicle.model, style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
              Text(vehicle.plateNumber, style: TextStyle(color: Colors.grey, fontSize: 14)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBar() {
    return NeumorphicContainer(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Loyalty Status", style: TextStyle(fontWeight: FontWeight.bold)),
              Text("4/5 Washes to Free Service", style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
          CircularProgressIndicator(value: 0.8, color: Colors.black),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      {'icon': Icons.water_drop, 'label': 'Full Wash'},
      {'icon': Icons.cleaning_services, 'label': 'Interior'},
      {'icon': Icons.local_shipping, 'label': 'Tank Refill'},
      {'icon': Icons.support_agent, 'label': 'Support'},
    ];

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: actions.map((action) => GestureDetector(
        onTap: () {
          if (action['label'] == 'Full Wash') {
            Navigator.pushNamed(context, '/booking');
          } else if (action['label'] == 'Interior') {
             Navigator.pushNamed(context, '/services');
          }
        },
        child: Column(
          children: [
            NeumorphicContainer(
              padding: const EdgeInsets.all(15),
              borderRadius: 50,
              child: Icon(action['icon'] as IconData),
            ),
            const SizedBox(height: 10),
            Text(action['label'] as String, style: TextStyle(fontSize: 12)),
          ],
        ),
      )).toList(),
    );
  }
}
