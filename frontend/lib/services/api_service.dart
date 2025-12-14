import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';

class ApiService {
  // Use 10.0.2.2 for Android Emulator, or your Local IP for physical device
  static const String baseUrl = 'http://192.168.1.6:8001'; 
  
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
    final url = Uri.parse('$baseUrl/api/register/'); 
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
    final url = Uri.parse('$baseUrl/api/core/users/me/');
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
    final url = Uri.parse('$baseUrl/api/service-packages/');
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
    final url = Uri.parse('$baseUrl/api/driver-jobs/?technician_id=$userId');
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
    final url = Uri.parse('$baseUrl/api/driver-jobs/$bookingId/update_status/');
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
    // Note: Backend endpoint might differ, adjusting to query logic
    final url = Uri.parse('$baseUrl/api/bookings/available_slots/?date=$date&service_package_id=$packageId');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body); 
      // If backend returns list directly or object
      if (data is List) return List<String>.from(data);
      if (data is Map && data.containsKey('slots')) return List<String>.from(data['slots']);
      return [];
    } else {
      throw Exception('Failed to load slots');
    }
  }

  // Get My Active Booking
  Future<Booking?> getMyActiveBooking(int userId) async {
    // Fetch bookings for this user with status PENDING or IN_PROGRESS
    // If backend doesn't have a specific endpoint, filter the list
    try {
        // Option 1: Filter from all bookings (inefficient if many, but ok for MVP)
        // Option 2: Use query param ?customer=ID&status=ACTIVE (if supported)
        
        // Let's rely on getting all bookings and filtering client side for now to ensure robustness
        final url = Uri.parse('$baseUrl/api/bookings/?customer=$userId');
        final headers = await _getHeaders();
        final response = await http.get(url, headers: headers);
        
        if (response.statusCode == 200) {
            final List<dynamic> data = jsonDecode(response.body);
            final bookings = data.map((json) => Booking.fromJson(json)).toList();
            
            // Find first active
            try {
                return bookings.firstWhere((b) => b.status == 'PENDING' || b.status == 'IN_PROGRESS');
            } catch (e) {
                return null;
            }
        }
    } catch (e) {
        print("Error fetching active booking: $e");
    }
    return null;
  }
  
  // Create Booking
  Future<String?> createBooking(int userId, int vehicleId, int packageId, DateTime timeSlot, String address, {int pointsRedeemed = 0}) async {
     final url = Uri.parse('$baseUrl/api/bookings/');
     final headers = await _getHeaders();
     final body = {
       'customer': userId,
       'vehicle': vehicleId,
       'service_package': packageId,
       'time_slot': timeSlot.toIso8601String(),
       'address': address,
       'points_redeemed': pointsRedeemed
     };
     
     final response = await http.post(url, headers: headers, body: jsonEncode(body));
     if (response.statusCode == 201) {
       return null; // Success
     } else {
       return 'Failed: ${response.body}';
     }
  }

  // --- GROWTH & RETENTION ---

  // Get Subscription Plans
  Future<List<SubscriptionPlan>> getSubscriptionPlans() async {
    final url = Uri.parse('$baseUrl/api/subscription-plans/');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      // Assuming SubscriptionPlan model exists or we map manually
      // We'll trust models/models.dart or dynamic
      // Let's assume generic for now if model not updated with all fields
      return data.map((json) => SubscriptionPlan(
        id: json['id'],
        name: json['name'],
        price: double.parse(json['price'].toString()),
        description: json['description'] ?? '',
        intervalDays: json['interval_days'] ?? 30
      )).toList();
    } else {
      throw Exception('Failed to load plans');
    }
  }

  // Purchase Plan
  Future<Map<String, dynamic>> purchaseSubscriptionPlan(int planId) async {
    final url = Uri.parse('$baseUrl/api/subscription-plans/$planId/purchase_plan/');
    final headers = await _getHeaders();
    final response = await http.post(url, headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to purchase plan: ${response.body}');
    }
  }

  // Submit Review
  Future<void> submitReview(int bookingId, int rating, String comment) async {
    final url = Uri.parse('$baseUrl/api/reviews/');
    final headers = await _getHeaders();
    final body = {
      'booking': bookingId,
      'rating': rating,
      'comment': comment
    };
    
    final response = await http.post(url, headers: headers, body: jsonEncode(body));
     if (response.statusCode != 201) {
      throw Exception('Failed to submit review: ${response.body}');
    }
  }
  
  // Get Bookings Pending Review
  Future<List<Booking>> getPendingReviewBookings(int userId) async {
    // Ideally backend filters. For now fetch all, filter COMPLETED
    // We don't know if they have reviews. 
    // Let's assume we return latest COMPLETED job and let frontend show modal (and handle duplicate review error gracefully or check local storage)
    // Real implementation needs backend support: /api/bookings/?status=COMPLETED&review__isnull=True
    
    final url = Uri.parse('$baseUrl/api/bookings/?customer=$userId&status=COMPLETED');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
       final List<dynamic> data = jsonDecode(response.body);
       return data.map((json) => Booking.fromJson(json)).toList();
    }
    return [];
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

  // Get Invoice By ID
  Future<Map<String, dynamic>> getInvoiceById(int invoiceId) async {
    final url = Uri.parse('$baseUrl/api/finance/invoices/$invoiceId/');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
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

  // Dashboard Stats (Owner)
  Future<Map<String, dynamic>> getDashboardStats() async {
    final url = Uri.parse('$baseUrl/api/finance/dashboard/kpi_summary/');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load dashboard stats');
    }
  }

  // Get Expense Categories
  Future<List<dynamic>> getExpenseCategories() async {
    final url = Uri.parse('$baseUrl/api/finance/expense-categories/');
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      // Return empty if failed or not vital
      return [];
    }
  }

  // Get Recent Expenses
  Future<List<dynamic>> getRecentExpenses() async {
    final url = Uri.parse('$baseUrl/api/finance/general-expenses/?limit=5&ordering=-date');
    // Note: To support limit/ordering, backend ViewSet needs 'ordering_fields' or custom queryset. 
    // Standard ModelViewSet supports ordering if configured. 
    // For MVP, if backend doesn't support pagination/ordering params yet, we just get all and slice in frontend or standard list.
    // Let's assume standard list for now, or just get all.
    final headers = await _getHeaders();
    final response = await http.get(url, headers: headers);
    
    if (response.statusCode == 200) {
      // If pagination is on, result might be { count: ..., results: [...] }
      // Django Rest Framework default does pagination.
      final data = jsonDecode(response.body);
      if (data is Map && data.containsKey('results')) {
        return data['results'];
      } else if (data is List) {
        return data; 
      }
      return [];
    } else {
      throw Exception('Failed to load expenses');
    }
  }

  // Add General Expense (Multipart for Image)
  Future<void> addGeneralExpense(String description, double amount, int? categoryId, DateTime date, String? imagePath) async {
    final url = Uri.parse('$baseUrl/api/finance/general-expenses/');
    final request = http.MultipartRequest('POST', url);
    
    // Auto-Header logic not usable with MultipartRequest directly in some flows, need to add manually
    // But since _getHeaders returns a Map, we can iterate.
    final tokenHeaders = await _getHeaders();
    request.headers.addAll(tokenHeaders);

    request.fields['description'] = description;
    request.fields['amount'] = amount.toString();
    request.fields['date'] = date.toIso8601String().split('T')[0];
    if (categoryId != null) {
      request.fields['category'] = categoryId.toString();
    }

    if (imagePath != null) {
      request.files.add(await http.MultipartFile.fromPath('receipt_image', imagePath));
    }

    final streamResponse = await request.send();
    final response = await http.Response.fromStream(streamResponse);

    if (response.statusCode != 201) {
      throw Exception('Failed to add expense: ${response.body}');
    }
  }
  
  // Get Payroll Stats (Owner view of staff)
  // Reusing or adapting existing endpoint if available, but assuming new logic or mock for now as backend task didn't specify new payroll endpoint
  // We can use staff dashboard or list staff.
  // Let's implement getting all staff to show performance
  Future<List<dynamic>> getStaffPerformance() async {
     // Assuming we have an endpoint or we filter profiles
     final url = Uri.parse('$baseUrl/api/staff/profiles/');
     final headers = await _getHeaders();
     final response = await http.get(url, headers: headers);
     
     if (response.statusCode == 200) {
       return jsonDecode(response.body);
     }
     return [];
  }

  // Complete Job with Photo
  Future<void> completeJob(int bookingId, String imagePath) async {
    final url = Uri.parse('$baseUrl/api/driver-jobs/$bookingId/complete_job/'); 
    // We might need a custom action on ViewSet or just update status + upload photo. 
    // Assuming a dedicated endpoint for completeness or standard update via multipart.
    // Let's assume the ViewSet has an action `complete_job` or we just patch.
    // Given the complexity of multipart + Json, usually better to confirm endpoint design.
    // Proposed: POST /api/driver_bookings/{id}/complete_job/
    
    final request = http.MultipartRequest('POST', url);
    final tokenHeaders = await _getHeaders();
    request.headers.addAll(tokenHeaders);

    request.fields['status'] = 'COMPLETED';
    request.files.add(await http.MultipartFile.fromPath('inspection_photo', imagePath));

    final streamResponse = await request.send();
    final response = await http.Response.fromStream(streamResponse);

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to complete job: ${response.body}');
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

  // POST generic
  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders();
    
    final response = await http.post(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isNotEmpty) {
        return jsonDecode(response.body);
      }
      return null;
    } else {
      throw Exception('POST $endpoint failed: ${response.statusCode}');
    }
  }


  // --- FLEET MANAGEMENT ---
  
  // Get Service Vehicles
  Future<List<dynamic>> getServiceVehicles() async {
    return await get('/api/fleet/vehicles/');
  }

  // Get Technician Locations (Manager Map)
  Future<List<dynamic>> getAllTechnicianLocations() async {
    return await get('/api/locations/');
  }

  // Log Fleet Expense (Driver)
  Future<void> logFleetExpense(int vehicleId, String type, double amount, int odometer, String? imagePath, String notes) async {
    final url = Uri.parse('$baseUrl/api/fleet/logs/');
    final request = http.MultipartRequest('POST', url);
    final headers = await _getHeaders();
    request.headers.addAll(headers);

    request.fields['vehicle'] = vehicleId.toString();
    request.fields['log_type'] = type;
    request.fields['amount'] = amount.toString();
    request.fields['odometer'] = odometer.toString();
    request.fields['notes'] = notes;

    if (imagePath != null) {
      request.files.add(await http.MultipartFile.fromPath('receipt_photo', imagePath));
    }

    final streamResponse = await request.send();
    final response = await http.Response.fromStream(streamResponse);

    if (response.statusCode != 201) {
      throw Exception('Failed to log fleet expense: ${response.body}');
    }
  }
  // --- REPORTING ---

  Future<Map<String, dynamic>> getTaxSummary(DateTime start, DateTime end) async {
    final startStr = DateFormat('yyyy-MM-dd').format(start);
    final endStr = DateFormat('yyyy-MM-dd').format(end);
    return await get('/api/finance/reports/tax_summary/?start=$startStr&end=$endStr');
  }

  Future<List<dynamic>> getMonthlyTrends() async {
    // Requires DashboardViewSet action 'monthly_trends'
    return await get('/api/finance/dashboard/monthly_trends/');
  }

  String getLedgerDownloadUrl(DateTime start, DateTime end) {
    final startStr = DateFormat('yyyy-MM-dd').format(start);
    final endStr = DateFormat('yyyy-MM-dd').format(end);
    return '$baseUrl/api/finance/reports/export_ledger/?start=$startStr&end=$endStr';
  }

  String getExpensesDownloadUrl(DateTime start, DateTime end) {
    final startStr = DateFormat('yyyy-MM-dd').format(start);
    final endStr = DateFormat('yyyy-MM-dd').format(end);
    return '$baseUrl/api/finance/reports/export_expenses/?start=$startStr&end=$endStr';
  }
}
