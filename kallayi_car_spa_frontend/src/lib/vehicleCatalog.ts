export type DjangoVehicleType = 
  | "HATCHBACK"
  | "SEDAN"
  | "SUV"
  | "BIKE"
  | "VAN"
  | "LUXURY"
  | "AUTO"
  | "CAR"
  | "TRUCK";

export interface VehicleCatalogItem {
  brand: string;
  model: string;
  category: string;
  body_type: DjangoVehicleType;
}

export const BODY_TYPE_OPTIONS: { label: string; value: DjangoVehicleType; icon: string }[] = [
  { label: "Hatchback", value: "HATCHBACK", icon: "🚗" },
  { label: "Sedan", value: "SEDAN", icon: "🚘" },
  { label: "Compact / Mid SUV", value: "SUV", icon: "🚙" },
  { label: "Full SUV / Off-road", value: "SUV", icon: "🏔️" },
  { label: "MUV / Van", value: "VAN", icon: "🚐" },
  { label: "Luxury / Premium", value: "LUXURY", icon: "✨" },
  { label: "Two-Wheeler (Bike/Scooter)", value: "BIKE", icon: "🏍️" },
  { label: "Auto Rickshaw", value: "AUTO", icon: "🛺" },
];

export const VEHICLE_CATALOG: VehicleCatalogItem[] = [
  // Maruti Suzuki
  { brand: "Maruti Suzuki", model: "Alto", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "WagonR", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Swift", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Baleno", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Celerio", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Ignis", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "S-Presso", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Maruti Suzuki", model: "Dzire", category: "Sedan", body_type: "SEDAN" },
  { brand: "Maruti Suzuki", model: "Ciaz", category: "Sedan", body_type: "SEDAN" },
  { brand: "Maruti Suzuki", model: "Brezza", category: "Compact SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Fronx", category: "Compact SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Grand Vitara", category: "Mid SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Jimny", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Maruti Suzuki", model: "Ertiga", category: "MUV", body_type: "VAN" },
  { brand: "Maruti Suzuki", model: "XL6", category: "MUV", body_type: "VAN" },
  { brand: "Maruti Suzuki", model: "Invicto", category: "Luxury MUV", body_type: "LUXURY" },
  { brand: "Maruti Suzuki", model: "Eeco", category: "Van", body_type: "VAN" },

  // Hyundai
  { brand: "Hyundai", model: "Grand i10", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "i10 Nios", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "i20", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Santro", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Eon", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Hyundai", model: "Verna", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Aura", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Xcent", category: "Sedan", body_type: "SEDAN" },
  { brand: "Hyundai", model: "Venue", category: "Compact SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Exter", category: "Compact SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Creta", category: "Mid SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Alcazar", category: "Full SUV", body_type: "SUV" },
  { brand: "Hyundai", model: "Tucson", category: "Full SUV", body_type: "LUXURY" },

  // Tata
  { brand: "Tata", model: "Tiago", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Tata", model: "Altroz", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Tata", model: "Tigor", category: "Sedan", body_type: "SEDAN" },
  { brand: "Tata", model: "Nexon", category: "Compact SUV", body_type: "SUV" },
  { brand: "Tata", model: "Punch", category: "Compact SUV", body_type: "SUV" },
  { brand: "Tata", model: "Harrier", category: "Full SUV", body_type: "SUV" },
  { brand: "Tata", model: "Safari", category: "Full SUV", body_type: "SUV" },

  // Mahindra
  { brand: "Mahindra", model: "Thar", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Thar Roxx", category: "Off-road SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Scorpio Classic", category: "Full SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Scorpio-N", category: "Full SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "XUV700", category: "Full SUV", body_type: "LUXURY" },
  { brand: "Mahindra", model: "XUV300", category: "Compact SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "XUV 3XO", category: "Compact SUV", body_type: "SUV" },
  { brand: "Mahindra", model: "Bolero", category: "MUV", body_type: "VAN" },
  { brand: "Mahindra", model: "Bolero Neo", category: "MUV", body_type: "VAN" },

  // Toyota
  { brand: "Toyota", model: "Glanza", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Toyota", model: "Urban Cruiser Hyryder", category: "Mid SUV", body_type: "SUV" },
  { brand: "Toyota", model: "Innova Crysta", category: "MUV", body_type: "VAN" },
  { brand: "Toyota", model: "Innova Hycross", category: "MUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Fortuner", category: "Full SUV", body_type: "LUXURY" },
  { brand: "Toyota", model: "Vellfire", category: "Luxury MUV", body_type: "LUXURY" },

  // Kia
  { brand: "Kia", model: "Sonet", category: "Compact SUV", body_type: "SUV" },
  { brand: "Kia", model: "Seltos", category: "Mid SUV", body_type: "SUV" },
  { brand: "Kia", model: "Carens", category: "MUV", body_type: "VAN" },
  { brand: "Kia", model: "Carnival", category: "Luxury MUV", body_type: "LUXURY" },

  // Honda
  { brand: "Honda", model: "Amaze", category: "Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "City", category: "Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "Civic", category: "Sedan", body_type: "SEDAN" },
  { brand: "Honda", model: "Elevate", category: "Mid SUV", body_type: "SUV" },

  // Volkswagen & Skoda
  { brand: "Volkswagen", model: "Polo", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Volkswagen", model: "Virtus", category: "Sedan", body_type: "SEDAN" },
  { brand: "Volkswagen", model: "Vento", category: "Sedan", body_type: "SEDAN" },
  { brand: "Volkswagen", model: "Taigun", category: "Mid SUV", body_type: "SUV" },
  { brand: "Skoda", model: "Slavia", category: "Sedan", body_type: "SEDAN" },
  { brand: "Skoda", model: "Rapid", category: "Sedan", body_type: "SEDAN" },
  { brand: "Skoda", model: "Kushaq", category: "Mid SUV", body_type: "SUV" },

  // Renault, Nissan, MG, Jeep
  { brand: "Renault", model: "Kwid", category: "Hatchback", body_type: "HATCHBACK" },
  { brand: "Renault", model: "Kiger", category: "Compact SUV", body_type: "SUV" },
  { brand: "Nissan", model: "Magnite", category: "Compact SUV", body_type: "SUV" },
  { brand: "MG", model: "Astor", category: "Compact SUV", body_type: "SUV" },
  { brand: "MG", "model": "Hector", category: "Full SUV", body_type: "SUV" },
  { brand: "MG", model: "Gloster", category: "Full SUV", body_type: "LUXURY" },
  { brand: "Jeep", model: "Compass", category: "Mid SUV", body_type: "SUV" },
  { brand: "Jeep", model: "Wrangler", category: "Off-road SUV", body_type: "LUXURY" },
  { brand: "Jeep", model: "Meridian", category: "Full SUV", body_type: "LUXURY" },

  // Two Wheelers
  { brand: "Royal Enfield", model: "Classic 350", category: "Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Hunter 350", category: "Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Bullet 350", category: "Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Meteor 350", category: "Bike", body_type: "BIKE" },
  { brand: "Royal Enfield", model: "Himalayan", category: "Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Activa", category: "Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Dio", category: "Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Shine", category: "Bike", body_type: "BIKE" },
  { brand: "Honda", model: "Unicorn", category: "Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "R15", category: "Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "MT-15", category: "Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "RayZR", category: "Bike", body_type: "BIKE" },
  { brand: "Yamaha", model: "FZ", category: "Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Jupiter", category: "Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Apache RTR", category: "Bike", body_type: "BIKE" },
  { brand: "TVS", model: "Ntorq", category: "Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar 150", category: "Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Pulsar 220", category: "Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "Platina", category: "Bike", body_type: "BIKE" },
  { brand: "Bajaj", model: "RE Auto", category: "Auto", body_type: "AUTO" },

  // Vans & Commercial
  { brand: "Force", model: "Traveller", category: "Van", body_type: "VAN" },
  { brand: "Force", model: "Urbania", category: "Van", body_type: "VAN" },

  // Luxury
  { brand: "Mercedes-Benz", model: "C-Class", category: "Luxury", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "E-Class", category: "Luxury", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLC", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Mercedes-Benz", model: "GLE", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "3 Series", category: "Luxury", body_type: "LUXURY" },
  { brand: "BMW", model: "5 Series", category: "Luxury", body_type: "LUXURY" },
  { brand: "BMW", model: "X1", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "X3", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "BMW", model: "X5", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "A4", category: "Luxury", body_type: "LUXURY" },
  { brand: "Audi", model: "A6", category: "Luxury", body_type: "LUXURY" },
  { brand: "Audi", model: "Q3", category: "Luxury SUV", body_type: "LUXURY" },
  { brand: "Audi", model: "Q5", category: "Luxury SUV", body_type: "LUXURY" }
];

export const CATALOG_BRANDS: string[] = Array.from(new Set(VEHICLE_CATALOG.map((item) => item.brand))).sort();

export function getModelsForBrand(brandName: string): VehicleCatalogItem[] {
  if (!brandName) return [];
  return VEHICLE_CATALOG.filter(
    (item) => item.brand.toLowerCase() === brandName.trim().toLowerCase()
  );
}

export function resolveVehicleBodyType(brandName: string, modelName: string): DjangoVehicleType {
  if (!brandName || !modelName) return "HATCHBACK";

  const match = VEHICLE_CATALOG.find(
    (item) =>
      item.brand.toLowerCase() === brandName.trim().toLowerCase() &&
      item.model.toLowerCase() === modelName.trim().toLowerCase()
  );

  if (match) {
    return match.body_type;
  }

  // Fallback heuristic keyword matching
  const m = modelName.toUpperCase();
  if (["SUV", "CRETA", "SELTOS", "THAR", "BREZZA", "NEXON", "SCORPIO", "HARRIER", "FORTUNER", "COMPASS", "XUV"].some(k => m.includes(k))) {
    return "SUV";
  }
  if (["CITY", "VERNA", "DZIRE", "SLAVIA", "VIRTUS", "AMAZE", "SEDAN", "CIAZ"].some(k => m.includes(k))) {
    return "SEDAN";
  }
  if (["ERTIGA", "INNOVA", "CARENS", "TRAVELLER", "EECO", "VAN", "MUV"].some(k => m.includes(k))) {
    return "VAN";
  }
  if (["BIKE", "BULLET", "ACTIVA", "PULSAR", "APACHE", "R15", "METEOR", "DUKE"].some(k => m.includes(k))) {
    return "BIKE";
  }
  if (["BENZ", "BMW", "AUDI", "PORSCHE", "JAGUAR", "LUXURY"].some(k => m.includes(k))) {
    return "LUXURY";
  }
  if (["AUTO", "RICKSHAW", "APE"].some(k => m.includes(k))) {
    return "AUTO";
  }

  return "HATCHBACK";
}
