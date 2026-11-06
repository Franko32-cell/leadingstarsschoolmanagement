"""
Re-stamp Attendance.term / Attendance.year from each row's DATE.

Fixes rows that were saved under the wrong term because settings.CURRENT_TERM
had not been updated when teachers started marking attendance.

Usage
-----
Dry run (changes nothing, prints what would change):
    python manage.py repair_attendance_terms \
        --term term3 2026 2026-04-20 2026-07-24 \
        --term term1 2026 2026-09-08 2026-12-18 \
        --dry-run

Apply (also saves the term dates in the TermDates table so future
attendance is stamped correctly):
    python manage.py repair_attendance_terms --term ... --term ...

If TermDates is already filled in, run it with no --term arguments.
Rows whose date falls outside every term (holidays between terms) are left
untouched and reported.
"""
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.attendance.models import Attendance, TermDates

VALID_TERMS = {"term1", "term2", "term3"}


def _d(value):
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise CommandError(f"'{value}' is not a valid date (use YYYY-MM-DD).")


class Command(BaseCommand):
    help = "Re-stamp attendance term/year from each record's date using TermDates."

    def add_arguments(self, parser):
        parser.add_argument(
            "--term", nargs=4, action="append", default=[],
            metavar=("TERM", "YEAR", "START", "END"),
            help="Define/update a term, e.g. --term term1 2026 2026-09-08 2026-12-18 (repeatable).",
        )
        parser.add_argument("--dry-run", action="store_true", help="Report only; change nothing.")

    @transaction.atomic
    def handle(self, *args, **opts):
        dry = opts["dry_run"]

        for term, year, start, end in opts["term"]:
            if term not in VALID_TERMS:
                raise CommandError(f"Invalid term '{term}'. Use term1, term2 or term3.")
            row = TermDates(term=term, year=int(year), start_date=_d(start), end_date=_d(end))
            existing = TermDates.objects.filter(term=term, year=int(year)).first()
            if existing:
                row.pk = existing.pk
            row.full_clean(validate_unique=False)
            if not dry:
                row.save()
            self.stdout.write(f"{'[dry-run] ' if dry else ''}Term dates: {row}")

        terms = list(TermDates.objects.all()) if not dry else self._terms_from_args(opts["term"])
        if not terms:
            raise CommandError("No term dates available. Pass --term arguments or fill TermDates in the admin.")

        changed = 0
        for t in terms:
            wrong = (
                Attendance.objects
                .filter(date__range=(t.start_date, t.end_date))
                .exclude(term=t.term, year=t.year)
            )
            n = wrong.count()
            if n:
                self.stdout.write(f"{t}: {n} record(s) carry the wrong term/year")
                for old in wrong.values("term", "year").distinct():
                    self.stdout.write(f"    {old['term']} {old['year']} -> {t.term} {t.year}")
                if not dry:
                    wrong.update(term=t.term, year=t.year)
                changed += n

        orphan_qs = Attendance.objects.all()
        for t in terms:
            orphan_qs = orphan_qs.exclude(date__range=(t.start_date, t.end_date))
        orphans = orphan_qs.count()

        verb = "would be re-stamped" if dry else "re-stamped"
        self.stdout.write(self.style.SUCCESS(f"{changed} record(s) {verb}."))
        if orphans:
            self.stdout.write(self.style.WARNING(
                f"{orphans} record(s) fall outside every defined term and were left unchanged."
            ))
        if dry:
            self.stdout.write("Dry run: nothing was saved.")

    @staticmethod
    def _terms_from_args(args):
        out = []
        for term, year, start, end in args:
            out.append(TermDates(term=term, year=int(year), start_date=_d(start), end_date=_d(end)))
        # merge with saved rows that are not redefined on the command line
        redefined = {(t.term, t.year) for t in out}
        out += [t for t in TermDates.objects.all() if (t.term, t.year) not in redefined]
        return out
