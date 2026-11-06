"""
School-day and attendance-rate logic, shared by the attendance API, report
cards, PDFs and the analytics dashboard so every screen computes the same
numbers.

Rules
-----
* A date is a NON-school day when it falls inside a SchoolCalendar entry with
  is_school_day=False, or on a weekend (unless settings.ATTENDANCE_ALLOW_WEEKENDS).
* A SchoolCalendar entry with is_school_day=True overrides both of the above
  (e.g. a Saturday make-up day).
* Attendance rows that sit on a non-school day are ignored by every count.
* attended = present + late.  absent = absent.  Excused is neither: it is
  left out of both sides of the rate.
      percentage = attended / (attended + absent) * 100
"""
from datetime import date, timedelta

from django.conf import settings
from django.db.models import Count, Q
from django.utils import timezone

from apps.attendance.models import SchoolCalendar

SATURDAY, SUNDAY = 5, 6  # date.weekday()


def weekends_allowed() -> bool:
    return bool(getattr(settings, "ATTENDANCE_ALLOW_WEEKENDS", False))


def _daterange(start: date, end: date):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


class SchoolDayResolver:
    """Resolves many dates inside [start, end] with ONE calendar query."""

    def __init__(self, start: date, end: date):
        self.start, self.end = start, end
        self._closed = {}   # date -> SchoolCalendar entry (non-school)
        self._open = set()  # dates forced to be school days
        entries = SchoolCalendar.objects.filter(start_date__lte=end, end_date__gte=start)
        for e in entries:
            for d in _daterange(max(e.start_date, start), min(e.end_date, end)):
                if e.is_school_day:
                    self._open.add(d)
                else:
                    self._closed.setdefault(d, e)
        self._weekends_ok = weekends_allowed()

    def info(self, d: date):
        """None for a school day, else {"reason", "type", "name"}."""
        if d in self._open:
            return None
        entry = self._closed.get(d)
        if entry:
            return {"reason": entry.name, "type": entry.event_type, "name": entry.name, "entry_id": entry.id}
        if not self._weekends_ok and d.weekday() in (SATURDAY, SUNDAY):
            return {"reason": "Weekend", "type": "weekend", "name": "Weekend", "entry_id": None}
        return None

    def is_school_day(self, d: date) -> bool:
        return self.info(d) is None


def non_school_reason(d: date):
    """Reason string if `d` is not a school day, else None."""
    info = SchoolDayResolver(d, d).info(d)
    return info["reason"] if info else None


def day_status(d: date) -> dict:
    info = SchoolDayResolver(d, d).info(d)
    return {
        "date": d.isoformat(),
        "is_school_day": info is None,
        "reason": info["reason"] if info else "",
        "type": info["type"] if info else "",
        "calendar_entry": info["entry_id"] if info else None,
    }


def non_school_days(start: date, end: date) -> list:
    """Every non-school day in [start, end] (weekends included)."""
    r = SchoolDayResolver(start, end)
    out = []
    for d in _daterange(start, end):
        info = r.info(d)
        if info:
            out.append({"date": d.isoformat(), **info})
    return out


def count_school_days(start: date, end: date) -> int:
    if end < start:
        return 0
    r = SchoolDayResolver(start, end)
    return sum(1 for d in _daterange(start, end) if r.is_school_day(d))


# ---------------------------------------------------------------------------
# Counting
# ---------------------------------------------------------------------------

def exclude_non_school_records(qs):
    """Drop attendance rows whose date is a non-school day."""
    dates = set(qs.values_list("date", flat=True).distinct())
    if not dates:
        return qs
    r = SchoolDayResolver(min(dates), max(dates))
    bad = [d for d in dates if not r.is_school_day(d)]
    return qs.exclude(date__in=bad) if bad else qs


def _aggregates():
    return {
        "present": Count("id", filter=Q(status="present")),
        "late": Count("id", filter=Q(status="late")),
        "absent": Count("id", filter=Q(status="absent")),
        "excused": Count("id", filter=Q(status="excused")),
    }


def _finish(row: dict, digits=2) -> dict:
    attended = row["present"] + row["late"]
    counted = attended + row["absent"]
    row["attended"] = attended
    row["counted_days"] = counted
    row["percentage"] = round(attended / counted * 100, digits) if counted else None
    return row


def attendance_counts(qs, digits=2) -> dict:
    """Totals for an Attendance queryset, ignoring non-school days."""
    qs = exclude_non_school_records(qs)
    row = qs.aggregate(**_aggregates())
    row = {k: v or 0 for k, v in row.items()}
    return _finish(row, digits)


def attendance_counts_by(qs, *group_fields, digits=2):
    """Per-group counts (e.g. per student / per class), ignoring non-school days."""
    qs = exclude_non_school_records(qs)
    rows = list(qs.order_by().values(*group_fields).annotate(**_aggregates()))
    return [_finish(r, digits) for r in rows]


def today():
    return timezone.localdate()
