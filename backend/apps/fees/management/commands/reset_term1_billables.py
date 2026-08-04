"""
Management command: reset_term1_billables.py
Location: backend/apps/fees/management/commands/reset_term1_billables.py

ONE-TIME cleanup, meant to run once at the start of Term 1 2026 billing,
right after promote_students has already run.

Fee has no `year` field (unique_together = ["student", "term"]), so a
student's term1 row is whatever's currently sitting in that slot —
promote_students already set `arrears`/`paid` correctly on it for every
promoted student, but left `amount`/`book_user_fee`/`workbook_fee` stale
(a bug in that command, fixed going forward, but already-run promotions
need this cleanup pass).

Two groups, handled differently so arrears is never double-counted:

  - Students promote_students ACTUALLY PROMOTED already have correct
    `arrears` on their term1 row from that run (their term1 `balance`
    at the time already reflects it). Recomputing arrears again here
    would double-count. For these students, this command ONLY zeroes
    amount/book_user_fee/workbook_fee — arrears and paid are left
    exactly as promote_students set them.

    IMPORTANT: this group is identified via the AuditLog entries
    promote_students wrote, NOT by checking each student's current
    class name. An earlier version of this command used class name
    (e.g. "was this student currently in Basic 9 or Jewels") to guess
    who was "terminal" and skipped by promotion — but that's wrong
    after promotion has already run, because students who were JUST
    PROMOTED INTO Basic 9 or Jewels are indistinguishable, by class
    name alone, from students who started there. That bug caused
    double-counted arrears for every student promoted into a
    terminal class (verified: Lawrence/Lawrencia Ademena showed
    98.00 instead of the correct 49.00 — exactly double — in a dry
    run before this fix).

  - Every other student (i.e. NOT in the promotion audit log — either
    they were already in a terminal class before promotion and never
    touched, or for any other reason has no promotion record) has
    NOT had their balances folded into arrears anywhere yet. This
    command computes `arrears` fresh for them: sum of their existing
    term1 + term2 + term3 Fee balances, same formula promote_students
    used.

In both cases: paid=0, amount/book_user_fee/workbook_fee=0, so the
term1 row holds only arrears until FeeViewSet.bulk_assign is run per
class to bill this term's real amounts (bulk_assign never touches
arrears/paid, so it's safe to run after this).

Never touches term2/term3, never deletes anything.

Usage:
    python manage.py reset_term1_billables --dry-run
    python manage.py reset_term1_billables
"""

from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.students.models import Student
from apps.fees.models import Fee
from apps.audit.models import AuditLog

ZERO = Decimal("0")

# Must match promote_students.py's log_action() call exactly.
PROMOTION_DESCRIPTION = "Start-of-term promotion into term1"


class Command(BaseCommand):
    help = "One-time: strip term1 Fee rows down to arrears-only ahead of Term 1 2026 billing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Preview the plan without writing anything.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # Ground truth for "who did promote_students actually touch" is the
        # audit log IT wrote — not each student's current class name, which
        # is ambiguous once promotion has already happened (see module
        # docstring for why the class-name approach was wrong).
        promoted_student_ids = set(
            str(pk) for pk in
            AuditLog.objects.filter(
                module=AuditLog.Module.STUDENTS,
                resource_type="Student",
                description=PROMOTION_DESCRIPTION,
            ).values_list("resource_id", flat=True)
        )

        students = (
            Student.objects
            .select_related("school_class")
            .filter(school_class__isnull=False)
        )

        already_processed = []    # (student, fee) — just zero billables
        needs_fresh_arrears = []  # (student, arrears) — compute from scratch
        unexpected = []           # (student,) — promoted but no term1 row; investigate

        for student in students:
            was_promoted = str(student.id) in promoted_student_ids

            if was_promoted:
                try:
                    fee = Fee.objects.get(student=student, term="term1")
                except Fee.DoesNotExist:
                    unexpected.append(student)
                    continue
                already_processed.append((student, fee))
            else:
                existing_fees = Fee.objects.filter(
                    student=student, term__in=["term1", "term2", "term3"]
                )
                arrears = sum((f.balance for f in existing_fees), ZERO)
                needs_fresh_arrears.append((student, arrears))

        self.stdout.write(
            f"{'[DRY RUN] ' if dry_run else ''}"
            f"{len(already_processed)} previously-promoted student(s) — zeroing billables only. "
            f"{len(needs_fresh_arrears)} other student(s) — computing fresh arrears. "
            f"{len(unexpected)} unexpected case(s) — see below."
        )

        for student in unexpected:
            self.stdout.write(self.style.ERROR(
                f"  UNEXPECTED: {student.full_name} has a promotion audit log entry "
                f"but no term1 Fee row exists — skipping, investigate manually."
            ))

        for student, fee in already_processed:
            self.stdout.write(
                f"  [zero billables] {student.full_name}: "
                f"amount {fee.amount} -> 0, book {fee.book_user_fee} -> 0, "
                f"workbook {fee.workbook_fee} -> 0  (arrears unchanged: {fee.arrears})"
            )

        for student, arrears in needs_fresh_arrears:
            self.stdout.write(
                f"  [fresh arrears] {student.full_name} ({student.school_class}): "
                f"arrears -> {arrears}"
            )

        if dry_run:
            self.stdout.write(self.style.NOTICE("Dry run — nothing written."))
            return

        from apps.audit.services import log_action

        updated_count = 0
        with transaction.atomic():
            for student, fee in already_processed:
                fee.amount = ZERO
                fee.book_user_fee = ZERO
                fee.workbook_fee = ZERO
                fee.save()

                log_action(
                    request=None,
                    action=AuditLog.Action.FEE_UPDATE,
                    module=AuditLog.Module.FEES,
                    resource_type="Fee",
                    resource_id=fee.id,
                    resource_repr=f"Term1 billables reset: {student.full_name}",
                    description="reset_term1_billables: zeroed amount/book/workbook, arrears unchanged",
                )
                updated_count += 1

            for student, arrears in needs_fresh_arrears:
                fee, _ = Fee.objects.get_or_create(
                    student=student, term="term1",
                    defaults={"paid": ZERO, "arrears": arrears},
                )
                fee.amount = ZERO
                fee.book_user_fee = ZERO
                fee.workbook_fee = ZERO
                fee.arrears = arrears
                fee.paid = ZERO
                fee.save()

                log_action(
                    request=None,
                    action=AuditLog.Action.FEE_UPDATE,
                    module=AuditLog.Module.FEES,
                    resource_type="Fee",
                    resource_id=fee.id,
                    resource_repr=f"Term1 arrears set (not previously promoted): {student.full_name}",
                    new_value={"arrears_carried": str(arrears)},
                    description="reset_term1_billables: fresh arrears computed",
                )
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Updated {updated_count} term1 Fee record(s). "
            f"{len(unexpected)} unexpected case(s) skipped — see log above."
        ))