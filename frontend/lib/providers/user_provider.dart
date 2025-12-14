import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class UserProvider with ChangeNotifier {
  int? _userId;
  String? _username;
  String? _role; // 'customer', 'driver', 'manager'
  String? _token;

  int? get userId => _userId;
  String? get username => _username;
  String? get role => _role;
  String? get token => _token;

  bool get isLoggedIn => _token != null;

  Future<void> login(int id, String username, String role, String token) async {
    _userId = id;
    _username = username;
    _role = role;
    _token = token;

    // Fetch full profile to get role
    try {
      final profile = await ApiService().getUserProfile(token);
      _role = profile['role']; 
      // If role is null or UNKNOWN, default to customer?
      if (_role == 'UNKNOWN' || _role == null) _role = 'CUSTOMER';
    } catch (e) {
      print("Error fetching profile: $e");
      _role = 'CUSTOMER'; // Default fall back
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('userId', id);
    await prefs.setString('username', username);
    await prefs.setString('role', _role ?? 'CUSTOMER');
    await prefs.setString('token', token);

    notifyListeners();
  }

  Future<void> logout() async {
    _userId = null;
    _username = null;
    _role = null;
    _token = null;

    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();

    notifyListeners();
  }

  Future<void> loadUserData() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getInt('userId');
    _username = prefs.getString('username');
    _role = prefs.getString('role');
    _token = prefs.getString('token');
    notifyListeners();
  }
}
