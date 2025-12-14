# Kallayi Car Spa - Project Setup & Run Guide

## 1. Backend (Django)

The backend manages the database, API, and core logic.

### Prerequisites
- Python 3.10+
- PostgreSQL (or SQLite for development)

### Running the Server
1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```
2.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
3.  **Run Migrations:**
    ```bash
    python manage.py migrate
    ```
4.  **Create Superuser (Optional, for Admin access):**
    ```bash
    python manage.py createsuperuser
    ```
5.  **Start the Server:**
    ```bash
    python manage.py runserver 0.0.0.0:8001
    ```
    *The server will run at `http://localhost:8001` (or your local IP).*

---

## 2. Frontend (Flutter)

The mobile application for Owners, Staff, and Customers.

### Prerequisites
- Flutter SDK
- Android Studio / VS Code with Flutter plugins
- An Android Device or Emulator

### Running the App
1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install Dependencies:**
    ```bash
    flutter pub get
    ```
3.  **Configure API URL (Important for Physical Devices):**
    - Open `lib/services/api_service.dart`.
    - **Emulator**: Use `http://10.0.2.2:8001` (Default).
    - **Physical Phone**: Change `baseUrl` to your PC's Local IP (e.g., `http://192.168.1.5:8001`).
        - *Find IP by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux).*

4.  **Run the App:**
    ```bash
    flutter run
    ```

---

## 3. Useful Links
- **Admin Panel**: [http://localhost:8001/admin/](http://localhost:8001/admin/)
- **API Finance Dashboard**: [http://localhost:8001/api/finance/dashboard/kpi_summary/](http://localhost:8001/api/finance/dashboard/kpi_summary/)

