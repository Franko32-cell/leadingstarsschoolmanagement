"""grades.py
Shared grading logic, ranking, and formatting utilities.
"""

from django.db.models import Sum, Q


# ---------------------------------------------------------------------------
# Grading systems
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS_B79 = [
    (90, "1",  "HIGHEST"),
    (80, "2",  "HIGHER"),
    (60, "3",  "HIGH"),
    (55, "4",  "HIGH AVERAGE"),
    (50, "5",  "AVERAGE"),
    (45, "6",  "LOW AVERAGE"),
    (40, "7",  "LOW"),
    (35, "8",  "LOWER"),
    (0,  "9",  "LOWEST"),
]

GRADE_THRESHOLDS_B16 = [
    (90, "A",  "EXCELLENT"),
    (80, "B",  "VERY GOOD"),
    (60, "C",  "GOOD"),
    (55, "D",  "HIGH AVERAGE"),
    (45, "E2", "BELOW AVERAGE"),
    (40, "E3", "LOW"),
    (35, "E4", "LOWER"),
    (0,  "E5", "LOWEST"),
]

INTERP_ROWS_B79 = [
    ("90-100: 1 – HIGHEST",   "55-59: 4 – HIGH AVERAGE", "40-44: 7 – LOW"),
    ("80-89: 2 – HIGHER",     "50-54: 5 – AVERAGE",      "35-39: 8 – LOWER"),
    ("60-79: 3 – HIGH",       "45-49: 6 – LOW AVERAGE",  "0-34: 9 – LOWEST"),
]

INTERP_ROWS_B16 = [
    ("90-100: A – EXCELLENT", "55-59: D – HIGH AVERAGE", "40-44: E3 – LOW"),
    ("80-89: B – VERY GOOD",  "50-54: E – AVERAGE",      "35-39: E4 – LOWER"),
    ("60-79: C – GOOD",       "45-49: E2 – BELOW AVG",   "0-34: E5 – LOWEST"),
]

SCHOOL_NAMES = {
    "nursery_kg": "LEADING STARS MONTESSORI",
    "basic_1_6":  "LEADING STARS ACADEMY",
    "basic_7_9":  "LEADING STARS ACADEMY",
}

SCHOOL_MOTTOS = {
    "nursery_kg": "GLOBAL LEADERS",
    "basic_1_6":  "WHERE LEADERS ARE BORN",
    "basic_7_9":  "WHERE LEADERS ARE BORN",
}

TERM_LABELS = {"term1": "Term 1", "term2": "Term 2", "term3": "Term 3"}


# ---------------------------------------------------------------------------
# Feature detection — avoids broad ProgrammingError catches
# ---------------------------------------------------------------------------


def _check_promotion_fields() -> bool:
    """
    Returns True if the Report model has promotion_status / next_class columns.
    Evaluated once at import time so it never hits the DB per request.
    """
    try:
        from apps.results.models import Report
        from django.db import connection

        table = Report._meta.db_table
        col_names = {
            col.name
            for col in connection.introspection.get_table_description(
                connection.cursor(), table
            )
        }
        return "promotion_status" in col_names
    except Exception:
        return False


HAS_PROMOTION_FIELDS: bool = _check_promotion_fields()


# ---------------------------------------------------------------------------
# Grading helpers
# ---------------------------------------------------------------------------


def get_thresholds(level: str) -> list:
    if level in ("basic_1_6", "nursery_kg"):
        return GRADE_THRESHOLDS_B16
    return GRADE_THRESHOLDS_B79


def get_grade_and_remark(score: float, thresholds: list) -> tuple[str, str]:
    for threshold, grade, remark in thresholds:
        if score >= threshold:
            return grade, remark
    return thresholds[-1][1], thresholds[-1][2]


def get_overall_grade(avg: float, thresholds: list) -> str:
    return get_grade_and_remark(avg, thresholds)[0]


def get_interp_rows(level: str) -> list:
    return INTERP_ROWS_B79 if level == "basic_7_9" else INTERP_ROWS_B16


# ---------------------------------------------------------------------------
# Ranking — single aggregated query, no N+1
# ---------------------------------------------------------------------------


def rank_students(school_class, term: str, year: int) -> list[dict]:
    """
    Returns a list of dicts sorted by total score descending:
        [{"student_id": ..., "total": ...}, ...]

    Uses a single DB query with SUM annotation instead of one query per student.
    """
    from apps.students.models import Student

    rows = (
        Student.objects
        .filter(school_class=school_class)
        .annotate(
            total=Sum(
                "result__score",
                filter=Q(result__term=term, result__year=year),
            )
        )
        .order_by("-total")
        .values("id", "total")
    )
    return [{"student_id": r["id"], "total": r["total"] or 0} for r in rows]


def get_student_position(ranked: list[dict], student_id: int) -> int | None:
    for i, item in enumerate(ranked):
        if item["student_id"] == student_id:
            return i + 1
    return None


# ---------------------------------------------------------------------------
# Formatting helpers
# ---------------------------------------------------------------------------


def fmt_pos(n: int | None) -> str:
    if n is None:
        return "-"
    suffix = (
        "th" if 10 <= n % 100 <= 20
        else {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    )
    return f"{n}{suffix}"


def fmt_date(date_val) -> str:
    if not date_val:
        return "-"
    try:
        import datetime

        if isinstance(date_val, str):
            date_val = datetime.date.fromisoformat(date_val)
        day = date_val.day
        suffix = (
            "th" if 10 <= day % 100 <= 20
            else {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        )
        return f"{date_val.strftime('%A')}, {day}{suffix} {date_val.strftime('%B')} {date_val.year}"
    except Exception:
        return str(date_val)
