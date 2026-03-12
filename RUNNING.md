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

