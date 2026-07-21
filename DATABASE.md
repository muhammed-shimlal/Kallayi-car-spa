# DATABASE.md

# 🗄 Database Documentation

## Kallayi Car Spa

---

# Overview

The Kallayi Car Spa database is designed using Django ORM with a relational database structure. It stores information related to users, customers, vehicles, staff, services, bookings, and financial transactions.

The project supports:

- SQLite (Development)
- PostgreSQL (Production)

---

# Database Technology

| Component | Technology |
|------------|------------|
| ORM | Django ORM |
| Development Database | SQLite |
| Production Database | PostgreSQL |

---

# Entity Relationship Overview

```

Users
│
├── Customers
│ └── Vehicles
│ └── Bookings
│
├── Staff
│ └── Bookings
│
├── Services
│ └── Bookings
│
└── Finances

```

---

# Main Database Tables

## Users

Stores authenticated system users.

| Field | Type |
|--------|------|
| id | Integer |
| username | String |
| email | Email |
| password | Hashed Password |
| first_name | String |
| last_name | String |
| is_active | Boolean |
| is_staff | Boolean |
| date_joined | DateTime |

---

## Customers

Stores customer information.

| Field | Type |
|--------|------|
| id | Integer |
| name | String |
| phone | String |
| email | Email |
| address | Text |
| created_at | DateTime |
| updated_at | DateTime |

---

## Vehicles

Stores customer vehicle details.

| Field | Type |
|--------|------|
| id | Integer |
| customer | Foreign Key |
| registration_number | String |
| brand | String |
| model | String |
| vehicle_type | String |
| color | String |
| created_at | DateTime |

Relationship:

```

Customer (1)
│
├── Vehicle (Many)

```

---

## Services

Stores available wash services.

| Field | Type |
|--------|------|
| id | Integer |
| service_name | String |
| description | Text |
| price | Decimal |
| duration | Integer |
| created_at | DateTime |

Examples:

- Basic Wash
- Premium Wash
- Interior Cleaning
- Full Detailing

---

## Staff

Stores employee details.

| Field | Type |
|--------|------|
| id | Integer |
| name | String |
| phone | String |
| email | Email |
| role | String |
| joining_date | Date |
| status | Boolean |

---

## Bookings

Stores customer appointments.

| Field | Type |
|--------|------|
| id | Integer |
| customer | Foreign Key |
| vehicle | Foreign Key |
| service | Foreign Key |
| staff | Foreign Key |
| booking_date | Date |
| booking_time | Time |
| status | String |
| total_amount | Decimal |

Relationship:

```

Customer
│
├── Booking
│
Vehicle
│
├── Booking
│
Service
│
├── Booking
│
Staff
│
└── Booking

```

---

## Finance

Stores income and expense records.

| Field | Type |
|--------|------|
| id | Integer |
| transaction_type | String |
| amount | Decimal |
| description | Text |
| date | Date |
| created_at | DateTime |

Transaction Types:

- Income
- Expense

---

# Relationships

## Customer → Vehicle

One customer can own multiple vehicles.

```

Customer (1)
│
└── Vehicle (Many)

```

---

## Customer → Booking

One customer can create multiple bookings.

```

Customer (1)
│
└── Booking (Many)

```

---

## Vehicle → Booking

Each booking belongs to one vehicle.

```

Vehicle (1)
│
└── Booking (Many)

```

---

## Service → Booking

One service can appear in many bookings.

```

Service (1)
│
└── Booking (Many)

```

---

## Staff → Booking

One staff member can handle multiple bookings.

```

Staff (1)
│
└── Booking (Many)

```

---

# Database Constraints

Primary Keys

- Every table has an auto-increment ID.

Foreign Keys

- Vehicle → Customer
- Booking → Customer
- Booking → Vehicle
- Booking → Service
- Booking → Staff

Unique Fields

- Username
- Email
- Vehicle Registration Number

---

# Indexing

Recommended indexes:

- Customer Phone Number
- Vehicle Registration Number
- Booking Date
- Service Name
- Staff Name

---

# Data Validation

Validation includes:

- Required fields
- Email validation
- Phone number validation
- Positive pricing
- Unique vehicle registration numbers
- Foreign key integrity

---

# Database Migration

Create migrations:

```bash
python manage.py makemigrations
```

Apply migrations:

```bash
python manage.py migrate
```

Show migration status:

```bash
python manage.py showmigrations
```

---

# Backup

SQLite

```bash
copy db.sqlite3 backup.sqlite3
```

Linux

```bash
cp db.sqlite3 backup.sqlite3
```

PostgreSQL

```bash
pg_dump database_name > backup.sql
```

Restore

```bash
psql database_name < backup.sql
```

---

# Future Database Improvements

- Audit logs
- Payment table
- Invoice table
- Discounts
- Coupons
- Loyalty points
- Vehicle images
- Customer documents
- Multi-branch support

---

# Summary

The database follows a normalized relational structure using Django ORM. It is designed to be scalable, maintainable, and suitable for both development and production environments.

---

## Maintainer

**Muhammed Shimlal**

GitHub:
https://github.com/muhammed-shimlal/Kallayi-car-spa