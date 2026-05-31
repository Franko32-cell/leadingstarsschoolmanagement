from django.db import models
from apps.classes.models import SchoolClass


class Subject(models.Model):

    name = models.CharField(max_length=100)

    school_class = models.ForeignKey(
        SchoolClass,
        on_delete=models.CASCADE,
        related_name="subjects"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("name", "school_class")

    def __str__(self):
        return f"{self.name} - {self.school_class}"