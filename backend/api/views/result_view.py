import logging

from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.results.models import Result
from api.serializers.result_serializer import ResultSerializer
from .grades import get_grade_and_remark, get_thresholds, get_overall_grade

# ── Audit logging ────────────────────────────────────────────────────────
from apps.audit.models import AuditLog
from apps.audit.services import log_action

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Note: the per-student report card (StudentReportView) now lives exclusively
# in report_view.py. The old duplicate implementation that used to live here
# has been removed — it was missing the get_overall_grade import (causing a
# 500/NameError) and had been fully superseded by report_view.py's version
# (aggregated ranking, attendance aggregation, promotion fields,
# nursery_kg handling). Make sure urls.py imports StudentReportView from
# report_view, not from this module.
# ---------------------------------------------------------------------------


def get_current_year() -> int:
    return getattr(settings, "CURRENT_YEAR", timezone.now().year)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _computed_score(result: Result) -> float:
    """
    Returns the subject total computed live from reopen+ca+exams, rather
    than trusting the persisted `score` column.

    Result.save() is supposed to guarantee score == reopen+ca+exams on
    every write, but a handful of production rows have been found with a
    stale/mismatched `score` (most likely from a raw-SQL data fix, an old
    pre-migration formula, or a duplicate row for the same
    student+subject+term+year under a different school_class — the model's
    unique_together does not include school_class, so that's possible).

    This mirrors _computed_score() in report_view.py / pdf_view.py.
    Ranking (subject positions and the class summary) has to use the same
    source of truth as the per-student report, or a stale row can make a
    student's rank and the total shown on their report disagree.

    This does NOT fix the underlying bad row — run a data-repair pass
    (iterate Result.objects.all() and call .save() on any row where
    stored score != reopen+ca+exams) to fix those at the source.
    """
    return round((result.reopen or 0.0) + (result.ca or 0.0) + (result.exams or 0.0), 1)


def recompute_subject_positions(subject_id, term, school_class_id, year):
    """
    Rank all results for a subject+term+class+year by score descending.
    Uses standard competition ranking: tied scores share the same rank and
    the next rank skips (1, 1, 3, 4 …).

    Ranks on the live computed score (reopen+ca+exams) rather than the
    persisted `score` column — see _computed_score() docstring.
    """
    results = list(
        Result.objects.filter(
            subject_id=subject_id,
            term=term,
            school_class_id=school_class_id,
            year=year,
        )
    )
    results.sort(key=lambda r: (-_computed_score(r), r.id))

    current_rank = 0
    prev_score   = object()  # sentinel — never equals a real score

    for i, r in enumerate(results):
        score = _computed_score(r)
        if score != prev_score:
            current_rank = i + 1
            prev_score   = score
        r.subject_position = current_rank

    Result.objects.bulk_update(results, ["subject_position"])


def assign_subject_positions(results: list[Result]) -> None:
    """Assign live subject positions for an in-memory list of Result rows."""
    groups: dict = {}
    for result in results:
        key = (result.subject_id, result.term, result.school_class_id, result.year)
        groups.setdefault(key, []).append(result)

    for group in groups.values():
        group.sort(key=lambda r: (-_computed_score(r), r.id))
        current_rank = 0
        prev_score = object()
        for i, result in enumerate(group):
            score = _computed_score(result)
            if score != prev_score:
                current_rank = i + 1
                prev_score = score
            result.subject_position = current_rank


def _assign_ranks(rows: list[dict], key: str = "total_score") -> None:
    """Standard competition ranking (1, 1, 3, 4 …) by descending key value."""
    current_rank = 0
    prev_value   = object()
    for i, row in enumerate(rows):
        if row[key] != prev_value:
            current_rank = i + 1
            prev_value   = row[key]
        row["rank"] = current_rank


# ---------------------------------------------------------------------------
# ViewSet
# ---------------------------------------------------------------------------

class ResultViewSet(ModelViewSet):

    # Component caps mirror the model's validators (reopen ≤20, ca ≤40,
    # exams ≤40) so reopen+ca+exams can never exceed 100. These are
    # re-enforced manually in bulk_save because update_or_create() calls
    # model.save() directly, which does NOT run field validators — only
    # DRF serializers (i.e. normal POST/PATCH through this ViewSet) do.
    COMPONENT_MAX = {"reopen": 20, "ca": 40, "exams": 40}

    queryset           = Result.objects.all().order_by("-created_at")
    serializer_class   = ResultSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs     = super().get_queryset()
        params = self.request.query_params

        student      = params.get("student")
        school_class = params.get("school_class")
        term         = params.get("term")
        subject      = params.get("subject")
        year         = params.get("year")

        if student: qs = qs.filter(student_id=student)

        if school_class:
            # FIX: was `qs.filter(school_class_id=school_class)`, which
            # filters on Result.school_class — a value that's only set at
            # save time and can go stale (e.g. a student is promoted/moved
            # to a new class after their result was saved; the model's
            # unique_together doesn't even include school_class, see
            # _computed_score() docstring above).
            #
            # bulk_save()'s update_or_create() intentionally keys on
            # student + subject + term + year, NOT school_class — meaning
            # school_class is not actually part of a Result's identity.
            # Filtering GET-list by the stale Result.school_class caused
            # existing rows to silently disappear from "Enter Results"
            # whenever a student's current class no longer matched what
            # was stored on the row: the frontend then rendered empty
            # score fields as if nothing had ever been saved, when a row
            # existed all along and bulk_save would have found and
            # updated it.
            #
            # Filtering on the student's CURRENT class instead keeps this
            # query consistent with how bulk_save identifies "this
            # student's result," so previously-saved scores reliably show
            # up for observation/editing whenever the matching
            # class/subject/term/year is selected.
            qs = qs.filter(student__school_class_id=school_class)

        if term:    qs = qs.filter(term=term)
        if subject: qs = qs.filter(subject_id=subject)
        if year:    qs = qs.filter(year=year)
        return qs

    def perform_create(self, serializer):
        instance = serializer.save()
        recompute_subject_positions(
            instance.subject_id, instance.term, instance.school_class_id, instance.year
        )
        log_action(
            request=self.request,
            action=AuditLog.Action.RESULT_UPLOAD,
            module=AuditLog.Module.RESULTS,
            resource_type="Result",
            resource_id=instance.id,
            resource_repr=f"Result: {instance.student} — {instance.subject} ({instance.term})",
            new_value={"score": instance.score},
        )

    def perform_update(self, serializer):
        previous_score = self.get_object().score
        instance = serializer.save()
        recompute_subject_positions(
            instance.subject_id, instance.term, instance.school_class_id, instance.year
        )
        log_action(
            request=self.request,
            action=AuditLog.Action.RESULT_UPLOAD,
            module=AuditLog.Module.RESULTS,
            resource_type="Result",
            resource_id=instance.id,
            resource_repr=f"Result updated: {instance.student} — {instance.subject} ({instance.term})",
            previous_value={"score": previous_score},
            new_value={"score": instance.score},
        )

    def perform_destroy(self, instance):
        """
        Deletions previously left no audit trail. Capture a snapshot before
        deleting, then recompute positions for the affected subject/term/
        class/year so the remaining results don't have a stale ranking gap.
        """
        snapshot = {
            "student": str(instance.student),
            "subject": str(instance.subject),
            "term":    instance.term,
            "year":    instance.year,
            "score":   instance.score,
        }
        subject_id       = instance.subject_id
        term              = instance.term
        school_class_id   = instance.school_class_id
        year              = instance.year

        instance.delete()

        recompute_subject_positions(subject_id, term, school_class_id, year)

        log_action(
            request=self.request,
            action=AuditLog.Action.RESULT_UPLOAD,
            module=AuditLog.Module.RESULTS,
            resource_type="Result",
            resource_repr=(
                f"Result deleted: {snapshot['student']} — "
                f"{snapshot['subject']} ({snapshot['term']})"
            ),
            previous_value=snapshot,
        )

    # ------------------------------------------------------------------
    # Bulk upsert — partial-save safe + year-aware
    # ------------------------------------------------------------------

    @action(detail=False, methods=["post"], url_path="bulk-save")
    def bulk_save(self, request):
        """
        Accepts a list of records. Each record may contain only a subset of
        {reopen, ca, exams}. Fields that are omitted or None are preserved
        from the existing database row — they are NOT zeroed out.

        Component values are validated against the same caps as the model
        (reopen ≤20, ca ≤40, exams ≤40) so the total can never silently
        exceed 100 — update_or_create() bypasses model-field validators,
        so this check has to happen explicitly here.

        Unique lookup key: student + subject + term + year.
        """
        records = request.data if isinstance(request.data, list) else [request.data]
        saved   = []
        errors  = []
        # Derived from what was actually saved (not raw request data), so a
        # record that omitted `school_class` still recomputes positions for
        # the class the row actually ended up in.
        combos: set = set()

        for record in records:
            missing = [k for k in ("student", "subject", "term") if k not in record]
            if missing:
                errors.append({"record": record, "error": f"Missing fields: {missing}"})
                continue

            try:
                year = int(record.get("year") or get_current_year())
            except (TypeError, ValueError):
                errors.append({"record": record, "error": "year must be a valid integer"})
                continue

            try:
                existing = Result.objects.filter(
                    student_id=record["student"],
                    subject_id=record["subject"],
                    term=record["term"],
                    year=year,
                ).first()

                if "school_class" in record:
                    school_class_id = record.get("school_class")
                elif existing is not None:
                    school_class_id = existing.school_class_id
                else:
                    school_class_id = None

                defaults = {"school_class_id": school_class_id}

                # Only overwrite a component if the caller actually sent it
                # (not None and not an empty string). This preserves
                # previously-saved values for components the teacher hasn't
                # entered yet. Each provided value is validated against its
                # cap so reopen+ca+exams can never silently exceed 100.
                component_errors = []
                for field, max_value in self.COMPONENT_MAX.items():
                    val = record.get(field)
                    if val is not None and val != "":
                        try:
                            val = float(val)
                        except (TypeError, ValueError):
                            component_errors.append(f"{field} must be a number")
                            continue
                        if val < 0 or val > max_value:
                            component_errors.append(
                                f"{field} must be between 0 and {max_value} (got {val})"
                            )
                            continue
                        defaults[field] = val
                    elif existing:
                        defaults[field] = getattr(existing, field)
                    else:
                        defaults[field] = 0.0

                if component_errors:
                    errors.append({"record": record, "error": "; ".join(component_errors)})
                    continue

                instance, _ = Result.objects.update_or_create(
                    student_id=record["student"],
                    subject_id=record["subject"],
                    term=record["term"],
                    year=year,
                    defaults=defaults,
                )
                saved.append(instance.id)
                combos.add((
                    instance.subject_id,
                    instance.term,
                    instance.school_class_id,
                    instance.year,
                ))

            except IntegrityError as exc:
                errors.append({"record": record, "error": str(exc)})
            except (TypeError, ValueError) as exc:
                errors.append({"record": record, "error": str(exc)})
            except Exception:
                logger.exception("Unexpected error in bulk_save for record %s", record)
                errors.append({"record": record, "error": "Unexpected server error."})

        # Recompute positions for every affected (subject, term, class, year)
        # combo — based on saved instances, not raw input (see comment above).
        for subject_id, term, class_id, year in combos:
            recompute_subject_positions(subject_id, term, class_id, year)

        log_action(
            request=request,
            action=AuditLog.Action.RESULT_UPLOAD,
            module=AuditLog.Module.RESULTS,
            resource_type="Result",
            resource_repr=f"Bulk result upload ({len(records)} records)",
            status=AuditLog.Status.SUCCESS if not errors else AuditLog.Status.FAILED,
            new_value={"saved": len(saved), "errors": len(errors)},
        )

        response_status = (
            status.HTTP_400_BAD_REQUEST  if not saved and errors else
            status.HTTP_207_MULTI_STATUS if errors               else
            status.HTTP_200_OK
        )
        return Response({"saved": len(saved), "errors": errors}, status=response_status)

    # ------------------------------------------------------------------
    # Class summary (ranked) — year-aware
    # ------------------------------------------------------------------

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        school_class = request.query_params.get("school_class")
        term         = request.query_params.get("term")
        year         = request.query_params.get("year")

        if not school_class or not term:
            return Response(
                {"error": "school_class and term are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # FIX: was `school_class_id=school_class` — filtering on Result's
        # own (denormalized, save-time-only) school_class field. Same issue
        # as get_queryset() above: if a student moved classes after a
        # result was saved, that row's stored school_class goes stale and
        # the row would silently drop out of this summary even though it's
        # still that student's live, editable result. Filtering on the
        # student's CURRENT class keeps the class summary consistent with
        # both the "Enter Results" list and bulk_save's own lookup key
        # (student + subject + term + year, not school_class).
        qs = Result.objects.filter(
            student__school_class_id=school_class,
            term=term,
        ).select_related("student", "student__school_class", "subject")

        if year:
            qs = qs.filter(year=year)

        results = list(qs)
        assign_subject_positions(results)

        student_map: dict = {}

        for r in results:
            sid        = r.student.id
            level      = getattr(r.student.school_class, "level", "basic_7_9") if r.student.school_class else "basic_7_9"
            thresholds = get_thresholds(level)
            # FIX: recompute from components instead of trusting r.score,
            # which has been found to be stale/out-of-sync for some rows
            # (see _computed_score() docstring). Using the raw column here
            # let a student's class-summary total/rank disagree with the
            # total shown on their individual report card.
            score      = _computed_score(r)
            grade, remark = get_grade_and_remark(score, thresholds)

            if sid not in student_map:
                student_map[sid] = {
                    "student_id":       r.student.id,
                    "student_name":     r.student.full_name,
                    "admission_number": r.student.admission_number,
                    "level":            level,
                    "subjects":         [],
                    "total_score":      0,
                    "count":            0,
                }

            student_map[sid]["subjects"].append({
                "subject_id":       r.subject.id,
                "subject_name":     r.subject.name,
                "reopen":           r.reopen,
                "ca":               r.ca,
                "exams":            r.exams,
                "score":            score,
                "grade":            grade,
                "remark":           remark,
                "subject_position": r.subject_position,
            })

            # _computed_score() always returns a float, so every result now
            # contributes to the total (previously guarded by
            # `if r.score is not None`, which was a proxy for "row has a
            # score" that's no longer meaningful once we compute it live).
            student_map[sid]["total_score"] += score
            student_map[sid]["count"]        += 1

        rows = []
        for data in student_map.values():
            count      = data["count"]
            total      = round(data["total_score"], 1)
            avg        = round(total / count, 1) if count else 0
            thresholds = get_thresholds(data["level"])

            rows.append({
                "student_id":       data["student_id"],
                "student_name":     data["student_name"],
                "admission_number": data["admission_number"],
                "subjects":         data["subjects"],
                "total_score":      total,
                "average_score":    avg,
                "overall_grade":    get_overall_grade(avg, thresholds),
                "subject_count":    count,
            })

        rows.sort(key=lambda x: x["total_score"], reverse=True)
        _assign_ranks(rows)
        return Response(rows)
