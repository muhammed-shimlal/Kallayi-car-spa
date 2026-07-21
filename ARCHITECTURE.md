# ARCHITECTURE.md

# 🏗️ Kallayi Car Spa - System Architecture

## Overview

Kallayi Car Spa is a backend application built using **Django** and **Django REST Framework (DRF)**. The project follows a modular architecture where each business domain is organized into its own Django application.

This architecture improves maintainability, scalability, and code organization.

---

# Architecture Overview

```
                    Client Applications
        ┌────────────────────────────────────┐
        │                                    │
        │  Web App   Mobile App   Admin Panel│
        │                                    │
        └────────────────────────────────────┘
                     │
                     ▼
            Django REST API (DRF)
                     │
 ┌─────────────────────────────────────────────┐
 │                Django Project               │
 ├─────────────────────────────────────────────┤
 │                                             │
 │ Authentication (JWT)                        │
 │ URL Routing                                 │
 │ Views / ViewSets                            │
 │ Serializers                                 │
 │ Permissions                                 │
 │ Business Logic                              │
 │ Django ORM                                  │
 │                                             │
 └─────────────────────────────────────────────┘
                     │
                     ▼
              SQLite / PostgreSQL
```

---

# High-Level Architecture

```
Client
   │
   ▼
REST API
   │
   ▼
Authentication
   │
   ▼
Business Logic
   │
   ▼
Database
```

---

# Project Structure

```
Kallayi-car-spa/
│
├── apps/
│   ├── users/
│   ├── customers/
│   ├── staff/
│   ├── services/
│   ├── finances/
│   └── ...
│
├── config/
│
├── manage.py
├── requirements.txt
└── README.md
```

---

# Layered Architecture

## 1. Presentation Layer

Responsible for receiving HTTP requests and returning JSON responses.

Components:

- URL Routing
- API Views
- ViewSets
- Response Objects

---

## 2. Authentication Layer

Responsible for user authentication and authorization.

Features:

- JWT Authentication
- Login
- Logout
- Token Refresh
- Permissions
- Protected Endpoints

---

## 3. Business Logic Layer

Contains the application's business rules.

Examples:

- Customer management
- Vehicle management
- Booking validation
- Service pricing
- Financial calculations

---

## 4. Data Access Layer

Implemented using Django ORM.

Responsibilities:

- CRUD operations
- Model relationships
- Database queries
- Data validation

---

## 5. Database Layer

Stores application data.

Supported databases:

- SQLite (Development)
- PostgreSQL (Production)

---

# Django Application Modules

## Users

Responsibilities

- Authentication
- User profiles
- User permissions

---

## Customers

Responsibilities

- Customer records
- Customer history
- Customer information

---

## Vehicles

Responsibilities

- Vehicle information
- Customer ownership
- Vehicle management

---

## Services

Responsibilities

- Wash services
- Pricing
- Service categories

---

## Staff

Responsibilities

- Staff management
- Employee information
- Role assignment

---

## Bookings

Responsibilities

- Appointment scheduling
- Booking management
- Booking history

---

## Finance

Responsibilities

- Income
- Expenses
- Financial reports

---

# Request Flow

```
Client Request
       │
       ▼
URL Routing
       │
       ▼
APIView / ViewSet
       │
       ▼
Permission Check
       │
       ▼
Serializer Validation
       │
       ▼
Business Logic
       │
       ▼
Django ORM
       │
       ▼
Database
       │
       ▼
JSON Response
```

---

# Authentication Flow

```
User Login
      │
      ▼
Verify Credentials
      │
      ▼
Generate JWT Token
      │
      ▼
Return Access Token
      │
      ▼
Client Stores Token
      │
      ▼
Authenticated API Requests
```

---

# Database Architecture

```
Users
   │
   ├── Customers
   │       │
   │       └── Vehicles
   │               │
   │               └── Bookings
   │
   ├── Staff
   │
   ├── Services
   │
   └── Finance
```

---

# Technology Stack

## Backend

- Python
- Django
- Django REST Framework

---

## Authentication

- JWT
- SimpleJWT

---

## Database

- SQLite
- PostgreSQL

---

## Development Tools

- Git
- GitHub
- VS Code
- Postman

---

# Design Principles

The project follows these software engineering principles:

- Modular Design
- Separation of Concerns
- Reusable Components
- RESTful API Design
- Scalable Architecture
- Clean Code Practices

---

# Security Architecture

Security features include:

- JWT Authentication
- Password Hashing
- Protected Endpoints
- Role-Based Access Control
- Input Validation
- Permission Classes

---

# Scalability

The architecture is designed to support future enhancements such as:

- Mobile Applications
- Cloud Deployment
- Docker Containers
- Microservices
- Multiple Branch Management
- Online Payments
- Notification Services
- Analytics Dashboard

---

# Future Architecture

```
                Mobile App
                     │
                     │
Web Application ─────┼────── Admin Panel
                     │
                     ▼
             Django REST API
                     │
 ┌───────────────────────────────────┐
 │ Authentication                    │
 │ Customer Module                   │
 │ Vehicle Module                    │
 │ Booking Module                    │
 │ Finance Module                    │
 │ Notification Module               │
 │ Analytics Module                  │
 └───────────────────────────────────┘
                     │
                     ▼
              PostgreSQL Database
                     │
                     ▼
              Cloud Infrastructure
```

---

# Summary

Kallayi Car Spa uses a modular Django architecture with a layered design that separates presentation, business logic, authentication, and data access. This structure makes the project easier to maintain, test, and extend as new features are added.

---

# Maintainer

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

This project is licensed under the MIT License.