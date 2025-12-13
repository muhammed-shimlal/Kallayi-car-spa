import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:kallayi_car_spa/main.dart';
import 'package:kallayi_car_spa/providers/user_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('App loads and shows Login Screen', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => UserProvider()),
        ],
        child: const KallayiCarSpaApp(),
      ),
    );

    // Verify that the Login Screen title is present.
    // expect(find.text('Kallayi Car Spa'), findsOneWidget); // Replaced by Logo
    expect(find.text('Login'), findsOneWidget);

    // Verify text fields are present
    expect(find.text('Username'), findsOneWidget); // HintText
    expect(find.text('Password'), findsOneWidget);

    // Verify Sign Up button
    expect(find.text("Don't have an account? Sign Up"), findsOneWidget);
    
    // Tap to navigate to signup
    await tester.tap(find.text("Don't have an account? Sign Up"));
    await tester.pumpAndSettle();
    
    // Verify Signup Screen
    expect(find.text("Create Account"), findsOneWidget);
    expect(find.text("Sign Up"), findsOneWidget);
  });
}
