# 🏗️ Kallayi Car Spa — Technical Architecture & Specifications

This document outlines the high-level system architecture, software engineering design patterns, database schemas, request lifecycles, and security framework powering the **Kallayi Car Spa** application.

---

## 📐 System Architecture Overview

Kallayi Car Spa is built using a decoupled **Client-Server Architecture** separating the presentation layer (**Next.js 16 App Router**) from the backend application services layer (**Django REST Framework**).

```
                                  +---------------------------------------+
                                  |         Next.js 16 Web Client         |
                                  |  (React 19 / TypeScript / Tailwind)   |
                                  +-------------------+-------------------+
                                                      |
                                                      | HTTPS / REST API
                                                      | (Bearer JWT Auth)
                                                      v
                                  +---------------------------------------+
                                  |     Django REST Framework (DRF) API   |
                                  +-------------------+-------------------+
                                                      |
             +--------------------+-------------------+--------------------+--------------------+
             |                    |                   |                    |                    |
             v                    v                   v                    v                    v
      +--------------+    +---------------+   +---------------+    +---------------+    +---------------+
      |  core (Auth) |    |   customers   |   |    bookings   |    |    finance    |    |     fleet     |
      +--------------+    +---------------+   +---------------+    +---------------+    +---------------+
             |                    |                   |                    |                    |
             +--------------------+-------------------+--------------------+--------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          PostgreSQL Database          |
                                  |     (ORM Managed Models & Relations)  |
                                  +-------------------+-------------------+
                                                      |
                                    +-----------------+-----------------+
                                    v                                   v
                      +---------------------------+       +---------------------------+
                      | Cloudinary Media Storage  |       |   SMTP Transactional Mail │
                      | (Receipts & Photos)       |       | (Notifications & Resets)  |
                      +---------------------------+       +---------------------------+
```

---

## 🐍 Backend Architecture (Django REST Framework)

The backend follows Django's modular app architecture, enforcing **Separation of Concerns (SoC)** by isolating domain logic into distinct apps within `backend/`:

### App Domain Partitioning
- **`core`**: Base User model (`CustomUser`), SimpleJWT token generation, role-based permission classes, and **Dual-Verification Password Reset** logic (`password_reset_request` & `password_reset_confirm`).
- **`customers`**: Customer profiles (`Customer`), vehicle records (`CustomerVehicle`), subscription plans (`SubscriptionPlan`, `MemberSubscription`), corporate fleet accounts (`FleetAccount`), reviews, and promotional coupons.
- **`bookings`**: Booking queue management (`Booking`), service packages (`ServicePackage`), chemical recipe linkages, wash bay assignments, technician scheduling, and loyalty points redemption.
- **`finance`**: Multi-mode invoicing (`Invoice`), Digital Khata credit ledger (`KhataLedger`), End-of-Day cash till audits (`DailyRegisterAudit`), daily savings asset deposits (`CollectionBank`), chemical inventory logs (`ChemicalInventory`, `ChemicalUsageLog`), expense management (`GeneralExpense`), and technician payroll entries (`PayrollEntry`).
- **`fleet`**: Mobile service vehicles (`ServiceVehicle`), technician GPS location tracking (`TechnicianLocation`), vehicle assignment history (`VehicleAssignment`), and fleet logs (`FleetLog`).
- **`staff`**: Staff profiles (`StaffProfile`), work assignment tracking, commission rate rules (`CommissionRule`), and salary structures.
- **`notifications`**: Email delivery services (`notifications.services`) and automated background tasks (`send_khata_reminders`).
- **`payments`**: Payment processing endpoints and payment gateway integrations.

---

## ⚛️ Frontend Architecture (Next.js 16)

The frontend application is constructed using **Next.js 16 App Router**, leveraging React 19 Server Components (RSC) for optimized initial page loads and Client Components for dynamic dashboard interactivity.

### Key Architectural Layers
- **Routing & Pages (`src/app/`)**: File-system based routing utilizing App Router layouts, loading states, and error boundaries.
- **UI Components (`src/components/`)**: Modular, reusable UI components built with TailwindCSS v4, Lucide React icons, and animated using GSAP and Framer Motion.
- **State Management & Data Fetching (`src/hooks/`, `src/services/`)**:
  - **TanStack React Query v5**: Server state management, caching, background refetching, and optimistic UI updates.
  - **Axios API Client**: Pre-configured HTTP client with automated request interceptors for attaching JWT Bearer tokens and handling 401 token refresh cycles.
  - **React Hook Form + Zod**: Type-safe client-side form validation schemas.

---

## 🔄 Request & Response Lifecycle

```
[ Client Request ]
       │
       ▼
[ Django URL Routing (urls.py) ]
       │
       ▼
[ SimpleJWT Authentication Middleware ] ──(Invalid Token)──► [ HTTP 401 Unauthorized ]
       │
       ▼
[ DRF Permission Enforcement (permissions.py) ] ──(Denied)──► [ HTTP 403 Forbidden ]
       │
       ▼
[ DRF Serializer Validation (serializers.py) ] ──(Invalid)──► [ HTTP 400 Bad Request ]
       │
       ▼
[ Business Logic & ORM Operations (logic.py / views.py) ]
       │
       ▼
[ Database Transaction Commit / Rollback ]
       │
       ▼
[ JSON Response Formatted & Returned ]
```

---

## 🗄️ Database Architecture & Key Entities

### Core ERD Entity Relationships

```
                                  +-------------------+
                                  |     CustomUser    |
                                  +---------+---------+
                                            |
                       +--------------------+--------------------+
                       | 1:1                                     | 1:1
                       v                                         v
             +-------------------+                     +-------------------+
             |      Customer     |                     |    StaffProfile   |
             +---------+---------+                     +---------+---------+
                       |                                         |
         +-------------+-------------+                           |
         | 1:N                       | 1:N                       | 1:N
         v                           v                           v
+------------------+       +------------------+        +------------------+
| CustomerVehicle  |       |   KhataLedger    |        |   PayrollEntry   |
+--------+---------+       +------------------+        +------------------+
         |                                                       ^
         | 1:N                                                   |
         v                                                       |
+----------------------------------------------------------------+--+
|                            Booking                                |
+--------------------------------+----------------------------------+
                                 | 1:1
                                 v
                        +------------------+
                        |     Invoice      |
                        +------------------+
```

---

## 🔐 Security Architecture

1. **Authentication Framework**:
   - **SimpleJWT**: Stateless token-based auth. Short-lived access tokens + long-lived refresh tokens.
   - **Password Hashing**: Uses Django's default PBKDF2 with SHA-256 password hashing.
2. **Dual-Verification Password Reset Security**:
   - Verifies **Email AND Phone Number** against database records prior to token generation.
   - Generates cryptographically secure `uidb64` and `default_token_generator` single-use reset links.
3. **Data Integrity & Financial Protection**:
   - `DailyRegisterAudit` locks daily transaction records after cash till reconciliation.
   - Atomic database transactions (`@transaction.atomic`) wrap all invoice processing and Khata ledger modifications to prevent partial state updates.

---

## 🚀 Cloud Infrastructure & Deployment Architecture

```
[ Frontend: Vercel Edge Network ] ──(REST/JSON)──► [ Backend: Render / Railway App Container ]
                                                             │
                                          ┌──────────────────┴──────────────────┐
                                          ▼                                     ▼
                               [ PostgreSQL Database ]              [ Cloudinary Asset Storage ]
```

- **Frontend Deployment**: **Vercel** with automated CI/CD pipeline linked to GitHub `main` branch.
- **Backend Deployment**: Containerized Python WSGI/ASGI application deployed on **Render** or **Railway**.
- **Media Storage**: **Cloudinary** for scalable image storage (vehicle damage scans, expense receipt uploads).
- **Database**: Managed **PostgreSQL** instance with SSL connection enforcement.