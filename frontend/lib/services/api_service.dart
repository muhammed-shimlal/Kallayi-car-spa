import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart'; // Keep for other prefs if needed
import '../models/models.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator to access host localhost
  static const String baseUrl = 'http://10.0.2.2:8001'; 
  
  static const String _tokenKey = 'auth_token';
  final _storage = const FlutterSecureStorage();

  // Helper to get headers with token
  Future<Map<String, String>> _getHeaders({String? overrideToken}) async {
    final token = overrideToken ?? await _storage.read(key: _tokenKey);
    
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Token $token',
    };
  }

  // Login
  Future<Map<String, dynamic>> login(String username, String password) async {
    final url = Uri.parse('$baseUrl/api/api-token-auth/');
    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data.containsKey('token')) {
          // Save token to secure storage
          await _storage.write(key: _tokenKey, value: data['token']);
          return data;
        }
      }
      throw Exception('Login failed: ${response.statusCode} - ${response.body}');
    } catch (e) {
      throw Exception('Connection error: $e');
    }
  }

  // Register
  Future<Map<String, dynamic>> register(String username, String email, String password) async {
    final url = Uri.parse('$baseUrl/api/users/register/'); 
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username,
        'email': email,
        'password': password,
        'role': 'CUSTOMER'
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
       return jsonDecode(response.body);
    } else {
      throw Exception('Registration failed: ${response.body}');
    }
  }

  // User Profile
  Future<Map<String, dynamic>> getUserProfile(String token) async {
    final url = Uri.parse('$baseUrl/api/users/me/');
    final headers = await _getHeaders(overrideToken: token);
    
    final response = await http.get(url, headers: headers);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load profile');
    }
  }

  // Get Vehicles
  Future<List<Vehicle>> getVehicles() async {
    final url = Uri.parse('$baseUrl/api/vehicles/');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Vehicle.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load vehicles');
    }
  }

  // Get Service Packages
  Future<List<ServicePackage>> getServicePackages() async {
    final url = Uri.parse('$baseUrl/api/service_packages/'); // Assuming endpoint
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => ServicePackage.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load service packages');
    }
  }

  // Driver Jobs
  Future<List<Booking>> getDriverJobs(int userId) async {
    final url = Uri.parse('$baseUrl/api/driver_bookings/?technician_id=$userId');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Booking.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load driver jobs');
    }
  }

  // Calendar Bookings
  Future<List<Booking>> getCalendarBookings(DateTime start, DateTime end) async {
    final startStr = start.toIso8601String().split('T')[0];
    final endStr = end.toIso8601String().split('T')[0];
    final url = Uri.parse('$baseUrl/api/bookings/?start_date=$startStr&end_date=$endStr');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => Booking.fromJson(json)).toList();
    } else {
      throw Exception('Failed to load calendar bookings');
    }
  }

  // Update Job Status
  Future<void> updateJobStatus(int bookingId, String status) async {
    final url = Uri.parse('$baseUrl/api/driver_bookings/$bookingId/update_status/');
    final headers = await _getHeaders();
    final response = await http.post(
       url, 
       headers: headers, 
       body: jsonEncode({'status': status})
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to update status: ${response.body}');
    }
  }

  // Location Update
  Future<void> updateLocation(int userId, double lat, double lng) async {
     final url = Uri.parse('$baseUrl/api/staff/$userId/update_location/');
     final headers = await _getHeaders();
     final response = await http.post(
       url,
       headers: headers,
       body: jsonEncode({'latitude': lat, 'longitude': lng})
     );
     
     if (response.statusCode != 200) {
        print("Location update failed: ${response.statusCode}");
     }
  }

  // Technician Location (Manager View)
  Future<Map<String, dynamic>?> getTechnicianLocation(int technicianId) async {
    final url = Uri.parse('$baseUrl/api/staff/$technicianId/location/'); 
    // Assuming backend endpoint exists or we use staff profile
    final headers = await _getHeaders();
    
    // Safety check: if backend returns profile with location in generic GET
    final response = await http.get(Uri.parse('$baseUrl/api/staff/$technicianId/'), headers: headers);
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      // Assuming fields 'current_latitude', 'current_longitude' based on staff/models.py
      if (data['current_latitude'] != null) {
        return {
          'latitude': data['current_latitude'],
          'longitude': data['current_longitude'],
          'last_updated': data['last_location_update']
        };
      }
    }
    return null;
  }

  // Clock In
  Future<void> clockIn(String token, String location) async {
    final url = Uri.parse('$baseUrl/api/staff/clock_in/');
    final headers = await _getHeaders(overrideToken: token);
    final response = await http.post(
      url, 
      headers: headers,
      body: jsonEncode({'location': location})
    );
     if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Clock in failed: ${response.body}');
    }
  }

  // Clock Out
  Future<void> clockOut(String token, String location) async {
    final url = Uri.parse('$baseUrl/api/staff/clock_out/');
    final headers = await _getHeaders(overrideToken: token);
    final response = await http.post(
      url, 
      headers: headers,
      body: jsonEncode({'location': location})
    );
     if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception('Clock out failed: ${response.body}');
    }
  }

  // Available Slots
  Future<List<String>> getAvailableSlots(String date, int packageId) async {
    final url = Uri.parse('$baseUrl/api/bookings/available_slots/?date=$date&service_package_id=$packageId');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body); 
      return List<String>.from(data['slots']);
    } else {
      throw Exception('Failed to load slots');
    }
  }
  
  // Create Booking
  Future<String?> createBooking(int userId, int vehicleId, int packageId, DateTime timeSlot, String address) async {
     final url = Uri.parse('$baseUrl/api/bookings/');
     final headers = await _getHeaders();
     final body = {
       'customer': userId,
       'vehicle': vehicleId,
       'service_package': packageId,
       'time_slot': timeSlot.toIso8601String(),
       'address': address
     };
     
     final response = await http.post(url, headers: headers, body: jsonEncode(body));
     if (response.statusCode == 201) {
       return null; // Success
     } else {
       return 'Failed: ${response.body}';
     }
  }

  // Get Invoice
  Future<Map<String, dynamic>> getInvoice(int bookingId) async {
    final url = Uri.parse('$baseUrl/api/finance/invoices/?booking=$bookingId');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      if (data.isNotEmpty) {
        return data.first;
      }
      throw Exception("Invoice not found");
    } else {
      throw Exception('Failed to load invoice');
    }
  }

  // Pay Invoice
  Future<void> payInvoice(int invoiceId, String method) async {
    final headers = await _getHeaders();
    final response = await http.patch(
      Uri.parse('$baseUrl/api/finance/invoices/$invoiceId/'),
      headers: headers,
      body: jsonEncode({'is_paid': true, 'payment_method': method})
    );

    if (response.statusCode != 200) {
      throw Exception('Payment failed');
    }
  }

  // GET generic 
  Future<dynamic> get(String endpoint) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();
    
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      throw Exception('GET $endpoint failed: ${response.statusCode}');
    }
  }
}
