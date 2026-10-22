"""
mock_scoring.py
backend/api/views/mock_scoring.py

Best-six rule for Basic 9 BECE-style mocks.

The best six must cover ALL FOUR core subjects (English Language, Mathematics,
Integrated Science, Social Studies) plus the student's best TWO other subjects.

If a student is missing a score in any core subject, the aggregate is still
calculated from what exists but is flagged as incomplete (provisional).

This is the single source of truth for the rule on the backend. Both
MockReportView (JSON) and the mock PDF views use compute_mock_aggregate().
The frontend (MockResults.jsx) mirrors the same rule for the on-screen totals.
"""

import re

from .grades import get_mock_grade_and_remark

# (code, label, accepted aliases) — in BECE display order. Core subjects first.
BECE_SUBJECTS = [
    ("ENG", "English Language", ["english language", "english"]),
    ("MATH", "Mathematics", ["mathematics", "maths", "math"]),
    ("SCI", "Integrated Science", ["integrated science", "science"]),
    ("SOC", "Social Studies", ["social studies"]),
    ("RME", "Religious & Moral Ed.", [
        "religious and moral education", "religious and moral studies",
        "religious moral education", "rme",
    ]),
    ("TWI", "Asante Twi", [
        "asante twi", "asanti twi", "twi", "ghanaian language asante twi",
        "ghanaian language",
    ]),
    ("ICT", "Computing (ICT)", ["computing", "computing ict", "ict"]),
    ("CAD", "Creative Arts & Design", ["creative arts and design", "creative arts"]),
    ("CTECH", "Career Technology", ["career technology"]),
    ("FRE", "French", ["french"]),
]

CORE_CODES = ("ENG", "MATH", "SCI", "SOC")
CODE_LABELS = {code: label for code, label, _ in BECE_SUBJECTS}
CODE_ORDER = {code: i for i, (code, _, _) in enumerate(BECE_SUBJECTS)}

# Lower bound of each grade band (must match grades.py mock thresholds).
MOCK_BAND_FLOORS = [74, 65, 60, 55, 50, 45, 40, 35, 0]


def _normalize(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower().replace("&", " and ")).strip()


def subject_code(name):
    """Map a DB subject name to a BECE code (ENG, MATH, ...) or None."""
    n = _normalize(name)
    c = n.replace(" ", "")
    for loose in (False, True):
        for code, _label, aliases in BECE_SUBJECTS:
            for alias in aliases:
                na = _normalize(alias)
                if n == na or c == na.replace(" ", ""):
                    return code
                if loose and f" {na} " in f" {n} ":
                    return code
    return None


def is_core(name):
    return subject_code(name) in CORE_CODES


def compute_mock_aggregate(rows):
    """
    rows: [{"subject": <name>, "score": <number>}, ...]

    Returns {
        raw_total, aggregate, best_six_subjects (names), count,
        core_missing (labels), complete (bool)
    }
    """
    scored = []
    for row in rows:
        try:
            score = float(row["score"])
        except (TypeError, ValueError):
            continue
        scored.append({
            "subject": row["subject"],
            "score": score,
            "code": subject_code(row["subject"]),
        })

    # One entry per core subject (the highest, in case of duplicates)
    core_pick = {}
    for item in scored:
        code = item["code"]
        if code in CORE_CODES and (code not in core_pick or item["score"] > core_pick[code]["score"]):
            core_pick[code] = item
    cores = [core_pick[code] for code in CORE_CODES if code in core_pick]

    core_ids = {id(i) for i in cores}
    others = sorted((i for i in scored if id(i) not in core_ids), key=lambda i: -i["score"])
    chosen = cores + others[: max(0, 6 - len(cores))]

    core_missing = [CODE_LABELS[c] for c in CORE_CODES if c not in core_pick]
    return {
        "raw_total": round(sum(i["score"] for i in chosen), 1),
        "aggregate": sum(int(get_mock_grade_and_remark(i["score"])[0]) for i in chosen),
        "best_six_subjects": [i["subject"] for i in chosen],
        "count": len(chosen),
        "core_missing": core_missing,
        "complete": len(chosen) == 6 and not core_missing,
    }


def mock_interp_bands():
    """[(grade, range_text, remark), ...] for the interpretation key."""
    bands = []
    for i, floor in enumerate(MOCK_BAND_FLOORS):
        grade, remark = get_mock_grade_and_remark(floor)
        if i == 0:
            rng = f"{floor} - 100"
        else:
            rng = f"{floor} - below {MOCK_BAND_FLOORS[i - 1]}"
        bands.append((str(grade), rng, remark))
    return bands
