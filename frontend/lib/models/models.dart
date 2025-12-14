class Customer {
  final int id;
  final String username;
  final String email;
  final String phoneNumber;
  final int loyaltyPoints;

  Customer({
    required this.id,
    required this.username,
    required this.email,
    required this.phoneNumber,
    required this.loyaltyPoints,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'],
      username: json['user']['username'],
      email: json['user']['email'],
      phoneNumber: json['phone_number'] ?? '',
      loyaltyPoints: json['loyalty_points'] ?? 0,
    );
  }
}

class Vehicle {
  final int id;
  final String model;
  final String plateNumber;
  final String? lastWashDate;

  Vehicle({
    required this.id,
    required this.model,
    required this.plateNumber,
    this.lastWashDate,
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'],
      model: json['model'],
      plateNumber: json['plate_number'],
      lastWashDate: json['last_wash_date'],
    );
  }
}

class ServicePackage {
  final int id;
  final String name;
  final double price;
  final String description;
  final int durationMinutes;

  ServicePackage({
    required this.id,
    required this.name,
    required this.price,
    required this.description,
    required this.durationMinutes,
  });

  factory ServicePackage.fromJson(Map<String, dynamic> json) {
    return ServicePackage(
      id: json['id'],
      name: json['name'],
      price: double.parse(json['price'].toString()),
      description: json['description'],
      durationMinutes: json['duration_minutes'] ?? 60,
    );
  }
}

class Booking {
  final int id;
  final int customerId;
  final int vehicleId;
  final DateTime timeSlot;
  final DateTime? endTime;
  final String status;
  final String address;
  final double latitude;
  final double longitude;

  Booking({
    required this.id,
    required this.customerId,
    required this.vehicleId,
    required this.timeSlot,
    this.endTime,
    required this.status,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'],
      customerId: json['customer'],
      vehicleId: json['vehicle'],
      timeSlot: DateTime.parse(json['time_slot']),
      endTime: json['end_time'] != null ? DateTime.parse(json['end_time']) : null,
      status: json['status'],
      address: json['address'] ?? "123 Main St",
      latitude: json['latitude'] ?? 0.0,
      longitude: json['longitude'] ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer': customerId,
      'vehicle': vehicleId,
      'time_slot': timeSlot.toIso8601String(),
      'end_time': endTime?.toIso8601String(),
      'status': status,
      'address': address,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class SubscriptionPlan {
  final int id;
  final String name;
  final double price;
  final String description;
  final int intervalDays;

  SubscriptionPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.description,
    required this.intervalDays,
  });
}
