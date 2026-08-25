"""grades.py
Shared grading logic, ranking, and formatting utilities.
"""

import logging
import threading

from django.db.models import F, Sum, Q

logger = logging.getLogger(__name__)

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
# Mock exam grading (Basic 9) — BECE-style cut points, distinct from GRADE_THRESHOLDS_B79
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS_MOCK = [
    (74, "1", "HIGHEST"),
    (65, "2", "HIGHER"),
    (60, "3", "HIGH"),
    (55, "4", "HIGH AVERAGE"),
    (50, "5", "AVERAGE"),
    (45, "6", "BELOW AVERAGE"),
    (40, "7", "LOW"),
    (35, "8", "LOWER"),
    (0,  "9", "LOWEST"),
]

MOCK_INTERP_ROWS = [
    ("74-100: 1 – HIGHEST",     "49-45: 6 – BELOW AVERAGE"),
    ("74-65: 2 – HIGHER",       "44-40: 7 – LOW"),
    ("64-60: 3 – HIGH",         "39-35: 8 – LOWER"),
    ("60-55: 4 – HIGH AVERAGE", "0-34: 9 – LOWEST"),
    ("55-50: 5 – AVERAGE",      ""),
]


def get_mock_grade_and_remark(score: float) -> tuple[str, str]:
    return get_grade_and_remark(score, GRADE_THRESHOLDS_MOCK)


def compute_mock_aggregate(subject_scores: list[dict]) -> dict:
    """
    subject_scores: [{"subject": name, "score": float}, ...] for ONE mock.

    BECE aggregate here = sum of the grade points (1-9, lower=better) for the
    candidate's best SIX subjects BY SCORE. This is a simplification — real
    BECE aggregates are usually 4 core subjects (Math/English/Science/Social
    Studies) + best 2 electives, not simply "top 6 scores". If your school
    needs that rule instead, tell us the exact core-subject list and this
    function is the only place that needs to change.
    """
    graded = []
    for row in subject_scores:
        score = row.get("score")
        if score is None:
            continue
        grade, remark = get_mock_grade_and_remark(score)
        graded.append({**row, "grade": grade, "grade_point": int(grade), "remark": remark})

    graded.sort(key=lambda r: -r["score"])
    best_six = graded[:6]

    return {
        "raw_total": round(sum(r["score"] for r in best_six), 1),
        "aggregate": sum(r["grade_point"] for r in best_six),
        "best_six_subjects": [r["subject"] for r in best_six],
        "graded_subjects": graded,
    }


# ---------------------------------------------------------------------------
# Pre-school rubric assessment (e.g. Little Angels)
# ---------------------------------------------------------------------------

PRESCHOOL_CATEGORIES = [
    {"key": "crying",        "label": "Crying", "statements": [
        "Does not cry at all", "Cries sometimes", "Cries always"]},
    {"key": "play",          "label": "Play and Has Fun", "statements": [
        "Enjoys play always", "Enjoys and plays sometimes", "Does not enjoy play and fun at all"]},
    {"key": "eating",        "label": "Eating", "statements": [
        "Eats very well", "Eats well sometimes", "Does not eat at all"]},
    {"key": "health",        "label": "Health Status", "statements": [
        "Strong and healthy always", "Strong and healthy sometimes", "Falls sick often"]},
    {"key": "academic",      "label": "Academic – Scribbling & Colouring", "statements": [
        "Scribbling and colouring well always", "Scribbling and colouring sometimes",
        "Does not scribble and colour except guided"]},
    {"key": "punctuality",   "label": "Punctuality", "statements": [
        "Always punctual", "Punctual sometimes", "Not punctual at all"]},
    {"key": "sleeping",      "label": "Sleeping", "statements": [
        "Sleeps well in school always", "Sleeps well sometimes", "Does not sleep well at all"]},
    {"key": "items",         "label": "Item to School", "statements": [
        "Brings all items", "Brings all items sometimes", "Does not bring all items often"]},
    {"key": "relationship",  "label": "Relationship", "statements": [
        "Relates well with others always", "Relates well with others sometimes",
        "Does not relate well with others at all"]},
    {"key": "aggressive",    "label": "Aggressive", "statements": [
        "Not aggressive", "Aggressive sometimes", "Always aggressive"]},
    {"key": "neatness",      "label": "Neatness", "statements": [
        "Very neat always", "Neat sometimes", "Not neat at all"]},
    {"key": "communication", "label": "Communication", "statements": [
        "Communicates well always", "Communicates well sometimes", "Does not communicate well at all"]},
]

PRESCHOOL_GRADE_BANDS = [(80, "A"), (70, "B"), (60, "C"), (0, "D")]


def get_preschool_letter(score) -> str | None:
    if score is None:
        return None
    for threshold, letter in PRESCHOOL_GRADE_BANDS:
        if score >= threshold:
            return letter
    return "D"
# ---------------------------------------------------------------------------
# Feature detection — avoids broad ProgrammingError catches
#
# IMPORTANT: this is intentionally lazy, not eager-at-import-time. The old
# version ran the DB introspection once when this module was first imported
# and cached whatever it got — including a transient failure (DB not ready
# yet, migration still mid-flight on a rolling deploy). That False got stuck
# for the entire lifetime of the worker process, with nothing logged, which
# silently disabled promotion_status/next_class everywhere downstream.
#
# This version only caches a CONFIRMED True. A False result is never cached,
# so the next call just retries the introspection — once the columns are
# actually there, the very next request after that picks it up correctly,
# no restart required.
# ---------------------------------------------------------------------------

_promo_lock = threading.Lock()
_promo_cache = {"value": False}


def _check_promotion_fields() -> bool:
    """
    Returns True only if the Report table has BOTH promotion_status and
    next_class_id columns. Checking both avoids a half-applied migration
    (one column present, the other missing) being reported as fully ready.
    """
    try:
        from apps.results.models import Report
        from django.db import connection

        table = Report._meta.db_table
        with connection.cursor() as cursor:
            col_names = {
                col.name
                for col in connection.introspection.get_table_description(cursor, table)
            }
        return "promotion_status" in col_names and "next_class_id" in col_names
    except Exception:
        logger.exception(
            "Promotion-field introspection failed; will retry on next call "
            "instead of permanently disabling promotion fields."
        )
        return False


def has_promotion_fields() -> bool:
    """
    Lazily checks for promotion_status / next_class columns. Call this
    instead of relying on a module-level constant — it's cheap after the
    first confirmed True (just a dict read), and self-heals if the schema
    wasn't ready the first time it was checked.
    """
    if _promo_cache["value"]:
        return True
    with _promo_lock:
        if not _promo_cache["value"]:
            _promo_cache["value"] = _check_promotion_fields()
        return _promo_cache["value"]


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
    NULL totals (students with no results) are sorted last.
    """
    from apps.students.models import Student

    rows = (
        Student.objects
        .filter(school_class=school_class)
        .annotate(
            total=Sum(
                "results__score",
                filter=Q(results__term=term, results__year=year),
            )
        )
        .order_by(F("total").desc(nulls_last=True))
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