# Car Spa ERP - Backend System

Professional-grade ERP system for Car Wash & Detailing operations, built with Django & Django Rest Framework.

## Core Modules

### 1. Finance (`/finance`)
-   **Automated Ledger**: Tracks Revenue, Expenses (COGS like Chemicals), and Labor Costs.
-   **Invoicing**: Auto-generates invoices on job completion.
-   **Payroll**: Calculates commissions automatically based on `CommissionRule`.

### 2. Fleet & Customers (`/fleet`, `/customers`)
-   **B2B Fleet**: Manage corporate accounts and vehicle lists.
-   **Subscriptions**: Logic for Membership Plans (Monthly/Yearly) and Auto-renewals.
-   **Loyalty**: Points accumulation and redemption logic.

### 3. Bookings & Operations (`/bookings`, `/staff`)
-   **Smart Scheduling**: Checks Technician availability before confirming slots.
-   **Staff App API**: Endpoint for Clock-In/Out (GPS), Job Inspection, and SOP Checklists.
-   **Driver App API**: Manage job status (`PENDING` -> `IN_PROGRESS` -> `COMPLETED`).

### 4. Payments (`/payments`)
-   **Stripe Integration**: Secure PaymentIntent flow with Webhook reconciliation.
-   **Security**: No sensitive card data stored locally.

## Key APIs

| Feature | Endpoint | Method | Role |
| :--- | :--- | :--- | :--- |
| **Owner Dashboard** | `/api/finance/dashboard/kpi_summary/` | GET | Admin |
| **Staff Clock-In** | `/api/staff/time-entries/clock_in/` | POST | Worker |
| **Available Slots** | `/api/bookings/available_slots/` | GET | Public |
| **Create Booking** | `/api/bookings/` | POST | User |
| **Redeem Points** | `/api/customers/redeem_points/` | POST | User |

## Setup & Running

1.  **Install Requirements**:
    ```bash
    pip install -r requirements.txt
    ```

2.  **Environment Variables**:
    Create a `.env` file (or set in settings):
    -   `STRIPE_SECRET_KEY`
    -   `STRIPE_PUBLISHABLE_KEY`
    -   `STRIPE_WEBHOOK_SECRET`

3.  **Run Server**:
    ```bash
    python manage.py runserver 0.0.0.0:8000
    ```

4.  **Create Admin**:
    ```bash
    python manage.py createsuperuser
    ```

## Testing
Run the system verification suite:
```bash
python manage.py test
```
*(Note: Mock verification scripts were used during development and cleaned up).*
