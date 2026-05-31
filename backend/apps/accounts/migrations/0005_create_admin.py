import os
from django.db import migrations


def create_admin(apps, schema_editor):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    username = os.environ.get("DJANGO_ADMIN_USERNAME", "admin")
    email = os.environ.get("DJANGO_ADMIN_EMAIL", "admin@example.com")
    password = os.environ.get("DJANGO_ADMIN_PASSWORD")

    if not password:
        print("⚠️  WARNING: DJANGO_ADMIN_PASSWORD not set. Skipping admin creation.")
        return

    if User.objects.filter(username=username).exists():
        print(f"ℹ️  Admin user '{username}' already exists. Skipping.")
        return

    User.objects.create_superuser(
        username=username,
        email=email,
        password=password,
    )
    print(f"✅  Superuser '{username}' created successfully.")


def reverse_admin(apps, schema_editor):
    from django.contrib.auth import get_user_model
    User = get_user_model()

    username = os.environ.get("DJANGO_ADMIN_USERNAME", "admin")
    User.objects.filter(username=username).delete()
    print(f"🗑️  Superuser '{username}' deleted (migration reversed).")


class Migration(migrations.Migration):

    dependencies = [
    ('accounts', '0003_user_is_approved'),
]

    operations = [
        migrations.RunPython(create_admin, reverse_code=reverse_admin),  # ← fixed
    ]