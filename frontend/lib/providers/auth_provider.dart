import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  String? _token;
  final ApiService _apiService = ApiService();
  final _storage = const FlutterSecureStorage();

  bool get isAuthenticated => _isAuthenticated;

  Future<void> checkAuthStatus() async {
    final token = await _storage.read(key: 'auth_token');
    if (token != null) {
      _isAuthenticated = true;
      _token = token;
      notifyListeners();
    }
  }

  Future<void> login(String username, String password) async {
    try {
      final data = await _apiService.login(username, password);
      // ApiService handles storage now? Or should we handle it here?
      // Looking at ApiService code, IT saves the token.
      // We should coordinate. Best practice: Service returns token, Provider saves it.
      // But currently ApiService saves it. I should verify ApiService change.
      // If ApiService saves to secure storage, we just read it or use the returned data.
      // ApiService `login` returns data map. 
      
      if (data.containsKey('token')) {
        _isAuthenticated = true;
        _token = data['token'];
        // Ensure it's saved (ApiService calls below will update to secure storage too)
        notifyListeners();
      }
    } catch (e) {
      throw e;
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'auth_token');
    _isAuthenticated = false;
    _token = null;
    notifyListeners();
  }
}
