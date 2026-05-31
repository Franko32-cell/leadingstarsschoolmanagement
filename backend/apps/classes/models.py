from django.db import models


LEVEL_CHOICES = [
    ("nursery_kg", "Nursery/KG"),
    ("basic_1_6",  "Basic 1-6"),
    ("basic_7_9",  "Basic 7-9"),
]


class SchoolClass(models.Model):

    name    = models.CharField(max_length=50)
    section = models.CharField(max_length=20, blank=True, null=True)
    level   = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default="basic_7_9",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        if self.section:
            return f"{self.name} {self.section}"
        return self.name

    class Meta:
        ordering = ["name"]