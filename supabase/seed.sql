-- ==============================================================================
-- KALLAYI CAR SPA & AUTO CARE - PRODUCTION MASTER SEED SCRIPT (DDL & DATA)
-- Repeatable, idempotent seed script for initial master catalog and categories.
-- ==============================================================================

-- 1. REVENUE CATEGORIES
INSERT INTO public.revenue_categories (id, name, description)
VALUES 
    (1, 'Wash & Detailing Services', 'Standard and express car wash, foam bath, and underbody cleaning'),
    (2, 'VIP Memberships', 'Monthly and annual unlimited wash subscription plans'),
    (3, 'Add-on Treatments & Coatings', 'Ceramic coating, paint correction, and premium detailing add-ons')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Adjust sequence for revenue_categories
SELECT setval('public.revenue_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.revenue_categories));

-- 2. EXPENSE CATEGORIES
INSERT INTO public.expense_categories (id, name, description)
VALUES 
    (1, 'Chemicals & Consumables', 'Shampoos, waxes, ceramic coatings, and detailing supplies'),
    (2, 'Staff Salary & Wages', 'Staff payroll, daily wages, and commissions'),
    (3, 'Utility & Electricity', 'Water, power, generator, and compressor operations'),
    (4, 'Machinery Maintenance', 'High-pressure pump servicing and tool maintenance')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Adjust sequence for expense_categories
SELECT setval('public.expense_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.expense_categories));

-- 3. SUBSCRIPTION PLANS
INSERT INTO public.subscription_plans (id, name, price, interval_days, description)
VALUES 
    (1, 'Silver Monthly Pass', 999.00, 30, 'Unlimited Exterior Foam Washes & Quick Microfiber Dry for 30 days.'),
    (2, 'Gold Unlimited Pass', 1999.00, 30, 'Unlimited Exterior Washes + 2 Complete Interior Detailings per month.'),
    (3, 'Platinum VIP Annual', 9999.00, 365, 'All-inclusive 365-day access with VIP Priority Bay Queue and Free Pick & Drop.')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, price = EXCLUDED.price, interval_days = EXCLUDED.interval_days, description = EXCLUDED.description;

-- Adjust sequence for subscription_plans
SELECT setval('public.subscription_plans_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.subscription_plans));

-- 4. BASELINE SERVICE PACKAGES
INSERT INTO public.service_packages (id, name, price, description, duration_minutes, vehicle_type)
VALUES 
    (1, 'Signature Exterior Wash', 350.00, 'High-pressure underbody rinse, active foam bath, alloy wheels de-greasing, tire dressing, and scratch-free microfiber drying.', 30, 'ALL'),
    (2, 'Complete Interior & Exterior', 700.00, 'Signature exterior wash plus deep cabin vacuuming, dashboard and console dressing, glass streak-free shine, and door jamb cleaning.', 60, 'ALL'),
    (3, 'Ultimate 360° Detail', 1800.00, 'Full 360 showroom treatment: interior shampoo extraction, leather conditioning, single-stage machine paint enhancement, engine bay detailing, and hydrophobic paint sealant.', 120, 'ALL')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, price = EXCLUDED.price, description = EXCLUDED.description, duration_minutes = EXCLUDED.duration_minutes, vehicle_type = EXCLUDED.vehicle_type;

-- Adjust sequence for service_packages
SELECT setval('public.service_packages_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.service_packages));

-- 5. SERVICE PACKAGE TIERED PRICES PER BODY TYPE
-- Package 1: Signature Exterior Wash (Base: 350)
INSERT INTO public.service_package_prices (package_id, vehicle_type, price)
VALUES
    (1, 'HATCHBACK', 350.00),
    (1, 'SEDAN', 400.00),
    (1, 'COMPACT_SUV', 450.00),
    (1, 'SUV', 500.00),
    (1, 'MUV', 550.00),
    (1, 'VAN', 550.00),
    (1, 'LUXURY', 650.00),
    (1, 'BIKE', 150.00),
    (1, 'AUTO', 200.00),
    (1, 'TRUCK', 550.00)
ON CONFLICT (package_id, vehicle_type) DO UPDATE SET price = EXCLUDED.price;

-- Package 2: Complete Interior & Exterior (Base: 700)
INSERT INTO public.service_package_prices (package_id, vehicle_type, price)
VALUES
    (2, 'HATCHBACK', 700.00),
    (2, 'SEDAN', 800.00),
    (2, 'COMPACT_SUV', 900.00),
    (2, 'SUV', 1000.00),
    (2, 'MUV', 1100.00),
    (2, 'VAN', 1100.00),
    (2, 'LUXURY', 1300.00),
    (2, 'BIKE', 300.00),
    (2, 'AUTO', 400.00),
    (2, 'TRUCK', 1200.00)
ON CONFLICT (package_id, vehicle_type) DO UPDATE SET price = EXCLUDED.price;

-- Package 3: Ultimate 360° Detail (Base: 1800)
INSERT INTO public.service_package_prices (package_id, vehicle_type, price)
VALUES
    (3, 'HATCHBACK', 1800.00),
    (3, 'SEDAN', 2200.00),
    (3, 'COMPACT_SUV', 2400.00),
    (3, 'SUV', 2600.00),
    (3, 'MUV', 2800.00),
    (3, 'VAN', 2800.00),
    (3, 'LUXURY', 3200.00),
    (3, 'BIKE', 800.00),
    (3, 'AUTO', 1000.00),
    (3, 'TRUCK', 3000.00)
ON CONFLICT (package_id, vehicle_type) DO UPDATE SET price = EXCLUDED.price;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

