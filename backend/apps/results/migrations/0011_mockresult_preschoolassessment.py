import apps.results.models
import django.core.validators
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("classes", "0004_report_promotion"),
        ("results", "0010_report_promotion"),
        ("students", "0009_alter_student_id"),
        ("subjects", "0003_alter_subject_id"),
    ]

    operations = [
        migrations.CreateModel(
            name="MockResult",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "mock",
                    models.CharField(
                        choices=[
                            ("mock1", "Mock 1"),
                            ("mock2", "Mock 2"),
                            ("mock3", "Mock 3"),
                            ("mock4", "Mock 4"),
                            ("mock5", "Mock 5"),
                            ("mock6", "Mock 6"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "year",
                    models.PositiveIntegerField(
                        default=apps.results.models.Result._get_current_year
                    ),
                ),
                (
                    "score",
                    models.FloatField(
                        default=0,
                        validators=[
                            django.core.validators.MinValueValidator(0),
                            django.core.validators.MaxValueValidator(100),
                        ],
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "school_class",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mock_results",
                        to="classes.schoolclass",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mock_results",
                        to="students.student",
                    ),
                ),
                (
                    "subject",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="mock_results",
                        to="subjects.subject",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("student", "subject", "mock", "year")},
            },
        ),
        migrations.CreateModel(
            name="PreschoolAssessment",
            fields=[
                (
                    "id",
                    models.AutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "term",
                    models.CharField(
                        choices=[
                            ("term1", "Term 1"),
                            ("term2", "Term 2"),
                            ("term3", "Term 3"),
                        ],
                        max_length=10,
                    ),
                ),
                (
                    "year",
                    models.PositiveIntegerField(
                        default=apps.results.models.Result._get_current_year
                    ),
                ),
                ("ratings", models.JSONField(blank=True, default=dict)),
                ("conduct", models.CharField(blank=True, default="", max_length=100)),
                ("interest", models.CharField(blank=True, default="", max_length=255)),
                ("attitude", models.CharField(blank=True, default="", max_length=255)),
                (
                    "teacher_performance",
                    models.CharField(blank=True, default="", max_length=255),
                ),
                ("remark", models.TextField(blank=True, default="")),
                (
                    "attendance",
                    models.PositiveIntegerField(
                        default=0,
                        validators=[django.core.validators.MinValueValidator(0)],
                    ),
                ),
                (
                    "attendance_total",
                    models.PositiveIntegerField(
                        default=1,
                        validators=[django.core.validators.MinValueValidator(1)],
                    ),
                ),
                (
                    "promotion_status",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("promoted", "Promoted"),
                            ("repeated", "Repeated"),
                            ("transferred", "Transferred"),
                            ("withdrawn", "Withdrawn"),
                        ],
                        default=None,
                        max_length=20,
                        null=True,
                    ),
                ),
                (
                    "vacation_date",
                    models.DateField(blank=True, null=True),
                ),
                (
                    "resumption_date",
                    models.DateField(blank=True, null=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "next_class",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="incoming_preschool_promotions",
                        to="classes.schoolclass",
                    ),
                ),
                (
                    "school_class",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="preschool_assessments",
                        to="classes.schoolclass",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="preschool_assessments",
                        to="students.student",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("student", "term", "year")},
            },
        ),
    ]