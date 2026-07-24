"""
Management command: carry_forward_results.py
Location: backend/apps/results/management/commands/carry_forward_results.py

Clones Result rows from one (term, year) into another, preserving
reopen/ca/exams as a starting baseline for the new term. This is a
"drop-in improvement" over the original ad hoc migrate-2025-to-2026
script — same purpose, but safe to re-run and safe to audit.

Fixes vs. the original script:
  - Wrapped in a transaction: a failure partway through rolls back
    cleanly instead of leaving a half-migrated year.
  - Calls recompute_subject_positions() for every affected
    (subject, term, class, year) combo after creation — the original
    left `subject_position` as NULL forever for any row a teacher
    never re-saved afterward.
  - Logs a single audit entry via log_action(), matching every other
    write path in this codebase.
  - Validates cloned reopen/ca/exams against the same component caps
    as the model (20/40/40) BEFORE creating the row, so a corrupted
    source row from a prior year is reported and skipped rather than
    silently propagated forward.
  - `school_class` is NOT blindly copied from the source row anymore.
    By default the student's CURRENT school_class (student.school_class)
    is used instead, since a student's class in the new year is very
    often different from their class in the source year (promotion).
    Use --keep-source-class to restore the old (unsafe) behaviour if
    you specifically need it for a one-off case.
  - --dry-run previews exactly what would be created/skipped without
    writing anything.
  - Source/target term and year are CLI args, not hardcoded, so this
    command is safe to reuse for any future year-end rollover.

Usage:
    python manage.py carry_forward_results \\
        --from-term term3 --from-year 2025 \\
        --to-term term3   --to-year 2026 \\
        --dry-run

    # once the dry run looks right:
    python manage.py carry_forward_results \\
        --from-term term3 --from-year 2025 \\
        --to-term term3   --to-year 2026
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from apps.results.models import Result

# Mirrors ResultViewSet.COMPONENT_MAX / the model's field validators.
COMPONENT_MAX = {"reopen": 20, "ca": 40, "exams": 40}


class Command(BaseCommand):
    help = "Carry Result rows forward from one term/year into another as a starting baseline."

    def add_arguments(self, parser):
        parser.add_argument("--from-term", required=True, choices=["term1", "term2", "term3"])
        parser.add_argument("--from-year", required=True, type=int)
        parser.add_argument("--to-term", required=True, choices=["term1", "term2", "term3"])
        parser.add_argument("--to-year", required=True, type=int)
        parser.add_argument(
            "--keep-source-class", action="store_true",
            help="Copy school_class from the source row instead of the student's "
                 "current class. Only use this if you specifically want last year's "
                 "class carried forward (usually wrong — most students change class "
                 "between years).",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Preview what would be created/skipped without writing anything.",
        )

    def handle(self, *args, **options):
        from_term, from_year = options["from_term"], options["from_year"]
        to_term, to_year = options["to_term"], options["to_year"]
        keep_source_class = options["keep_source_class"]
        dry_run = options["dry_run"]

        if (from_term, from_year) == (to_term, to_year):
            raise CommandError("Source and target term/year must differ.")

        source_qs = Result.objects.filter(term=from_term, year=from_year).select_related(
            "student", "subject", "school_class"
        )
        if not source_qs.exists():
            self.stdout.write(self.style.WARNING(
                f"No records found for {from_term} {from_year}."
            ))
            return

        self.stdout.write(f"Found {source_qs.count()} source record(s). "
                           f"{'[DRY RUN] ' if dry_run else ''}Starting…")

        to_create = []
        skipped_existing = 0
        skipped_invalid = 0
        affected_combos = set()  # (subject_id, term, school_class_id, year)

        for res in source_qs:
            already_exists = Result.objects.filter(
                student=res.student, subject=res.subject, term=to_term, year=to_year,
            ).exists()
            if already_exists:
                skipped_existing += 1
                continue

            # Validate the cloned values against the same caps the model/API
            # enforce, so a corrupted source row is reported and skipped
            # instead of silently propagated into the new year.
            problems = []
            for field, max_value in COMPONENT_MAX.items():
                val = getattr(res, field) or 0.0
                if val < 0 or val > max_value:
                    problems.append(f"{field}={val} (must be 0-{max_value})")
            if problems:
                self.stdout.write(self.style.ERROR(
                    f"  SKIPPING student={res.student} subject={res.subject}: "
                    f"invalid source data — {', '.join(problems)}"
                ))
                skipped_invalid += 1
                continue

            target_class = res.school_class if keep_source_class else (
                res.student.school_class or res.school_class
            )

            to_create.append(Result(
                student=res.student,
                subject=res.subject,
                school_class=target_class,
                term=to_term,
                year=to_year,
                reopen=res.reopen,
                ca=res.ca,
                exams=res.exams,
                # score is recomputed by Result.save() below; not set here.
            ))
            affected_combos.add((res.subject_id, to_term, target_class.id if target_class else None, to_year))

        self.stdout.write(
            f"Plan: create {len(to_create)}, skip {skipped_existing} existing, "
            f"skip {skipped_invalid} invalid."
        )

        if dry_run:
            self.stdout.write(self.style.NOTICE("Dry run — nothing written."))
            return

        if not to_create:
            self.stdout.write(self.style.WARNING("Nothing to create."))
            return

        created_count = 0
        try:
            with transaction.atomic():
                for row in to_create:
                    try:
                        row.save()  # triggers Result.save() -> score + validators
                        created_count += 1
                    except IntegrityError:
                        # Rare race: another process created this row between
                        # our exists() check and this save(). Skip, don't abort
                        # the whole batch.
                        self.stdout.write(self.style.WARNING(
                            f"  Race condition, already exists: "
                            f"{row.student} / {row.subject}"
                        ))

                from .grades import get_current_year  # local import to avoid cycles
                from api.views.result_view import recompute_subject_positions

                for subject_id, term, class_id, year in affected_combos:
                    recompute_subject_positions(subject_id, term, class_id, year)

                from apps.audit.models import AuditLog
                from apps.audit.services import log_action

                log_action(
                    request=None,
                    action=AuditLog.Action.RESULT_UPLOAD,
                    module=AuditLog.Module.RESULTS,
                    resource_type="Result",
                    resource_repr=(
                        f"Carried forward {created_count} result(s) from "
                        f"{from_term} {from_year} to {to_term} {to_year} "
                        f"(management command)"
                    ),
                    new_value={
                        "created": created_count,
                        "skipped_existing": skipped_existing,
                        "skipped_invalid": skipped_invalid,
                    },
                )
        except Exception:
            self.stdout.write(self.style.ERROR(
                "Migration failed and was rolled back. No rows were created."
            ))
            raise

        self.stdout.write(self.style.SUCCESS(
            f"Created {created_count} record(s). Skipped {skipped_existing} existing, "
            f"{skipped_invalid} invalid source rows. Recomputed positions for "
            f"{len(affected_combos)} subject/class combo(s)."
        ))