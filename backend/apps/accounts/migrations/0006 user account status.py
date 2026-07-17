from django.db import migrations, models


class Migration(migrations.Migration):

    # Depends on the last migration visible in your apps/accounts/migrations/
    # directory tree (0005_create_admin.py). If you've added a 0006/0007 since
    # then, update this dependency to match before running migrate.
    dependencies = [
        ("accounts", "0005_create_admin"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="account_status",
            field=models.CharField(
                choices=[
                    ("active", "Active"),
                    ("inactive", "Inactive"),
                    ("suspended", "Suspended"),
                    ("archived", "Archived"),
                ],
                default="active",
                help_text=(
                    "Drives is_active automatically. 'suspended' and 'archived' "
                    "both disable login, but are tracked separately from a plain "
                    "deactivation for audit/reporting purposes."
                ),
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="archived_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]