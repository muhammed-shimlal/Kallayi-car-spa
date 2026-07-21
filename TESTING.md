# TESTING.md

# 🧪 Testing Guide

## Kallayi Car Spa

---

# Overview

Testing is an important part of software development. This document describes how to test the Kallayi Car Spa backend application to ensure that all APIs, database operations, and business logic work correctly.

The project uses Django's built-in testing framework and Django REST Framework testing utilities.

---

# Testing Objectives

The testing process verifies:

- User authentication
- API endpoints
- Database operations
- Business logic
- Data validation
- Permission handling
- Error handling

---

# Testing Environment

| Component | Version |
|------------|----------|
| Python | 3.11+ |
| Django | 5.x |
| Django REST Framework | Latest |
| SQLite | Development |
| PostgreSQL | Production |

---

# Running All Tests

Execute all tests.

```bash
python manage.py test
```

---

# Run Tests for a Specific App

Example:

```bash
python manage.py test apps.users
```

```bash
python manage.py test apps.customers
```

```bash
python manage.py test apps.services
```

---

# Run a Single Test File

Example:

```bash
python manage.py test apps.users.tests
```

---

# Run a Specific Test Class

```bash
python manage.py test apps.users.tests.UserTests
```

---

# Run a Specific Test Method

```bash
python manage.py test apps.users.tests.UserTests.test_create_user
```

---

# Test Categories

## Authentication Tests

Verify:

- User login
- Invalid login
- JWT token generation
- Token refresh
- Unauthorized access
- Password validation

Expected Result:

- Secure authentication
- Valid JWT token
- Proper HTTP status codes

---

## User Management Tests

Test:

- Create user
- Retrieve user
- Update user
- Delete user
- User permissions

---

## Customer Tests

Verify:

- Create customer
- Update customer
- Delete customer
- Search customer
- Retrieve customer list

---

## Vehicle Tests

Verify:

- Add vehicle
- Edit vehicle
- Delete vehicle
- Customer ownership
- Duplicate registration prevention

---

## Service Tests

Verify:

- Create service
- Update service
- Delete service
- Price validation
- Service listing

---

## Booking Tests

Verify:

- Create booking
- Update booking
- Cancel booking
- Booking history
- Booking status

---

## Finance Tests

Verify:

- Add income
- Add expense
- Update transaction
- Delete transaction
- Financial calculations

---

# API Testing

Recommended tools:

- Postman
- Insomnia
- curl
- Django REST Framework Browsable API

---

## Example API Test

Login request.

```
POST /api/auth/login/
```

Example body.

```json
{
    "username": "admin",
    "password": "password123"
}
```

Expected Response.

```json
{
    "access": "...",
    "refresh": "..."
}
```

Status Code:

```
200 OK
```

---

# Validation Testing

Verify:

- Required fields
- Email validation
- Phone validation
- Unique values
- Invalid input
- Maximum length
- Minimum length

Example:

```json
{
    "email": [
        "Enter a valid email address."
    ]
}
```

---

# Permission Testing

Verify:

- Anonymous users
- Authenticated users
- Staff permissions
- Admin permissions

Expected:

```
401 Unauthorized
```

or

```
403 Forbidden
```

when appropriate.

---

# Database Testing

Verify:

- Object creation
- Object update
- Object deletion
- Foreign key relationships
- Cascade deletion
- Transactions

---

# Performance Testing

Check:

- API response time
- Database query count
- Pagination
- Search performance
- Filtering performance

---

# Security Testing

Verify:

- JWT authentication
- Password hashing
- SQL injection protection
- CSRF protection (where applicable)
- Input validation
- Permission enforcement

---

# Manual Testing Checklist

## Authentication

- [ ] Login
- [ ] Logout
- [ ] Refresh Token

---

## Users

- [ ] Create User
- [ ] Edit User
- [ ] Delete User

---

## Customers

- [ ] Create Customer
- [ ] Update Customer
- [ ] Delete Customer

---

## Vehicles

- [ ] Add Vehicle
- [ ] Edit Vehicle
- [ ] Delete Vehicle

---

## Services

- [ ] Create Service
- [ ] Update Service
- [ ] Delete Service

---

## Bookings

- [ ] Create Booking
- [ ] Update Booking
- [ ] Cancel Booking

---

## Finance

- [ ] Add Income
- [ ] Add Expense
- [ ] Update Transaction

---

# Common Test Commands

Run tests.

```bash
python manage.py test
```

Verbose output.

```bash
python manage.py test --verbosity=2
```

Keep the test database.

```bash
python manage.py test --keepdb
```

Fail fast.

```bash
python manage.py test --failfast
```

---

# Future Improvements

Planned testing enhancements:

- Unit tests
- Integration tests
- API automation
- Load testing
- Performance benchmarks
- Continuous Integration (CI)
- GitHub Actions
- Code coverage reports

---

# Best Practices

- Write tests for every new feature.
- Keep tests independent.
- Use descriptive test names.
- Test both success and failure cases.
- Run the full test suite before pushing code.
- Fix failing tests before deployment.

---

# Summary

A consistent testing process helps ensure that Kallayi Car Spa remains reliable, secure, and maintainable. Automated and manual testing together reduce bugs and improve software quality.

---

# Maintainer

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

This project is licensed under the MIT License.