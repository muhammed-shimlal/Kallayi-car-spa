# DEPLOYMENT.md

# 🚀 Deployment Guide

## Kallayi Car Spa

---

# Overview

This document explains how to deploy the **Kallayi Car Spa** Django REST API to a production environment.

The project supports deployment on:

- Render
- Railway
- DigitalOcean
- AWS EC2
- VPS (Ubuntu)
- Docker

---

# Production Requirements

## Software

| Software | Version |
|-----------|----------|
| Python | 3.11+ |
| PostgreSQL | 15+ |
| Git | Latest |
| Gunicorn | Latest |
| Nginx | Latest |
| Ubuntu | 22.04 LTS (Recommended) |

---

# Environment Variables

Create a `.env` file.

Example:

```env
DEBUG=False

SECRET_KEY=your-secret-key

ALLOWED_HOSTS=your-domain.com,www.your-domain.com

DATABASE_URL=postgresql://username:password@host:5432/database

JWT_SECRET_KEY=your-jwt-secret

CSRF_TRUSTED_ORIGINS=https://your-domain.com

CORS_ALLOWED_ORIGINS=https://your-domain.com
```

> Never commit the `.env` file to GitHub.

---

# Install Dependencies

```bash
pip install -r requirements.txt
```

---

# Collect Static Files

```bash
python manage.py collectstatic --noinput
```

---

# Apply Database Migrations

```bash
python manage.py migrate
```

---

# Create Superuser

```bash
python manage.py createsuperuser
```

---

# Production Server

Install Gunicorn.

```bash
pip install gunicorn
```

Run:

```bash
gunicorn config.wsgi:application
```

Replace `config` with your Django project's actual configuration package if it has a different name.

---

# PostgreSQL Setup

Install PostgreSQL.

Ubuntu:

```bash
sudo apt update

sudo apt install postgresql postgresql-contrib
```

Create a database.

```sql
CREATE DATABASE kallayi_car_spa;
```

Create a user.

```sql
CREATE USER carspa_user WITH PASSWORD 'your_password';
```

Grant privileges.

```sql
GRANT ALL PRIVILEGES ON DATABASE kallayi_car_spa TO carspa_user;
```

---

# Nginx Configuration

Example configuration:

```nginx
server {

    listen 80;

    server_name your-domain.com;

    location / {

        proxy_pass http://127.0.0.1:8000;

        proxy_set_header Host $host;

        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    }

}
```

Restart Nginx.

```bash
sudo systemctl restart nginx
```

---

# HTTPS

Install Certbot.

```bash
sudo apt install certbot python3-certbot-nginx
```

Generate SSL.

```bash
sudo certbot --nginx
```

---

# Deploy on Render

1. Push the project to GitHub.
2. Create a new **Web Service** in Render.
3. Connect the GitHub repository.
4. Configure:
   - **Build Command**

     ```bash
     pip install -r requirements.txt
     ```

   - **Start Command**

     ```bash
     gunicorn config.wsgi:application
     ```

5. Add the required environment variables.
6. Deploy the application.

---

# Deploy on Railway

1. Push the project to GitHub.
2. Create a new Railway project.
3. Connect the GitHub repository.
4. Add PostgreSQL.
5. Configure environment variables.
6. Deploy.

---

# Deploy Using Docker

## Dockerfile

```dockerfile
FROM python:3.11

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt

CMD ["gunicorn", "config.wsgi:application"]
```

---

Build the image.

```bash
docker build -t kallayi-car-spa .
```

Run the container.

```bash
docker run -p 8000:8000 kallayi-car-spa
```

---

# Health Check

Verify the deployment.

```
https://your-domain.com/
```

API example:

```
https://your-domain.com/api/
```

---

# Deployment Checklist

- [ ] Debug disabled
- [ ] Secret key stored securely
- [ ] Environment variables configured
- [ ] PostgreSQL configured
- [ ] Static files collected
- [ ] Migrations applied
- [ ] Superuser created
- [ ] HTTPS enabled
- [ ] Backups configured
- [ ] Monitoring enabled

---

# Backup Strategy

Database backup.

```bash
pg_dump database_name > backup.sql
```

Restore.

```bash
psql database_name < backup.sql
```

---

# Monitoring

Recommended tools:

- UptimeRobot
- Grafana
- Prometheus
- Sentry

---

# Common Deployment Issues

## Static Files Not Loading

Run:

```bash
python manage.py collectstatic --noinput
```

---

## Database Connection Error

Verify:

- Database credentials
- `DATABASE_URL`
- PostgreSQL service status

---

## 502 Bad Gateway

Check:

- Gunicorn status
- Nginx configuration
- Application logs

---

## Module Import Error

Reinstall dependencies.

```bash
pip install -r requirements.txt
```

---

# Security Recommendations

- Enable HTTPS
- Keep dependencies updated
- Rotate secret keys
- Restrict database access
- Use strong passwords
- Regularly back up the database

---

# Future Deployment Improvements

- Docker Compose
- Kubernetes
- GitHub Actions (CI/CD)
- Automatic deployments
- Multi-environment configuration
- Load balancing
- Redis caching
- Celery background tasks

---

# Maintainer

**Muhammed Shimlal**

GitHub:

https://github.com/muhammed-shimlal/Kallayi-car-spa

---

# License

This project is licensed under the MIT License.