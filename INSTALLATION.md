# INSTALLATION.md

# 🚀 Installation Guide

This guide explains how to set up and run the **Kallayi Car Spa** project on your local machine.

---

# 📋 Prerequisites

Before you begin, make sure the following software is installed:

| Software | Recommended Version |
|----------|----------------------|
| Python | 3.11+ |
| Git | Latest |
| pip | Latest |
| Virtual Environment (venv) | Built into Python |
| PostgreSQL (Optional) | 15+ |
| SQLite | Built into Python |

---

# 📥 Clone the Repository

Clone the project from GitHub.

```bash
git clone https://github.com/muhammed-shimlal/Kallayi-car-spa.git
```

Move into the project directory.

```bash
cd Kallayi-car-spa
```

---

# 🐍 Create a Virtual Environment

## Windows (PowerShell)

```powershell
python -m venv venv
```

Activate it:

```powershell
venv\Scripts\Activate
```

---

## Windows (Command Prompt)

```cmd
python -m venv venv

venv\Scripts\activate.bat
```

---

## Linux / macOS

```bash
python3 -m venv venv

source venv/bin/activate
```

---

# 📦 Install Dependencies

Upgrade pip.

```bash
python -m pip install --upgrade pip
```

Install project dependencies.

```bash
pip install -r requirements.txt
```

---

# ⚙ Configure Environment Variables

Create a `.env` file in the project root if your project uses environment variables.

Example:

```env
DEBUG=True

SECRET_KEY=your-secret-key

ALLOWED_HOSTS=127.0.0.1,localhost

DATABASE_URL=sqlite:///db.sqlite3
```

> **Note:** Replace these values with your own configuration before deploying to production.

---

# 🗄 Database Setup

Apply database migrations.

```bash
python manage.py makemigrations

python manage.py migrate
```

---

# 👤 Create an Admin User

Create a Django superuser.

```bash
python manage.py createsuperuser
```

Follow the prompts:

```
Username:

Email:

Password:
```

---

# ▶ Start the Development Server

Run the server.

```bash
python manage.py runserver
```

The application will be available at:

```
http://127.0.0.1:8000/
```

---

# 🔑 Admin Panel

Visit:

```
http://127.0.0.1:8000/admin/
```

Login using the superuser credentials created earlier.

---

# 📚 API Documentation

If API documentation (Swagger/ReDoc) is enabled:

```
/swagger/

/redoc/
```

---

# 🧪 Run Tests

Execute the test suite.

```bash
python manage.py test
```

---

# 📂 Project Structure

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
├── manage.py
├── requirements.txt
├── README.md
└── ...
```

---

# 🔄 Updating the Project

Pull the latest changes.

```bash
git pull origin main
```

Install any new dependencies.

```bash
pip install -r requirements.txt
```

Apply new migrations.

```bash
python manage.py migrate
```

---

# 🛑 Stopping the Development Server

Press:

```
CTRL + C
```

---

# ❓ Troubleshooting

## Virtual Environment Does Not Activate

Recreate the virtual environment.

```bash
python -m venv venv
```

---

## Missing Dependencies

Install all dependencies again.

```bash
pip install -r requirements.txt
```

---

## Database Errors

Run migrations.

```bash
python manage.py makemigrations

python manage.py migrate
```

---

## Port Already in Use

Run Django on another port.

```bash
python manage.py runserver 8001
```

---

# 📌 Notes

- Keep `requirements.txt` up to date.
- Never commit `.env` files or secret keys.
- Use PostgreSQL for production deployments.
- Always activate the virtual environment before running the project.

---

# 📄 License

This project is licensed under the MIT License.

---

**Maintainer:** Muhammed Shimlal

GitHub: https://github.com/muhammed-shimlal/Kallayi-car-spa