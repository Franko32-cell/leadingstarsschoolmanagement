"""
Shared grading helpers used by API serializers and views.
"""

GRADE_THRESHOLDS_B79 = [
    (90, "1", "HIGHEST"),
    (80, "2", "HIGHER"),
    (60, "3", "HIGH"),
    (55, "4", "HIGH AVERAGE"),
    (50, "5", "AVERAGE"),
    (45, "6", "LOW AVERAGE"),
    (40, "7", "LOW"),
    (35, "8", "LOWER"),
    (0,  "9", "LOWEST"),
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

GRADE_THRESHOLDS_NKG = GRADE_THRESHOLDS_B16


def get_thresholds(level: str) -> list[tuple[int, str, str]]:
    if level in ("basic_1_6", "nursery_kg"):
        return GRADE_THRESHOLDS_B16
    return GRADE_THRESHOLDS_B79


def get_grade_and_remark(score: float, thresholds: list[tuple[int, str, str]]) -> tuple[str, str]:
    for threshold, grade, remark in thresholds:
        if score >= threshold:
            return grade, remark
    return thresholds[-1][1], thresholds[-1][2]


def get_overall_grade(avg: float, thresholds: list[tuple[int, str, str]]) -> str:
    return get_grade_and_remark(avg, thresholds)[0]
