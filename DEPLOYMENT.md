# Kallayi Car Spa - Deployment Guide

## Backend Deployment

### Local Development Setup

1. **Install Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Environment Configuration**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your values
# SECRET_KEY: Generate with: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
# DEBUG: Set to False for production
# ALLOWED_HOSTS: Add your domain/IP addresses
```

3. **Database Setup**
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

4. **Collect Static Files**
```bash
python manage.py collectstatic --noinput
```

5. **Run with Gunicorn (Production)**
```bash
gunicorn --bind 0.0.0.0:8000 --workers 3 config.wsgi:application
```

---

### Docker Deployment

1. **Build Docker Image**
```bash
cd backend
docker build -t kallayi-backend .
```

2. **Run Container**
```bash
docker run -d \
  -p 8000:8000 \
  -e SECRET_KEY='your-secret-key' \
  -e DEBUG=False \
  -e ALLOWED_HOSTS='yourdomain.com,www.yourdomain.com' \
  --name kallayi-backend \
  kallayi-backend
```

3. **Run Migrations in Container**
```bash
docker exec kallayi-backend python manage.py migrate
docker exec kallayi-backend python manage.py createsuperuser
```

---

## Frontend Deployment

### Development Build

1. **Install Dependencies**
```bash
cd frontend
flutter pub get
```

2. **Run App (Debug)**
```bash
flutter run
```

---

### Production Build

1. **Generate App Icons**
```bash
flutter pub run flutter_launcher_icons
```

2. **Generate Splash Screens**
```bash
dart run flutter_native_splash:create
```

3. **Build Release APK (Android)**
```bash
flutter build apk --release
```

The APK will be located at: `build/app/outputs/flutter-apk/app-release.apk`

4. **Build App Bundle (For Play Store)**
```bash
flutter build appbundle --release
```

5. **Build iOS (Mac only)**
```bash
flutter build ios --release
```

---

## Security Checklist

- [x] SECRET_KEY moved to environment variable
- [x] DEBUG set to False in production
- [x] ALLOWED_HOSTS configured properly
- [x] Static files served via Whitenoise
- [x] Gunicorn configured as WSGI server
- [ ] HTTPS/SSL certificate configured (required for production)
- [ ] Database backups configured
- [ ] Firewall rules configured
- [ ] CORS origins restricted to known domains

---

## Performance Tips

1. **Backend**
   - Use PostgreSQL instead of SQLite in production
   - Enable Redis for caching
   - Configure CDN for static files
   - Set up monitoring (Sentry, etc.)

2. **Frontend**
   - Enable ProGuard/R8 shrinking
   - Optimize images in assets
   - Use release mode always in production
   - Configure proper API endpoints (no localhost)

---

## Troubleshooting

**Backend won't start:**
- Check `.env` file exists and is properly formatted
- Verify all environment variables are set
- Run `python manage.py check` to diagnose issues

**Static files not loading:**
- Run `python manage.py collectstatic`
- Verify STATIC_ROOT path is correct
- Check whitenoise middleware order

**Frontend build errors:**
- Run `flutter clean && flutter pub get`
- Verify logo.png exists in assets/images/
- Check pubspec.yaml for syntax errors
