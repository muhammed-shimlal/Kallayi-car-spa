import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

class Command(BaseCommand):
    help = 'Automatically and securely setup the initial superuser from environment variables'

    def handle(self, *args, **options):
        User = get_user_model()

        # Read environment variables (supports both os.environ and decouple config)
        email = (os.environ.get('DJANGO_SUPERUSER_EMAIL') or config('DJANGO_SUPERUSER_EMAIL', default='')).strip()
        password = (os.environ.get('DJANGO_SUPERUSER_PASSWORD') or config('DJANGO_SUPERUSER_PASSWORD', default='')).strip()
        username = (os.environ.get('DJANGO_SUPERUSER_USERNAME') or config('DJANGO_SUPERUSER_USERNAME', default='')).strip()

        if not email or not password:
            self.stdout.write(
                self.style.WARNING(
                    '[WARNING] DJANGO_SUPERUSER_EMAIL or DJANGO_SUPERUSER_PASSWORD environment variables not set. Skipping superuser creation.'
                )
            )
            return

        if not username:
            # Default username from email prefix (e.g., admin@domain.com -> admin)
            username = email.split('@')[0]

        # Check if a user with this email or username already exists
        user_by_email = User.objects.filter(email__iexact=email).first()
        user_by_username = User.objects.filter(username__iexact=username).first()

        if user_by_email or user_by_username:
            user = user_by_email or user_by_username
            self.stdout.write(
                self.style.SUCCESS(
                    f'[INFO] Superuser account ({user.email or user.username}) already exists. Skipping creation.'
                )
            )
            # Ensure staff and superuser permissions are enabled
            if not user.is_superuser or not user.is_staff:
                user.is_superuser = True
                user.is_staff = True
                user.save(update_fields=['is_superuser', 'is_staff'])
                self.stdout.write(
                    self.style.SUCCESS(f'[SUCCESS] Updated superuser privileges for {user.username}.')
                )
            return

        try:
            # Create new superuser securely
            User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'[SUCCESS] Successfully created superuser: {email} (username: {username})'
                )
            )
        except Exception as e:
            self.stderr.write(
                self.style.ERROR(
                    f'[ERROR] Failed to create superuser for {email}: {e}'
                )
            )
