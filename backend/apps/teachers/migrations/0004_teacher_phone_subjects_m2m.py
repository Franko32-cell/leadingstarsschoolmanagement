# Generated manually to accompany the Teacher model change:
# - add `phone` field
# - add `subjects` ManyToManyField (replaces the single `subject` FK)
# - copy each teacher's existing `subject` into the new `subjects` M2M
#   before dropping the old column, so no data is lost
from django.db import migrations, models


def copy_subject_to_subjects(apps, schema_editor):
    Teacher = apps.get_model("teachers", "Teacher")
    for teacher in Teacher.objects.exclude(subject__isnull=True):
        teacher.subjects.add(teacher.subject_id)


def noop_reverse(apps, schema_editor):
    # Reversing would need to pick one subject out of possibly several —
    # there's no single correct choice, so this migration is one-directional
    # for data purposes. The schema reversal still runs via AddField/RemoveField.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subjects", "0003_alter_subject_id"),
        ("teachers", "0003_alter_teacher_hire_date_alter_teacher_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="teacher",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="teacher",
            name="subjects",
            field=models.ManyToManyField(
                blank=True, related_name="teachers", to="subjects.subject"
            ),
        ),
        migrations.RunPython(copy_subject_to_subjects, noop_reverse),
        migrations.RemoveField(
            model_name="teacher",
            name="subject",
        ),
    ]
