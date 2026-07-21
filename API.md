# API.md

# 🚀 Kallayi Car Spa API Documentation

## Overview

The Kallayi Car Spa API is built using **Django REST Framework (DRF)** and follows RESTful design principles. It provides secure endpoints for managing users, customers, vehicles, services, staff, bookings, and financial records.

---

# Base URL

Development

```
http://127.0.0.1:8000/api/
```

Production

```
https://your-domain.com/api/
```

---

# Authentication

The API uses **JWT (JSON Web Token)** authentication.

Include the access token in every authenticated request.

```
Authorization: Bearer <access_token>
```

---

# Authentication Endpoints

## Login

**POST**

```
/auth/login/
```

Request

```json
{
    "username": "admin",
    "password": "password123"
}
```

Response

```json
{
    "access": "<jwt_access_token>",
    "refresh": "<jwt_refresh_token>"
}
```

---

## Refresh Token

**POST**

```
/auth/refresh/
```

Request

```json
{
    "refresh": "<refresh_token>"
}
```

---

## Logout

**POST**

```
/auth/logout/
```

---

# Users API

## Get All Users

**GET**

```
/users/
```

---

## Get User

**GET**

```
/users/{id}/
```

---

## Create User

**POST**

```
/users/
```

---

## Update User

**PUT**

```
/users/{id}/
```

---

## Delete User

**DELETE**

```
/users/{id}/
```

---

# Customers API

## Get Customers

**GET**

```
/customers/
```

---

## Get Customer

**GET**

```
/customers/{id}/
```

---

## Create Customer

**POST**

```
/customers/
```

Example

```json
{
    "name": "John Doe",
    "phone": "9876543210",
    "email": "john@example.com",
    "address": "Kerala"
}
```

---

## Update Customer

**PUT**

```
/customers/{id}/
```

---

## Delete Customer

**DELETE**

```
/customers/{id}/
```

---

# Vehicle API

## Get Vehicles

**GET**

```
/vehicles/
```

---

## Add Vehicle

**POST**

```
/vehicles/
```

Example

```json
{
    "customer": 1,
    "registration_number": "KL10AB1234",
    "brand": "Toyota",
    "model": "Innova",
    "vehicle_type": "Car",
    "color": "White"
}
```

---

## Update Vehicle

**PUT**

```
/vehicles/{id}/
```

---

## Delete Vehicle

**DELETE**

```
/vehicles/{id}/
```

---

# Services API

## Get Services

**GET**

```
/services/
```

---

## Create Service

**POST**

```
/services/
```

Example

```json
{
    "service_name": "Premium Wash",
    "price": 750,
    "duration": 90
}
```

---

## Update Service

**PUT**

```
/services/{id}/
```

---

## Delete Service

**DELETE**

```
/services/{id}/
```

---

# Staff API

## Get Staff

**GET**

```
/staff/
```

---

## Add Staff

**POST**

```
/staff/
```

---

## Update Staff

**PUT**

```
/staff/{id}/
```

---

## Delete Staff

**DELETE**

```
/staff/{id}/
```

---

# Booking API

## Get Bookings

**GET**

```
/bookings/
```

---

## Create Booking

**POST**

```
/bookings/
```

Example

```json
{
    "customer": 1,
    "vehicle": 2,
    "service": 3,
    "staff": 1,
    "booking_date": "2026-07-21",
    "booking_time": "10:30"
}
```

---

## Update Booking

**PUT**

```
/bookings/{id}/
```

---

## Delete Booking

**DELETE**

```
/bookings/{id}/
```

---

# Finance API

## Get Transactions

**GET**

```
/finances/
```

---

## Create Transaction

**POST**

```
/finances/
```

Example

```json
{
    "transaction_type": "Income",
    "amount": 500,
    "description": "Premium Wash"
}
```

---

## Update Transaction

**PUT**

```
/finances/{id}/
```

---

## Delete Transaction

**DELETE**

```
/finances/{id}/
```

---

# HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

# Pagination

List endpoints may support pagination.

Example:

```
GET /customers/?page=1
```

---

# Filtering

Examples

```
GET /customers/?search=john
```

```
GET /services/?price=500
```

---

# Ordering

```
GET /customers/?ordering=name
```

```
GET /services/?ordering=-price
```

---

# Error Response

Example

```json
{
    "detail": "Authentication credentials were not provided."
}
```

Validation Example

```json
{
    "phone": [
        "This field is required."
    ]
}
```

---

# Security

- JWT Authentication
- Protected Endpoints
- Password Hashing
- Permission-Based Access
- Input Validation

---

# API Versioning

Current Version

```
v1
```

Future

```
v2
```

---

# Testing

You can test the API using:

- Postman
- Insomnia
- curl
- Swagger UI (if enabled)
- Django REST Framework Browsable API

---

# Maintainer

**Muhammed Shimlal**

GitHub

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

This project is licensed under the MIT License.