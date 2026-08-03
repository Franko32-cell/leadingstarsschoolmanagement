"""
Management command: promote_students.py
Location: backend/apps/students/management/commands/promote_students.py

Start-of-term promotion (re-runnable, but designed to be run once at
the start of Term 1 2026):

  - Moves every enrolled student to their next class per the fixed
    CLASS_PROMOTION_MAP below. Basic 9 and Jewels are terminal — those
    students are left in place.
  - Fee has no `year` field (unique_together = ["student", "term"]),
    so a student's existing term1/term2/term3 Fee rows ARE their
    current-year state. For each promoted student, this command sums
    `balance` across those rows and carries that total forward as
    `arrears` on their term1 Fee record, resetting `paid` to 0.
  - Does NOT set amount / book_user_fee / workbook_fee on the new
    term1 row — run FeeViewSet.bulk_assign per new class afterwards to
    bill this year's amounts. bulk_assign never touches arrears or
    paid, so it won't clobber what this command sets.
  - Never touches term3 rows, never deletes anything.
  - Logs one AuditLog entry per promoted student via log_action.
  - --dry-run previews the full plan (old class -> new class, arrears
    carried) without writing anything.

Usage:
    python manage.py promote_students --dry-run
    python manage.py promote_students
"""

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.students.models import Student
from apps.classes.models import SchoolClass
from apps.fees.models import Fee


# Fixed target-class-name map, built from the current SchoolClass table.
# Basic 9 and Jewels are terminal — deliberately absent as keys.
CLASS_PROMOTION_MAP = {
    "Basic 1": "Basic 2",
    "Basic 2": "Basic 3",
    "Basic 3": "Basic 4",
    "Basic 4": "Basic 5",
    "Basic 5": "Basic 6",
    "Basic 6": "Basic 7",
    "Basic 7": "Basic 8",
    "Basic 8": "Basic 9",
    "Little Angels": "Big Angels",
    "Big Angels": "Little Stars",
    "Little Stars": "Big Stars",
    "Big Stars": "Jewels",
}

NEW_TERM = "term1"


class Command(BaseCommand):
    help = "Promote every enrolled student to their next class and carry forward fee arrears into term1."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Preview the full promotion plan without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Resolve target SchoolClass objects up front so a missing/typo'd
        # class name is caught before touching any student, not mid-loop.
        class_by_name = {c.name: c for c in SchoolClass.objects.all()}
        target_class_cache = {}
        for old_name, new_name in CLASS_PROMOTION_MAP.items():
            if old_name not in class_by_name:
                self.stdout.write(self.style.WARNING(
                    f"  No SchoolClass named {old_name!r} exists — skipping that mapping."
                ))
                continue
            if new_name not in class_by_name:
                raise CommandError(f"Target class {new_name!r} does not exist. Aborting.")
            target_class_cache[old_name] = class_by_name[new_name]

        students = (
            Student.objects
            .select_related("school_class", "user")
            .filter(school_class__isnull=False)
        )

        plan = []            # (student, old_class, new_class, arrears)
        left_in_place = []   # terminal class or unmapped

        for student in students:
            old_class = student.school_class
            new_class = target_class_cache.get(old_class.name)

            if new_class is None:
                left_in_place.append(student)
                continue

            existing_fees = Fee.objects.filter(
                student=student, term__in=["term1", "term2", "term3"]
            )
            arrears = sum((f.balance for f in existing_fees), Decimal("0"))

            plan.append((student, old_class, new_class, arrears))

        self.stdout.write(
            f"{'[DRY RUN] ' if dry_run else ''}"
            f"{len(plan)} student(s) to promote, "
            f"{len(left_in_place)} left in place (terminal class or unmapped)."
        )

        for student, old_class, new_class, arrears in plan:
            self.stdout.write(
                f"  {student.full_name}: {old_class} -> {new_class}  (arrears carried: {arrears})"
            )

        if dry_run:
            self.stdout.write(self.style.NOTICE("Dry run — nothing written."))
            return

        if not plan:
            self.stdout.write(self.style.WARNING("Nothing to promote."))
            return

        from apps.audit.models import AuditLog
        from apps.audit.services import log_action

        promoted_count = 0
        with transaction.atomic():
            for student, old_class, new_class, arrears in plan:
                student.school_class = new_class
                student.save(update_fields=["school_class"])

                fee, _ = Fee.objects.get_or_create(
                    student=student, term=NEW_TERM,
                    defaults={"paid": Decimal("0"), "arrears": arrears},
                )
                fee.arrears = arrears
                fee.paid = Decimal("0")
                fee.save()

                log_action(
                    request=None,
                    action=AuditLog.Action.FEE_UPDATE,
                    module=AuditLog.Module.STUDENTS,
                    resource_type="Student",
                    resource_id=student.id,
                    resource_repr=f"Promotion: {student.full_name} ({old_class} -> {new_class})",
                    previous_value={"school_class": str(old_class)},
                    new_value={"school_class": str(new_class), "arrears_carried": str(arrears)},
                    description=f"Start-of-term promotion into {NEW_TERM}",
                )
                promoted_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Promoted {promoted_count} student(s). "
            f"{len(left_in_place)} left in place."
        ))