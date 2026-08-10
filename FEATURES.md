# 🚗 Kallayi Car Spa — Detailed Features & Business Logic Guide

This document provides an in-depth breakdown of the business logic, architectural design decisions, financial accounting mechanics, security workflows, and core operational modules powering **Kallayi Car Spa**.

---

## 📖 Table of Contents
1. [💳 Advanced Finance Module](#1-advanced-finance-module)
   - [Digital Khata (Credit Tracking Ledger)](#a-digital-khata-credit-tracking-ledger)
   - [Daily Collection Bank (Savings Asset System)](#b-daily-collection-bank-savings-asset-system)
   - [End-of-Day (EOD) Register Audit & Data Lock](#c-end-of-day-eod-register-audit--data-lock)
   - [Invoice Split Payment Engine](#d-invoice-split-payment-engine)
   - [Technician Commission & Chemical Recipe Engine](#e-technician-commission--chemical-recipe-engine)
2. [🔒 Enterprise Security & Authentication](#2-enterprise-security--authentication)
   - [Dual-Verification Password Reset Flow](#a-dual-verification-password-reset-flow)
   - [Stateless JWT Authentication Pipeline](#b-stateless-jwt-authentication-pipeline)
   - [Role-Based Access Control (RBAC)](#c-role-based-access-control-rbac)
3. [📅 Queue & Booking Management Engine](#3-queue--booking-management-engine)
   - [Booking Status Lifecycle](#a-booking-status-lifecycle)
   - [Bay Assignment & Technician Dispatch](#b-bay-assignment--technician-dispatch)
   - [Loyalty Points & Coupon Redemption](#c-loyalty-points--coupon-redemption)
4. [🚚 Fleet & Mobile Detailer Management](#4-fleet--mobile-detailer-management)
5. [👥 Customer & Subscription System](#5-customer--subscription-system)
6. [🔔 Automated Notifications & Reminders](#6-automated-notifications--reminders)

---

## 1. 💳 Advanced Finance Module

The financial architecture of Kallayi Car Spa is built to model real-world vehicle service center operations, handling cash flow, credit accounts, asset savings, split invoices, and employee commission tracking.

```
                           ┌──────────────────────────────────────────────┐
                           │            Total Daily Service Revenue       │
                           └──────────────────────┬───────────────────────┘
                                                  │
                ┌─────────────────────────────────┼─────────────────────────────────┐
                ▼                                 ▼                                 ▼
   ┌──────────────────────────┐      ┌──────────────────────────┐      ┌──────────────────────────┐
   │ Cash / Card / Online Invs│      │  Digital Khata (Credit)  │      │ Daily Collection Bank    │
   │ Direct Income Settlement │      │ Ledger CHARGE Transaction│      │ Operational Asset Deposit│
   └──────────────────────────┘      └──────────────────────────┘      └──────────────────────────┘
```

### A. Digital Khata (Credit Tracking Ledger)

Many regular and corporate customers maintain running credit accounts ("Khata") with the car spa rather than paying cash for every wash. 

#### Ledger Architecture:
- **Double-Entry Transaction Logging**: Implemented via the `KhataLedger` model with two transaction types:
  - `CHARGE`: Added when a customer requests a wash on credit or splits an invoice. Increases outstanding balance.
  - `SETTLEMENT`: Added when a customer pays down their balance. Decreases outstanding balance.
- **Credit Limit Enforcement**: Each customer profile (`Customer`) stores `credit_limit` and `outstanding_balance`.
  - When an invoice is charged to Khata, the system calculates `new_balance = outstanding_balance + amount`.
  - If `new_balance > credit_limit`, the API rejects the transaction with an `HTTP 400 Bad Request` ("Credit limit exceeded").
- **Automatic Balance Synchronization**: Django database signals (`post_save` on `KhataLedger`) automatically recalculate and update `Customer.outstanding_balance` in a thread-safe transaction block.

### B. Daily Collection Bank (Savings Asset System)

#### Business Problem:
In daily retail wash operations, business owners frequently set aside a specific cash portion from daily revenue as liquidity reserves, emergency funds, or capital investment savings prior to general expense allocation.

#### Implementation (`CollectionBank` Model):
- **Asset Ledger**: Represents daily deposits set aside into a dedicated collection asset account.
- **Uniqueness Constraint**: Enforces one unique record per date (`date = models.DateField(default=timezone.localdate, unique=True)`), preventing accidental duplicate entries for the same operating day.
- **Auditability**: Logs the exact amount deposited, optional administrator notes, the recording user (`recorded_by`), and auto-managed timestamps (`created_at`, `updated_at`).

### C. End-of-Day (EOD) Register Audit & Data Lock

- **Table**: `DailyRegisterAudit`
- **Purpose**: At the end of each business day, an administrator closes the cash register by entering the physical till count.
- **Data Lock Mechanism**:
  - The audit record stores `gross_revenue`, `expected_cash_in_till`, `total_expenses`, and `actual_cash_counted`.
  - Once an audit record is created and marked as closed (`closed_at`), historical booking and finance API endpoints block modifications for transactions dated on or before that audit date, ensuring financial integrity for accounting.

### D. Invoice Split Payment Engine

- **Model**: `Invoice`
- **Supported Payment Modes**: `CASH`, `CARD`, `ONLINE`, and `SPLIT`.
- **Split Payment Workflow**:
  - Customers can pay a single bill using multiple payment channels (e.g., a ₹1,000 wash paid with ₹400 Cash and ₹600 charged to Khata).
  - The invoice stores `split_cash`, `split_card`, `split_online`, and `split_khata` breakdown fields.
  - When `split_khata > 0`, the system automatically creates a corresponding `CHARGE` entry in `KhataLedger` linked directly to the `Invoice` and `Customer`.

### E. Technician Commission & Chemical Recipe Engine

- **Commission Rules (`CommissionRule`)**: Defines either flat-rate (e.g., ₹50 per wash) or percentage-based (e.g., 15% of wash package price) commission rates.
- **Chemical Recipes (`ChemicalRecipe`)**: Maps service packages to chemical inventory logs (`ChemicalInventory`, `ChemicalUsageLog`), tracking foam shampoo, wax polish, and tire shine usage per service package.
- **Payroll Integration (`PayrollEntry`)**: Upon booking completion, `finance.logic.process_payroll_event()` automatically calculates technician earnings, creates a pending `PayrollEntry`, and logs chemical consumption.

---

## 2. 🔒 Enterprise Security & Authentication

### A. Dual-Verification Password Reset Flow

To prevent unauthorized password resets and account takeover attacks, Kallayi Car Spa uses a **Dual-Verification Password Reset System**.

```
[ User Requests Reset ]
        │
        ▼
[ API Input: Email + Phone Number ]
        │
        ▼
[ Backend Verification ] ──(Mismatch)──► [ HTTP 400: Security Verification Failed ]
        │ (Match Found)
        ▼
[ Generate Signed Token (uidb64 + token) ]
        │
        ▼
[ HTML Email Dispatched to User ]
        │
        ▼
[ User Clicks Reset Link ] ──► [ Input New Password ] ──► [ Password Updated ]
```

1. **Step 1 — Request (`POST /api/password-reset/`)**:
   - The user must provide **BOTH** their registered `email` AND their registered `phone_number`.
   - The API verifies that an active user exists where `user.email == email` **AND** `user.customer.phone == phone_number`.
   - If either value is missing or does not match the database pair, the API returns a generic verification failure error, masking internal user existence details.

2. **Step 2 — Token Generation & Email Dispatch**:
   - Upon successful dual verification, Django generates a base64-encoded user ID (`uidb64`) and a cryptographically signed single-use reset token (`default_token_generator`).
   - An HTML email containing the frontend reset link (`http://localhost:3000/reset-password/{uidb64}/{token}`) is compiled and dispatched via Django's SMTP backend.

3. **Step 3 — Confirmation (`POST /api/password-reset-confirm/`)**:
   - The user enters their new password on the Next.js reset page.
   - The API validates the `uidb64` payload and checks token freshness before saving the updated password hash (`set_password`).

### B. Stateless JWT Authentication Pipeline

- **Token Pair Execution**: Uses `djangorestframework-simplejwt`.
- **Access Token**: Short-lived (e.g., 60 minutes) bearer token sent in HTTP `Authorization: Bearer <token>` headers.
- **Refresh Token**: Long-lived token stored securely to request fresh access tokens without requiring re-login.

### C. Role-Based Access Control (RBAC)

Access permissions are enforced dynamically across DRF API ViewSets via custom permission classes (`IsAdminUser`, `IsStaffMember`, `IsCustomerOwner`):

| User Role | Dashboard Access | Booking Operations | Khata & Finance | System Admin |
| :--- | :--- | :--- | :--- | :--- |
| **System Admin** | Full Access | Full Access | Full Access | Full Access |
| **Staff / Technician** | Technician Workspace | View Assigned / Update Status | View Commission Payouts | No Access |
| **Customer** | Customer Portal | Book Services / View Own Queue | View Own Invoices & Khata | No Access |

---

## 3. 📅 Queue & Booking Management Engine

### A. Booking Status Lifecycle

Bookings transition through a strict state machine to prevent race conditions:

```
[ PENDING ] ──► [ CONFIRMED ] ──► [ IN_PROGRESS ] ──► [ COMPLETED ]
     │                │                  │
     └────────────────┴──────────────────┴──────────► [ CANCELLED ]
```

- **`PENDING`**: Customer creates an online booking or walk-in appointment.
- **`CONFIRMED`**: Admin/Staff approves schedule and reserves bay slot.
- **`IN_PROGRESS`**: Technician begins service; start time recorded (`start_time`).
- **`COMPLETED`**: Service finished; end time recorded (`end_time`), invoice generated, points awarded, and payroll commission logged.
- **`CANCELLED`**: Booking cancelled before execution.

### B. Bay Assignment & Technician Dispatch

- **Wash Bays**: Assigns specific wash bays (`bay_assignment`) to avoid scheduling overlaps.
- **Technician Allocation**: Assigns staff technicians to bookings, allowing workload tracking and performance monitoring.

### C. Loyalty Points & Coupon Redemption

- **Points Earned**: Customers earn loyalty points on every completed booking.
- **Redemption**: Points can be redeemed during booking creation (`points_redeemed`), applying a calculated discount to the gross service total.
- **Promotional Coupons**: Validates code applicability, expiration date, usage limits, and minimum spending thresholds (`Coupon` model).

---

## 4. 🚚 Fleet & Mobile Detailer Management

For on-site mobile detailing services and company service vehicles:

- **Service Vehicle Tracking (`ServiceVehicle`)**: Tracks fleet vehicles, license plates, insurance expiry, and operational availability.
- **Live Location Updates (`TechnicianLocation`)**: Technicians transmit current GPS latitude and longitude coordinates, allowing real-time mapping on the admin dashboard.
- **Vehicle Assignment Logs (`VehicleAssignment`, `FleetLog`)**: Maintains history of which technician was assigned to which fleet vehicle for specific customer visits.

---

## 5. 👥 Customer & Subscription System

- **Multi-Vehicle Customer Accounts**: A single customer profile can store an unlimited number of vehicles (`CustomerVehicle`) with details like make, model, registration number, color, and vehicle size category (Hatchback, Sedan, SUV, Truck).
- **Membership Subscriptions (`MemberSubscription`)**: Supports monthly or annual wash passes (`SubscriptionPlan`), featuring recurring wash allowances and automated invoice renewal.
- **Corporate Fleet Accounts (`FleetAccount`)**: Enables businesses with vehicle fleets to aggregate billing into a unified monthly account with custom payment terms.

---

## 6. 🔔 Automated Notifications & Reminders

### Transactional Email Service (`notifications.services`)
- Sends rich HTML emails for booking confirmations, service status updates, and password reset requests.
- Employs fallback console logging in development environments when SMTP settings are unconfigured.

### Automated Khata Reminder Cron Task (`send_khata_reminders`)
- **CLI Management Command**: `python manage.py send_khata_reminders`
- **Execution**: Can be executed manually or scheduled via cron / systemd timer.
- **Behavior**: Scans `Customer` records with `outstanding_balance > 0`, checks notification history, and dispatches automated payment reminder emails containing balance summaries and payment instructions.