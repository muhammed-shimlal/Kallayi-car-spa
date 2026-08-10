# 📘 Kallayi Car Spa — Installation & Setup Guide

This guide provides step-by-step instructions for setting up the **Kallayi Car Spa** full-stack system locally on your development machine. The system consists of a **Django REST Framework (DRF)** backend and a **Next.js 16** frontend.

---

## 📋 System Requirements & Prerequisites

Before starting, ensure you have the following installed on your system:

| Software | Minimum Version | Recommended Version | Download Link |
| :--- | :--- | :--- | :--- |
| **Python** | 3.11+ | 3.11.x / 3.12.x | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18.0+ | 20.x LTS | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.0+ | 10.x | Included with Node.js |
| **Git** | 2.30+ | Latest | [git-scm.com](https://git-scm.com/) |
| **PostgreSQL** (Optional for local dev) | 14.0+ | 15.x / 16.x | [postgresql.org](https://www.postgresql.org/) |

> **Note:** By default, the local backend uses SQLite (`db.sqlite3`), so installing PostgreSQL is optional for local development.

---

## 📥 Step 1: Clone the Repository

Clone the project repository to your local computer and navigate into the root directory:

```bash
git clone https://github.com/muhammed-shimlal/Kallayi-car-spa.git
cd Kallayi-car-spa
```

---

## 🐍 Step 2: Backend Setup (Django REST Framework)

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Create Python Virtual Environment
Creating a virtual environment ensures dependencies are isolated from your system Python.

- **On Windows (PowerShell / Command Prompt):**
  ```powershell
  python -m venv venv
  ```
- **On Linux / macOS:**
  ```bash
  python3 -m venv venv
  ```

### 3. Activate Virtual Environment
- **On Windows (PowerShell):**
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
  *(If execution is blocked, run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process`)*
- **On Windows (Command Prompt):**
  ```cmd
  venv\Scripts\activate.bat
  ```
- **On Linux / macOS:**
  ```bash
  source venv/bin/activate
  ```

Once activated, your terminal prompt will show `(venv)`.

### 4. Install Dependencies
Upgrade `pip` and install all required Python packages:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Configure Environment Variables (`.env`)
Create a `.env` file in the `backend/` directory by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` in your text editor and fill in the configuration values:

```env
# Django Core Settings
DEBUG=True
SECRET_KEY=django-insecure-change-this-to-a-secure-random-key-in-production
ALLOWED_HOSTS=127.0.0.1,localhost

# Database Configuration
# Leave blank for default SQLite (db.sqlite3) or specify a PostgreSQL connection string:
# DATABASE_URL=postgres://postgres:password@localhost:5432/kallayi_car_spa
DATABASE_URL=sqlite:///db.sqlite3

# Cloudinary Media Storage (Optional for local dev, Required for media uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (Used for password reset & notification alerts)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password
DEFAULT_FROM_EMAIL=Kallayi Car Spa <kallayicarspa@gmail.com>

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 6. Apply Database Migrations
Run the initial database migrations to create all database tables for users, customers, bookings, finance, fleet, and staff:

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create Superuser / Admin Account
Execute the custom automated admin setup management command or create a superuser manually:

```bash
# Automated setup (Creates default admin user):
python manage.py setup_admin

# OR create manually:
python manage.py createsuperuser
```

### 8. (Optional) Seed Test Data
To populate your database with dummy customers, vehicles, service packages, and staff for testing:

```bash
python manage.py seed_full_db
```

### 9. Start Backend Server
Start the Django development server:

```bash
python manage.py runserver
```

The REST API is now live at: **`http://127.0.0.1:8000/api/`**  
The Django Admin Panel is accessible at: **`http://127.0.0.1:8000/admin/`**

---

## ⚛️ Step 3: Frontend Setup (Next.js 16)

Open a **new terminal window** (keep the backend server running in the first terminal).

### 1. Navigate to Frontend Directory
```bash
cd kallayi_car_spa_frontend
```

### 2. Install Node Dependencies
Install all required Node modules:

```bash
npm install
```

### 3. Configure Frontend Environment Variables (`.env.local`)
Create a `.env.local` file in `kallayi_car_spa_frontend/`:

```bash
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
```

File content of `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 4. Start Next.js Development Server
Run the local development server:

```bash
npm run dev
```

The web interface is now accessible at: **`http://localhost:3000`**

---

## ✅ Step 4: Verification & Testing

### 1. Verify API Health
Open your browser and navigate to:
```
http://127.0.0.1:8000/api/
```
You should see the Django REST Framework root API interface listing available endpoints.

### 2. Test Admin Authentication
1. Go to `http://127.0.0.1:8000/admin/`.
2. Log in using your superuser credentials.
3. Verify access to models (`Users`, `Customers`, `Bookings`, `Invoices`, `KhataLedger`, `CollectionBank`).

### 3. Run Automated Backend Tests
To ensure all API endpoints, permission policies, and finance workflows pass test suites:

```bash
cd backend
python manage.py test
```

---

## 🛠️ Troubleshooting Common Setup Issues

### ❌ Issue: Virtual Environment Fails to Activate on Windows PowerShell
**Symptom:** `cannot be loaded because running scripts is disabled on this system.`  
**Fix:** Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

### ❌ Issue: CORS Errors on Frontend API Requests
**Symptom:** Browser console displays `Access-Control-Allow-Origin` error when calling API.  
**Fix:**
1. Check `backend/.env` and ensure `CORS_ALLOWED_ORIGINS` includes `http://localhost:3000`.
2. Restart the Django development server (`python manage.py runserver`).

### ❌ Issue: Password Reset Email Fails to Send
**Symptom:** Error notification during password reset test.  
**Fix:**
- Ensure `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` in `backend/.env` are properly set. For Gmail, use an **App Password** (not your regular Gmail password).
- In development, you can set `EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend` in `.env` to log emails directly to the console instead of sending them.

### ❌ Issue: Port 8000 or 3000 Already in Use
**Fix:**
- **Backend on alternative port:** `python manage.py runserver 8001` (remember to update `NEXT_PUBLIC_API_URL` to `http://localhost:8001/api`).
- **Frontend on alternative port:** `npm run dev -- -p 3001`.

---

## 📌 Summary Checklist

- [x] Python 3.11+ & Node.js 18+ verified
- [x] Backend virtual environment created & activated
- [x] Backend `.env` configured
- [x] Migrations executed & Admin user created
- [x] Backend running on `http://127.0.0.1:8000`
- [x] Frontend `npm install` completed
- [x] Frontend `.env.local` configured
- [x] Frontend running on `http://localhost:3000`