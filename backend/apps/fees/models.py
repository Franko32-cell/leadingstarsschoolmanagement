from django.db import models
from django.utils import timezone
from django.conf import settings
from apps.students.models import Student


TERM_CHOICES = [
    ("term1", "Term 1"),
    ("term2", "Term 2"),
    ("term3", "Term 3"),
]


class Fee(models.Model):

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name="fees",
    )
    term = models.CharField(max_length=10, choices=TERM_CHOICES)

    # Core fees
    amount        = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Optional extras
    book_user_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    workbook_fee  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    arrears       = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Payments
    paid    = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["student", "term"]
        ordering        = ["-created_at"]

    def __str__(self):
        return f"{self.student} - {self.term}"

    @property
    def total_amount(self):
        return self.amount + self.book_user_fee + self.workbook_fee + self.arrears

    def save(self, *args, **kwargs):
        self.balance = self.total_amount - self.paid
        super().save(*args, **kwargs)


class PaymentTransaction(models.Model):

    fee = models.ForeignKey(
        Fee,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recorded_payments",
    )
    note       = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.fee.student} - GHS {self.amount} - {self.created_at.date()}"