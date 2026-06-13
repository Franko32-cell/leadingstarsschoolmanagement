"""
Migration: add promotion_status + next_class to the Report model.

Drop this file into:
  backend/apps/results/migrations/0009_report_promotion.py

Then run:
  cd backend && python manage.py migrate
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        # The last migration in apps/results
        ("results", "0008_character_assessment"),
        # SchoolClass lives in apps/classes
        ("classes", "0003_schoolclass_level"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="promotion_status",
            field=models.CharField(
                blank=True,
                null=True,
                default=None,
                max_length=20,
                choices=[
                    ("promoted",    "Promoted"),
                    ("repeated",    "Repeated"),
                    ("transferred", "Transferred"),
                    ("withdrawn",   "Withdrawn"),
                ],
                help_text="End-of-term progression decision for this student.",
            ),
        ),
        migrations.AddField(
            model_name="report",
            name="next_class",
            field=models.ForeignKey(
                to="classes.SchoolClass",
                on_delete=django.db.models.deletion.SET_NULL,
                null=True,
                blank=True,
                related_name="incoming_promotions",
                help_text="Class this student will join next term (populated when promoted/transferred).",
            ),
        ),
    ]