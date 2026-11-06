import apps.attendance.models
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0007_alter_attendance_status_schoolcalendar"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="attendance",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="attendance",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_updated",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="schoolcalendar",
            name="name",
            field=models.CharField(max_length=150),
        ),
        migrations.AlterField(
            model_name="schoolcalendar",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("holiday", "Holiday"),
                    ("mid_term_break", "Mid-Term Break"),
                    ("vacation", "Vacation"),
                    ("public_holiday", "Public Holiday"),
                    ("school_closure", "School Closure"),
                    ("staff_training", "Staff Training"),
                    ("special_event", "Special Event"),
                    ("other", "Other"),
                ],
                default="holiday",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="schoolcalendar",
            name="year",
            field=models.PositiveIntegerField(
                default=apps.attendance.models._get_current_year,
                help_text="Academic year (e.g. 2026).",
            ),
        ),
        migrations.AlterField(
            model_name="schoolcalendar",
            name="term",
            field=models.CharField(
                blank=True,
                choices=[
                    ("term1", "Term 1"),
                    ("term2", "Term 2"),
                    ("term3", "Term 3"),
                ],
                default="",
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name="schoolcalendar",
            name="is_school_day",
            field=models.BooleanField(
                default=False,
                help_text="Off (default): non-school day, no attendance. On: a school day that overrides a weekend/holiday.",
            ),
        ),
        migrations.AlterModelOptions(
            name="schoolcalendar",
            options={
                "ordering": ["start_date", "end_date"],
                "verbose_name": "School calendar entry",
                "verbose_name_plural": "School calendar entries",
            },
        ),
        migrations.RemoveIndex(
            model_name="schoolcalendar",
            name="attendance__year_e8b34d_idx",
        ),
        migrations.AddIndex(
            model_name="schoolcalendar",
            index=models.Index(
                fields=["year", "term"], name="attendance__year_55c858_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="attendance",
            index=models.Index(
                fields=["year", "term", "date"], name="attendance__year_7ed4ab_idx"
            ),
        ),
        migrations.AddField(
            model_name="schoolcalendar",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="calendar_created",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="schoolcalendar",
            name="updated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="calendar_updated",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="schoolcalendar",
            constraint=models.CheckConstraint(
                condition=models.Q(end_date__gte=models.F("start_date")),
                name="schoolcalendar_end_not_before_start",
            ),
        ),
    ]
