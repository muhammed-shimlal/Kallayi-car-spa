#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> Installing production requirements..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> Collecting static files..."
python manage.py collectstatic --noinput

echo "==> Running database migrations..."
python manage.py migrate

echo "==> Running automated superuser setup..."
python manage.py setup_admin

echo "==> Build completed successfully!"
