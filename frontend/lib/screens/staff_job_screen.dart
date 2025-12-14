import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../theme.dart';
import '../widgets/neumorphic_container.dart';

class StaffJobScreen extends StatefulWidget {
  final Map<String, dynamic> booking;
  const StaffJobScreen({super.key, required this.booking});

  @override
  State<StaffJobScreen> createState() => _StaffJobScreenState();
}

class _StaffJobScreenState extends State<StaffJobScreen> {
  final ApiService _apiService = ApiService();
  final ImagePicker _picker = ImagePicker();
  File? _inspectionPhoto;
  bool _isSubmitting = false;

  // Mock SOP Checklist - fully dynamic would require backend SOP Item model
  // Using Service Description or static items for now based on Service Name
  late List<Map<String, dynamic>> _checklist;

  @override
  void initState() {
    super.initState();
    _checklist = [
      {'title': 'Inspect Vehicle Body', 'checked': false},
      {'title': 'Check Tire Pressure', 'checked': false},
      {'title': 'Vacuum Interior', 'checked': false},
      {'title': 'Clean Windows', 'checked': false},
      {'title': 'Final Polish', 'checked': false},
    ];
  }

  bool get _canComplete => _checklist.every((item) => item['checked']) && _inspectionPhoto != null;

  Future<void> _pickImage() async {
    final XFile? picked = await _picker.pickImage(source: ImageSource.camera);
    if (picked != null) {
      // Typically we'd compress here
      setState(() => _inspectionPhoto = File(picked.path));
    }
  }

  Future<void> _completeJob() async {
    if (!_canComplete) return;
    setState(() => _isSubmitting = true);
    try {
      // API call to complete job (POST photo + status update)
      // For now, we'll assume a specific endpoint or just update status + Generic Photo upload endpoint
      // Implementation Plan mentions `completeJob` in ApiService
      await _apiService.completeJob(widget.booking['id'], _inspectionPhoto!.path);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Job Completed Successfully!")));
        Navigator.pop(context, true); // Return true to refresh refresh list
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final serviceDetails = widget.booking['service_package_details'] ?? {};
    final recipe = serviceDetails['chemical_recipe'] as Map<String, dynamic>? ?? {};

    return Scaffold(
      appBar: AppBar(
        title: Text("Job Card #${widget.booking['id']}", style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildHeader(serviceDetails),
            const SizedBox(height: 20),
            if (recipe.isNotEmpty) ...[
              _buildChemicalCard(recipe),
              const SizedBox(height: 20),
            ],
            _buildSOPList(),
            const SizedBox(height: 20),
            _buildInspectionSection(),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: _canComplete && !_isSubmitting ? _completeJob : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryNavy,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSubmitting 
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text("COMPLETE JOB", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> details) {
    return NeumorphicContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(widget.booking['vehicle_info'] ?? 'Unknown Vehicle', style: GoogleFonts.outfit(fontSize: 24, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(details['name'] ?? 'Service', style: GoogleFonts.outfit(fontSize: 18, color: AppTheme.primaryNavy)),
          const SizedBox(height: 8),
          Text(details['description'] ?? '', style: GoogleFonts.outfit(color: Colors.grey.shade600)),
        ],
      ),
    );
  }

  Widget _buildChemicalCard(Map<String, dynamic> recipe) {
    return Card(
      color: Colors.blue.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.science, color: Colors.blue),
                const SizedBox(width: 8),
                Text("Chemical Recipe", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 16)),
              ],
            ),
            const Divider(),
            ...recipe.entries.map((e) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(e.key.toString().toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w500)),
                  Text(e.value.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildSOPList() {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text("SOP Checklist", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
          ),
          ..._checklist.map((item) => CheckboxListTile(
            title: Text(item['title']),
            value: item['checked'],
            onChanged: (bool? val) {
              setState(() => item['checked'] = val);
            },
          )),
        ],
      ),
    );
  }

  Widget _buildInspectionSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text("Quality Control", style: GoogleFonts.outfit(fontWeight: FontWeight.bold, fontSize: 18)),
        const SizedBox(height: 12),
        InkWell(
          onTap: _pickImage,
          child: Container(
            height: 150,
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid),
              image: _inspectionPhoto != null 
                  ? DecorationImage(image: FileImage(_inspectionPhoto!), fit: BoxFit.cover)
                  : null,
            ),
            child: _inspectionPhoto == null 
                ? const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt, size: 40, color: Colors.grey),
                      Text("Tap to Upload Job Photo"),
                    ],
                  )
                : null,
          ),
        ),
      ],
    );
  }
}
