/**
 * KALLAYI CAR SPA & AUTO CARE - INDIAN MASTER VEHICLE CATALOG
 * Comprehensive vehicle database covering major Indian brands and models
 * with auto body-type resolution matching database VehicleType enum.
 */

import { VehicleType } from '@/types/database';

export type DjangoVehicleType = VehicleType;

export interface VehicleCatalogItem {
  brand: string;
  model: string;
  category: string;
  body_type: VehicleType;
}

export const BODY_TYPE_OPTIONS: { label: string; value: VehicleType; icon: string }[] = [
  { label: "Hatchback", value: "HATCHBACK", icon: "🚗" },
  { label: "Sedan", value: "SEDAN", icon: "🚘" },
  { label: "Compact SUV", value: "COMPACT_SUV", icon: "🚙" },
  { label: "Full SUV / Off-road", value: "SUV", icon: "🏔️" },
  { label: "MUV / Multi-Utility", value: "MUV", icon: "🚐" },
  { label: "Van / Commercial Van", value: "VAN", icon: "🚐" },
  { label: "Luxury / Premium", value: "LUXURY", icon: "✨" },
  { label: "Two-Wheeler (Bike / Scooter)", value: "BIKE", icon: "🏍️" },
  { label: "Auto Rickshaw (3-Wheeler)", value: "AUTO", icon: "🛺" },
  { label: "Truck / Commercial Heavy", value: "TRUCK", icon: "🚚" },
];

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  // ==========================================
  // 1. MARUTI SUZUKI
  // ==========================================
  { brand: "Maruti Suzuki", model: "Alto", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Alto K10", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "WagonR", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Swift", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Baleno", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Celerio", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Ignis", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "S-Presso", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Dzire", category: "Sedan", body_type: "SEDAN" },
  { brand: "Maruti Suzuki", model: "Ciaz", category: "Sedan", body_type: "SEDAN" },
  { brand: "Maruti Suzuki", model: "Brezza", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Maruti Suzuki", model: "Fronx", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Maruti Suzuki", model: "Grand Vitara", category: "Mid SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Jimny", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Ertiga", category: "MUV", body_type: "MUV" },
  { brand: "Maruti Suzuki", model: "XL6", category: "MUV", body_type: "MUV" },
  { brand: "Maruti Suzuki", model: "Invicto", category: "Luxury MUV", body_type: "LUXURY" },
  { brand: "Maruti Suzuki", model: "Eeco", category: "Van", body_type: "VAN" },
  { brand: "Maruti Suzuki", model: "Super Carry", category: "Commercial Mini Truck", body_type: "TRUCK" },

  // ==========================================
  // 2. HYUNDAI
  // ==========================================
  { brand: "Hyundai", model: "Grand i10", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "i10 Nios", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "i20", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "i20 N Line", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Santro", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Eon", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Verna", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Aura", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Xcent", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Exter", category: "Micro SUV", body_type: "COMPACT_SUV" },
  { brand: "Hyundai", model: "Venue", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Hyundai", model: "Venue N Line", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Hyundai", model: "Creta", category: "Mid SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Creta N Line", category: "Mid SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Alcazar", category: "Full SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Tucson", category: "Premium SUV", body_type: "LUXURY" },
  { brand: "Hyundai", model: "Ioniq 5", category: "Luxury EV SUV", body_type: "LUXURY" },
  { brand: "Hyundai", model: "Kona Electric", category: "EV SUV", body_type: "SUV" },

  // ==========================================
  // 3. TATA MOTORS
  // ==========================================
  { brand: "Tata", model: "Tiago", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Tata", model: "Tiago EV", category: "EV Hatchback", body_type: "HATCHBACK" },
  { brand: "Tata", model: "Altroz", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Tata", model: "Tigor", category: "Sedan", body_type: "SEDAN" },
  { brand: "Tata", model: "Tigor EV", category: "EV Sedan", body_type: "SEDAN" },
  { brand: "Tata", model: "Punch", category: "Micro SUV", body_type: "COMPACT_SUV" },
  { brand: "Tata", model: "Punch EV", category: "EV Micro SUV", body_type: "COMPACT_SUV" },
  { brand: "Tata", model: "Nexon", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Tata", model: "Nexon EV", category: "EV Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Tata", model: "Curvv", category: "Coupe SUV", body_type: "SUV" },
  { brand: "Tata", model: "Curvv EV", category: "EV Coupe SUV", body_type: "SUV" },
  { brand: "Tata", model: "Harrier", category: "Full SUV", body_type: "SUV" },
  { brand: "Tata", model: "Safari", category: "Full SUV", body_type: "SUV" },
  { brand: "Tata", model: "Sierra", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Tata", model: "Hexa", category: "MUV", body_type: "MUV" },
  { brand: "Tata", model: "Sumo", category: "MUV", body_type: "MUV" },
  { brand: "Tata", model: "Ace", category: "Mini Truck", body_type: "TRUCK" },
  { brand: "Tata", model: "Magic", category: "Passenger Van", body_type: "VAN" },
  { brand: "Tata", model: "Winger", category: "Van", body_type: "VAN" },
  { brand: "Tata", model: "Yodha", category: "Pickup Truck", body_type: "TRUCK" },

  // ==========================================
  // 4. MAHINDRA
  // ==========================================
  { brand: "Mahindra", model: "Thar", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Thar Roxx", category: "Off-road SUV 5-Door", body_type: "SUV" },
  { brand: "Mahindra", model: "Scorpio Classic", category: "Full SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Scorpio-N", category: "Full SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "XUV 3XO", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Mahindra", model: "XUV300", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Mahindra", model: "XUV400 EV", category: "EV SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "XUV700", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Mahindra", model: "Bolero", category: "MUV / Utility", body_type: "MUV" },
  { brand: "Mahindra", model: "Bolero Neo", category: "MUV / Compact SUV", body_type: "MUV" },
  { brand: "Mahindra", model: "Bolero Neo Plus", category: "MUV 9-Seater", body_type: "MUV" },
  { brand: "Mahindra", model: "Marazzo", category: "MUV", body_type: "MUV" },
  { brand: "Mahindra", model: "Bolero Camper", category: "Pickup Truck", body_type: "TRUCK" },
  { brand: "Mahindra", model: "Bolero Maxi Truck", category: "Pickup Truck", body_type: "TRUCK" },
  { brand: "Mahindra", model: "Jeeto", category: "Mini Truck", body_type: "TRUCK" },
  { brand: "Mahindra", model: "Supro", category: "Van", body_type: "VAN" },
  { brand: "Mahindra", model: "Treo", category: "Auto Rickshaw", body_type: "AUTO" },

  // ==========================================
  // 5. TOYOTA
  // ==========================================
  { brand: "Toyota", model: "Glanza", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Toyota", model: "Urban Cruiser Hyryder", category: "Mid SUV", body_type: "SUV" },
  { brand: "Toyota", model: "Urban Cruiser Taisor", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Toyota", model: "Rumion", category: "MUV", body_type: "MUV" },
  { brand: "Toyota", model: "Innova Crysta", category: "MUV", body_type: "MUV" },
  { brand: "Toyota", model: "Innova Hycross", category: "Luxury MUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Fortuner", category: "Full SUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Fortuner Legender", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Hilux", category: "Lifestyle Pickup Truck", body_type: "TRUCK" },
  { brand: "Toyota", model: "Camry", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Toyota", model: "Vellfire", category: "Ultra Luxury MUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Land Cruiser 300", category: "Ultra Luxury SUV", body_type: "LUXURY" },

  // ==========================================
  // 6. KIA
  // ==========================================
  { brand: "Kia", model: "Sonet", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Kia", model: "Seltos", category: "Mid SUV", body_type: "SUV" },
  { brand: "Kia", model: "Carens", category: "MUV", body_type: "MUV" },
  { brand: "Kia", model: "Carnival", category: "Luxury MUV", body_type: "LUXURY" },
  { brand: "Kia", model: "EV6", category: "Luxury EV Crossover", body_type: "LUXURY" },
  { brand: "Kia", model: "EV9", category: "Ultra Luxury EV SUV", body_type: "LUXURY" },

  // ==========================================
  // 7. HONDA
  // ==========================================
  { brand: "Honda", model: "Amaze", category: "Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "City", category: "Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "City e:HEV", category: "Hybrid Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "Civic", category: "Premium Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "Accord", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Honda", model: "Elevate", category: "Mid SUV", body_type: "SUV" },
  { brand: "Honda", model: "WR-V", category: "Compact Crossover", body_type: "COMPACT_SUV" },
  { brand: "Honda", model: "Jazz", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Honda", model: "BR-V", category: "MUV", body_type: "MUV" },
  { brand: "Honda", model: "CR-V", category: "SUV", body_type: "LUXURY" },

  // ==========================================
  // 8. VOLKSWAGEN & SKODA
  // ==========================================
  { brand: "Volkswagen", model: "Polo", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Volkswagen", model: "Virtus", category: "Sedan", body_type: "SEDAN" },
  { brand: "Volkswagen", model: "Vento", category: "Sedan", body_type: "SEDAN" },
  { brand: "Volkswagen", model: "Jetta", category: "Executive Sedan", body_type: "SEDAN" },
  { brand: "Volkswagen", model: "Passat", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Volkswagen", model: "Taigun", category: "Mid SUV", body_type: "SUV" },
  { brand: "Volkswagen", model: "Tiguan", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Skoda", model: "Fabia", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Skoda", model: "Slavia", category: "Sedan", body_type: "SEDAN" },
  { brand: "Skoda", model: "Rapid", category: "Sedan", body_type: "SEDAN" },
  { brand: "Skoda", model: "Octavia", category: "Premium Sedan", body_type: "LUXURY" },
  { brand: "Skoda", model: "Superb", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Skoda", model: "Kushaq", category: "Mid SUV", body_type: "SUV" },
  { brand: "Skoda", model: "Kodiaq", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Skoda", model: "Kylaq", category: "Compact SUV", body_type: "COMPACT_SUV" },

  // ==========================================
  // 9. MG, RENAULT, NISSAN, JEEP
  // ==========================================
  { brand: "MG", model: "Comet EV", category: "Urban EV Hatchback", body_type: "HATCHBACK" },
  { brand: "MG", model: "Astor", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "MG", model: "ZS EV", category: "EV SUV", body_type: "SUV" },
  { brand: "MG", model: "Hector", category: "Mid SUV", body_type: "SUV" },
  { brand: "MG", model: "Hector Plus", category: "Full SUV / MUV", body_type: "MUV" },
  { brand: "MG", model: "Gloster", category: "Full Luxury SUV", body_type: "LUXURY" },
  { brand: "MG", model: "Windsor EV", category: "Crossover MUV", body_type: "MUV" },
  { brand: "Renault", model: "Kwid", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Renault", model: "Triber", category: "Compact MUV", body_type: "MUV" },
  { brand: "Renault", model: "Kiger", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Renault", model: "Duster", category: "Mid SUV", body_type: "SUV" },
  { brand: "Nissan", model: "Magnite", category: "Compact SUV", body_type: "COMPACT_SUV" },
  { brand: "Nissan", model: "Kicks", category: "Mid SUV", body_type: "SUV" },
  { brand: "Nissan", model: "Sunny", category: "Sedan", body_type: "SEDAN" },
  { brand: "Nissan", model: "X-Trail", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Jeep", model: "Compass", category: "Mid SUV", body_type: "SUV" },
  { brand: "Jeep", model: "Meridian", category: "Full SUV", body_type: "LUXURY" },
  { brand: "Jeep", model: "Wrangler", category: "Off-road Luxury SUV", body_type: "LUXURY" },
  { brand: "Jeep", model: "Grand Cherokee", category: "Ultra Luxury SUV", body_type: "LUXURY" },

  // ==========================================
  // 10. LUXURY CARS (BMW, MERCEDES, AUDI, ETC)
  // ==========================================
  { brand: "Mercedes-Benz", model: "A-Class", category: "Luxury Compact", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "C-Class", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "E-Class", category: "Executive Luxury Sedan", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "S-Class", category: "Flagship Luxury Sedan", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLA", category: "Luxury Compact SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLB", category: "Luxury 7-Seater SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLC", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLE", category: "Luxury Mid SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLS", category: "Flagship Luxury SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "G-Class G-Wagon", category: "Off-road Luxury SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "EQS", category: "Ultra Luxury EV", body_type: "LUXURY" },
  { brand: "BMW", model: "2 Series Gran Coupe", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "BMW", model: "3 Series", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "BMW", model: "5 Series", category: "Executive Luxury Sedan", body_type: "LUXURY" },
  { brand: "BMW", model: "7 Series", category: "Flagship Luxury Sedan", body_type: "LUXURY" },
  { brand: "BMW", model: "X1", category: "Luxury Compact SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "X3", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "X5", category: "Luxury Mid SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "X7", category: "Flagship Luxury SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "M3 / M4 / M5", category: "High Performance Luxury", body_type: "LUXURY" },
  { brand: "BMW", model: "i4 / iX / i7", category: "Luxury EV", body_type: "LUXURY" },
  { brand: "Audi", model: "A4", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Audi", model: "A6", category: "Executive Luxury Sedan", body_type: "LUXURY" },
  { brand: "Audi", model: "A8L", category: "Flagship Luxury Sedan", body_type: "LUXURY" },
  { brand: "Audi", model: "Q3", category: "Luxury Compact SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "Q5", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "Q7", category: "Luxury 7-Seater SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "Q8", category: "Flagship Luxury Coupe SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "e-tron", category: "Luxury EV SUV", body_type: "LUXURY" },
  { brand: "Volvo", model: "XC40 / EX40", category: "Luxury Compact SUV", body_type: "LUXURY" },
  { brand: "Volvo", model: "XC60", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Volvo", model: "XC90", category: "Flagship Luxury SUV", body_type: "LUXURY" },
  { brand: "Volvo", model: "S90", category: "Executive Luxury Sedan", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Defender", category: "Off-road Luxury SUV", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Discovery / Sport", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Range Rover Evoque", category: "Luxury Compact SUV", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Range Rover Velar", category: "Luxury Mid SUV", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Range Rover Sport", category: "Luxury Sport SUV", body_type: "LUXURY" },
  { brand: "Land Rover", model: "Range Rover", category: "Ultra Luxury Flagship SUV", body_type: "LUXURY" },
  { brand: "Jaguar", model: "F-Pace", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Jaguar", model: "XF / XE", category: "Luxury Sedan", body_type: "LUXURY" },
  { brand: "Porsche", model: "Macan", category: "Luxury Sport SUV", body_type: "LUXURY" },
  { brand: "Porsche", model: "Cayenne", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Porsche", model: "Panamera", category: "Luxury Grand Tourer", body_type: "LUXURY" },
  { brand: "Porsche", model: "911 Carrera", category: "Supercar", body_type: "LUXURY" },
  { brand: "Porsche", model: "Taycan", category: "Luxury Sport EV", body_type: "LUXURY" },

  // ==========================================
  // 11. TWO-WHEELERS (BIKES & SCOOTERS)
  // ==========================================
  // Royal Enfield
  { brand: "Royal Enfield", model: "Classic 350", category: "Retro Cruiser Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Hunter 350", category: "Roadster Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Bullet 350", category: "Classic Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Meteor 350", category: "Cruiser Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Himalayan 450", category: "Adventure Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Guerrilla 450", category: "Roadster Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Continental GT 650", category: "Cafe Racer Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Interceptor 650", category: "Retro Twin Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Super Meteor 650", category: "Cruiser Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Shotgun 650", category: "Custom Bobber Bike", body_type: "BIKE" },

  // TVS
  { brand: "TVS", model: "Jupiter 110 / 125", category: "Commuter Scooter", body_type: "BIKE" },
  { brand: "TVS", model: "Ntorq 125", category: "Sporty Scooter", body_type: "BIKE" },
  { brand: "TVS", model: "iQube Electric", category: "EV Scooter", body_type: "BIKE" },
  { brand: "TVS", model: "XL100 Moped", category: "Heavy Duty Moped", body_type: "BIKE" },
  { brand: "TVS", model: "Raider 125", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Apache RTR 160 / 180", category: "Sport Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Apache RTR 200 4V", category: "Sport Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Apache RR 310", category: "Racing Supersport Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Ronin 225", category: "Modern Retro Bike", body_type: "BIKE" },
  { brand: "TVS", model: "King Auto", category: "Passenger Auto Rickshaw", body_type: "AUTO" },

  // Bajaj
  { brand: "Bajaj", model: "Pulsar 125 / 150 / 180", category: "Sport Commuter Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar NS200 / NS160", category: "Naked Sport Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar N250 / F250", category: "Sport Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar 220F", category: "Sport Tourer Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar RS200", category: "Supersport Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Dominar 250 / 400", category: "Hyper Tourer Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Avenger 160 / 220", category: "Cruiser Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Platina 100 / 110", category: "Mileage Commuter Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "CT 100 / 110X", category: "Rough Road Commuter", body_type: "BIKE" },
  { brand: "Bajaj", model: "Chetak Electric", category: "EV Retro Scooter", body_type: "BIKE" },
  { brand: "Bajaj", model: "RE Compact Auto", category: "Passenger Auto Rickshaw", body_type: "AUTO" },
  { brand: "Bajaj", model: "Maxima Cargo / Z Auto", category: "Goods Auto Rickshaw", body_type: "AUTO" },

  // Honda Two Wheelers
  { brand: "Honda", model: "Activa 6G / 125", category: "Scooter", body_type: "BIKE" },
  { brand: "Honda", model: "Dio / Dio 125", category: "Sporty Scooter", body_type: "BIKE" },
  { brand: "Honda", model: "Shine 100 / 125", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "Honda", model: "SP 125 / SP 160", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Unicorn 160", category: "Executive Commuter Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Hornet 2.0", category: "Sport Bike", body_type: "BIKE" },
  { brand: "Honda", model: "CB200X", category: "Adventure Crossover Bike", body_type: "BIKE" },
  { brand: "Honda", model: "H'ness CB350 / CB350RS", category: "Classic Cruiser Bike", body_type: "BIKE" },
  { brand: "Honda", model: "NX500 / Transalp", category: "Adventure Tourer", body_type: "BIKE" },

  // Yamaha
  { brand: "Yamaha", model: "YZF-R15 V4 / M", category: "Supersport Racing Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "MT-15 V2", category: "Hyper Naked Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "FZ-S / FZ-FI", category: "Street Fighter Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "FZ-X", category: "Crossover Retro Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "Aerox 155", category: "Maxi Sport Scooter", body_type: "BIKE" },
  { brand: "Yamaha", model: "RayZR 125 Hybrid", category: "Sporty Scooter", body_type: "BIKE" },
  { brand: "Yamaha", model: "Fascino 125 Hybrid", category: "Retro Scooter", body_type: "BIKE" },
  { brand: "Yamaha", model: "R3 / MT-03", category: "Twin Cylinder Sport Bike", body_type: "BIKE" },

  // Hero MotoCorp
  { brand: "Hero", model: "Splendor Plus / XTEC", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "Hero", model: "HF Deluxe", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Passion Plus / XTEC", category: "Commuter Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Glamour / XTEC", category: "Executive Commuter Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Xtreme 125R / 160R / 200S", category: "Sport Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Xpulse 200 4V", category: "Dual Sport Off-Road Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Karizma XMR 210", category: "Supersport Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Mavrick 440", category: "Roadster Cruiser Bike", body_type: "BIKE" },
  { brand: "Hero", model: "Destini 125 / Prime", category: "Scooter", body_type: "BIKE" },
  { brand: "Hero", model: "Pleasure Plus / XTEC", category: "Lightweight Scooter", body_type: "BIKE" },
  { brand: "Hero", model: "Vida V1 Pro / Plus", category: "EV Scooter", body_type: "BIKE" },

  // Suzuki Two Wheelers
  { brand: "Suzuki", model: "Access 125", category: "Scooter", body_type: "BIKE" },
  { brand: "Suzuki", model: "Burgman Street 125", category: "Maxi Scooter", body_type: "BIKE" },
  { brand: "Suzuki", model: "Avenis 125", category: "Sporty Scooter", body_type: "BIKE" },
  { brand: "Suzuki", model: "Gixxer 150 / 250", category: "Naked Sport Bike", body_type: "BIKE" },
  { brand: "Suzuki", model: "Gixxer SF 150 / 250", category: "Faired Sport Bike", body_type: "BIKE" },
  { brand: "Suzuki", model: "V-Strom SX 250", category: "Adventure Tourer Bike", body_type: "BIKE" },
  { brand: "Suzuki", model: "Hayabusa", category: "Hyperbike", body_type: "LUXURY" },

  // KTM
  { brand: "KTM", model: "Duke 125 / 200 / 250 / 390", category: "Naked Street Bike", body_type: "BIKE" },
  { brand: "KTM", model: "RC 125 / 200 / 390", category: "Supersport Track Bike", body_type: "BIKE" },
  { brand: "KTM", model: "390 Adventure / 250 Adventure", category: "Adventure Bike", body_type: "BIKE" },

  // Ather & Ola Electric
  { brand: "Ather", model: "450X / 450S / 450 Apex", category: "Performance EV Scooter", body_type: "BIKE" },
  { brand: "Ather", model: "Rizta", category: "Family EV Scooter", body_type: "BIKE" },
  { brand: "Ola Electric", model: "S1 Pro Gen 2", category: "EV Scooter", body_type: "BIKE" },
  { brand: "Ola Electric", model: "S1 Air", category: "EV Scooter", body_type: "BIKE" },
  { brand: "Ola Electric", model: "S1 X / X+", category: "EV Scooter", body_type: "BIKE" },

  // ==========================================
  // 12. COMMERCIAL, VANS & THREE-WHEELERS
  // ==========================================
  { brand: "Force", model: "Traveller 3050 / 3350 / 4020", category: "Passenger Van", body_type: "VAN" },
  { brand: "Force", model: "Urbania", category: "Luxury Commercial Van", body_type: "VAN" },
  { brand: "Force", model: "Gurkha 3-Door / 5-Door", category: "Off-road Heavy SUV", body_type: "SUV" },
  { brand: "Force", model: "Trax Cruiser", category: "MUV 13-Seater", body_type: "MUV" },
  { brand: "Ashok Leyland", model: "Dost Plus / Strong", category: "Pickup Commercial Truck", body_type: "TRUCK" },
  { brand: "Ashok Leyland", model: "Bada Dost", category: "Commercial Mini Truck", body_type: "TRUCK" },
  { brand: "Ashok Leyland", model: "Partner / MiTR", category: "Light Commercial Truck", body_type: "TRUCK" },
  { brand: "Piaggio", model: "Ape Auto DX", category: "Passenger Auto Rickshaw", body_type: "AUTO" },
  { brand: "Piaggio", model: "Ape Xtra LDX", category: "Cargo Goods 3-Wheeler", body_type: "AUTO" },
  { brand: "Piaggio", model: "Ape E-City / E-Xtra", category: "Electric Auto Rickshaw", body_type: "AUTO" },
];

export const CATALOG_BRANDS: string[] = Array.from(
  new Set(VEHICLE_CATALOG.map((item) => item.brand))
).sort();

export function getModelsForBrand(brandName: string): VehicleCatalogItem[] {
  if (!brandName) return [];
  const clean = brandName.trim().toLowerCase();
  return VEHICLE_CATALOG.filter(
    (item) => item.brand.trim().toLowerCase() === clean
  );
}

/**
 * Intelligent Body-Type Resolver
 * Matches catalog exactly, then applies brand & keyword heuristics with safe fallback to HATCHBACK.
 */
export function resolveVehicleBodyType(brandName: string, modelName: string): VehicleType {
  if (!brandName && !modelName) return "HATCHBACK";

  const cleanBrand = (brandName || "").trim().toLowerCase();
  const cleanModel = (modelName || "").trim().toLowerCase();

  // 1. Direct Catalog Match
  const exactMatch = VEHICLE_CATALOG.find(
    (item) =>
      item.brand.toLowerCase() === cleanBrand &&
      item.model.toLowerCase() === cleanModel
  );

  if (exactMatch) {
    return exactMatch.body_type;
  }

  // 2. Partial Catalog Substring Match on Model
  if (cleanBrand) {
    const brandMatches = VEHICLE_CATALOG.filter(
      (item) => item.brand.toLowerCase() === cleanBrand
    );
    const partialMatch = brandMatches.find(
      (item) =>
        cleanModel.includes(item.model.toLowerCase()) ||
        item.model.toLowerCase().includes(cleanModel)
    );
    if (partialMatch) {
      return partialMatch.body_type;
    }
  }

  // 3. Keyword Heuristic Matching on Model Name
  const m = cleanModel.toUpperCase();
  const b = cleanBrand.toUpperCase();

  // Two-Wheelers
  if (
    ["BIKE", "SCOOTER", "ACTIVA", "DIO", "SHINE", "UNICORN", "PULSAR", "APACHE", "R15", "MT-15", "FZ", "METEOR", "BULLET", "CLASSIC 350", "HUNTER", "HIMALAYAN", "SPLENDOR", "DELUXE", "PASSION", "GLAMOUR", "XTREME", "XPULSE", "ACCESS", "BURGMAN", "AVENIS", "GIXXER", "DUKE", "RC 390", "ATHER", "RIZTA", "S1 PRO", "S1 AIR", "CHETAK", "JUPITER", "NTORQ", "IQUBE", "XL100", "DOMINAR", "AVENGER", "PLATINA", "MOPED", "TWOWHEELER"].some(k => m.includes(k)) ||
    ["ROYAL ENFIELD", "HERO", "TVS", "YAMAHA", "KTM", "ATHER", "OLA ELECTRIC"].includes(b)
  ) {
    if (["AUTO", "RICKSHAW", "KING", "MAXIMA", "TREO", "APE"].some(k => m.includes(k))) {
      return "AUTO";
    }
    return "BIKE";
  }

  // Auto Rickshaws
  if (["AUTO", "RICKSHAW", "TUKTUK", "APE", "TREO", "MAXIMA", "RE COMPACT", "3-WHEELER", "THREE WHEELER", "E-RICKSHAW"].some(k => m.includes(k) || b.includes(k))) {
    return "AUTO";
  }

  // Luxury Brands
  if (
    ["MERCEDES", "MERCEDES-BENZ", "BENZ", "BMW", "AUDI", "PORSCHE", "JAGUAR", "LAND ROVER", "RANGE ROVER", "VOLVO", "LEXUS", "BENTLEY", "ROLLS ROYCE", "FERRARI", "LAMBORGHINI", "MASERATI"].some(k => b.includes(k)) ||
    ["FORTUNER", "VELLFIRE", "GLOSTER", "EV9", "EV6", "TUCSON", "XUV700", "CAMRY", "IONIQ", "DEFENDER", "VELAR", "EVOQUE", "CAYENNE", "MACAN", "PANAMERA", "TAYCAN", "911", "G-WAGON", "HAYABUSA"].some(k => m.includes(k))
  ) {
    return "LUXURY";
  }

  // Heavy Commercial / Trucks
  if (["TRUCK", "DOST", "BADA DOST", "ACE", "YODHA", "SUPER CARRY", "JEETO", "PICKUP", "TIPPER", "CAMPER", "ASHOK LEYLAND", "BHARATBENZ", "EICHER"].some(k => m.includes(k) || b.includes(k))) {
    return "TRUCK";
  }

  // Vans & MUVs
  if (["TRAVELLER", "URBANIA", "EECO", "VAN", "MINIVAN", "WINGER", "SUPRO", "MAGIC"].some(k => m.includes(k))) {
    return "VAN";
  }
  if (["ERTIGA", "XL6", "INNOVA", "CRYSTA", "RUMION", "CARENS", "TRIBER", "MARAZZO", "BOLERO", "HEXA", "SUMO", "MUV", "MULTI-UTILITY"].some(k => m.includes(k))) {
    return "MUV";
  }

  // Compact SUVs
  if (["BREZZA", "FRONX", "VENUE", "EXTER", "PUNCH", "NEXON", "XUV 3XO", "XUV300", "SONET", "TAISOR", "KYLAQ", "ASTOR", "KIGER", "MAGNITE", "COMPACT SUV", "MICRO SUV"].some(k => m.includes(k))) {
    return "COMPACT_SUV";
  }

  // Full / Mid SUVs
  if (["SUV", "CRETA", "SELTOS", "THAR", "SCORPIO", "HARRIER", "SAFARI", "CURVV", "GRAND VITARA", "JIMNY", "HYRYDER", "ELEVATE", "TAIGUN", "KUSHAQ", "HECTOR", "DUSTER", "COMPASS", "WRANGLER", "GURKHA", "XUV"].some(k => m.includes(k))) {
    return "SUV";
  }

  // Sedans
  if (["SEDAN", "DZIRE", "CIAZ", "VERNA", "AURA", "XCENT", "TIGOR", "AMAZE", "CITY", "CIVIC", "VIRTUS", "VENTO", "SLAVIA", "RAPID", "SUNNY", "OCTAVIA", "SUPERB", "JETTA", "PASSAT"].some(k => m.includes(k))) {
    return "SEDAN";
  }

  // Hatchbacks
  if (["ALTO", "WAGONR", "SWIFT", "BALENO", "CELERIO", "IGNIS", "S-PRESSO", "I10", "I20", "SANTRO", "EON", "TIAGO", "ALTROZ", "GLANZA", "POLO", "FABIA", "COMET", "KWID", "MICRA", "JAZZ", "HATCHBACK"].some(k => m.includes(k))) {
    return "HATCHBACK";
  }

  return "HATCHBACK";
}
