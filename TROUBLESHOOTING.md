# TROUBLESHOOTING.md

# 🛠️ Troubleshooting Guide

## Kallayi Car Spa

---

# Overview

This guide provides solutions to common issues that may occur while installing, developing, testing, or deploying the Kallayi Car Spa project.

If you encounter an issue that is not covered here, please open an issue on GitHub with the relevant logs and steps to reproduce the problem.

---

# Table of Contents

- Installation Problems
- Virtual Environment Issues
- Dependency Errors
- Database Problems
- Migration Errors
- Authentication Issues
- API Issues
- Server Problems
- Deployment Problems
- Git Problems

---

# Installation Problems

## Python Not Found

### Error

```text
'python' is not recognized as an internal or external command
```

### Solution

- Install Python from the official website.
- During installation, enable **Add Python to PATH**.
- Verify the installation:

```bash
python --version
```

---

## pip Not Found

### Error

```text
'pip' is not recognized
```

### Solution

```bash
python -m ensurepip --upgrade
```

or

```bash
python -m pip install --upgrade pip
```

---

# Virtual Environment Issues

## Virtual Environment Does Not Activate

### Windows PowerShell

```powershell
venv\Scripts\Activate
```

If you receive an execution policy error:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Then activate the environment again:

```powershell
venv\Scripts\Activate
```

---

### Linux / macOS

```bash
source venv/bin/activate
```

---

# Dependency Errors

## Missing Package

### Error

```text
ModuleNotFoundError
```

### Solution

Install project dependencies:

```bash
pip install -r requirements.txt
```

---

## Upgrade pip

```bash
python -m pip install --upgrade pip
```

---

# Database Problems

## Database Does Not Exist

Run migrations:

```bash
python manage.py migrate
```

---

## Reset SQLite Database (Development Only)

> **Warning:** This deletes all local development data.

Delete the existing database file:

```text
db.sqlite3
```

Delete migration files (except `__init__.py`) if needed, then run:

```bash
python manage.py makemigrations
python manage.py migrate
```

---

# Migration Errors

## Migration Conflict

View migration status:

```bash
python manage.py showmigrations
```

Create missing migrations:

```bash
python manage.py makemigrations
```

Apply migrations:

```bash
python manage.py migrate
```

---

## Fake a Migration

Use only if you understand the implications:

```bash
python manage.py migrate --fake
```

---

# Authentication Issues

## Invalid Credentials

Verify:

- Username
- Password
- JWT token (if required)

If you forgot the admin account, create a new superuser:

```bash
python manage.py createsuperuser
```

---

## Unauthorized (401)

Possible causes:

- Missing access token
- Expired JWT token
- Invalid token

Verify that your request includes:

```text
Authorization: Bearer <access_token>
```

---

## Forbidden (403)

Possible causes:

- Insufficient permissions
- Endpoint restricted to specific user roles

Check the configured permission classes and user permissions.

---

# API Issues

## 404 Not Found

Verify:

- API URL
- URL routing
- Registered endpoints

List all URLs if you use a URL inspection package or review your `urls.py` files.

---

## 500 Internal Server Error

Check:

- Django console output
- Server logs
- Stack trace

With `DEBUG=True` (development only), inspect the detailed error page.

---

# Server Problems

## Port Already in Use

Run Django on another port:

```bash
python manage.py runserver 8001
```

Or stop the process currently using port `8000`.

---

## Development Server Not Starting

Check:

- Virtual environment is activated
- Dependencies are installed
- Database migrations are applied
- Project settings are correct

---

# Static Files Not Loading

Run:

```bash
python manage.py collectstatic
```

Verify your static file settings before deploying to production.

---

# Deployment Problems

## DEBUG Is Enabled

Production should use:

```env
DEBUG=False
```

---

## ALLOWED_HOSTS Error

Example:

```python
ALLOWED_HOSTS = [
    "your-domain.com",
    "www.your-domain.com",
]
```

---

## Environment Variables Missing

Verify your `.env` file or deployment platform settings include:

- `SECRET_KEY`
- Database configuration
- Other required environment variables

---

# Git Problems

## Pull Conflicts

Check the repository status:

```bash
git status
```

Resolve conflicts, then commit the merged changes.

---

## Push Rejected

Update your local branch:

```bash
git pull origin main
```

Resolve conflicts if necessary, then push again:

```bash
git push origin main
```

---

# Performance Issues

If the application feels slow:

- Optimize database queries.
- Enable pagination for large lists.
- Review unnecessary ORM queries.
- Profile slow API endpoints.

---

# Security Checklist

Before deploying:

- [ ] `DEBUG=False`
- [ ] `SECRET_KEY` stored securely
- [ ] HTTPS enabled
- [ ] Database backups configured
- [ ] Latest dependencies installed
- [ ] Authentication tested

---

# Helpful Django Commands

Run the server:

```bash
python manage.py runserver
```

Create migrations:

```bash
python manage.py makemigrations
```

Apply migrations:

```bash
python manage.py migrate
```

Create a superuser:

```bash
python manage.py createsuperuser
```

Run tests:

```bash
python manage.py test
```

Show migrations:

```bash
python manage.py showmigrations
```

Collect static files:

```bash
python manage.py collectstatic
```

---

# Getting Help

Before opening an issue, include:

- Operating system
- Python version
- Django version
- Full error message
- Stack trace (if available)
- Steps to reproduce
- Relevant logs

This information makes it much easier to identify and resolve the issue.

---

# Maintainer

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

This project is licensed under the MIT License.