from datetime import date, timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.attendance import services
from apps.attendance.models import Attendance, SchoolCalendar
from apps.audit.models import AuditLog
from apps.classes.models import SchoolClass
from apps.students.models import Student
from apps.teachers.models import Teacher

User = get_user_model()

# Dates are computed relative to "today" so tests never trip the
# "no future dates" rule: MON is the Monday of LAST week.
_today = timezone.localdate()
MON = _today - timedelta(days=_today.weekday()) - timedelta(days=7)
TUE, WED, THU, FRI = (MON + timedelta(days=i) for i in range(1, 5))
SAT, SUN = MON + timedelta(days=5), MON + timedelta(days=6)

ATT = "/api/attendance/"
CAL = "/api/school-calendar/"


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class Base(TestCase):
    def setUp(self):
        self.class_a = SchoolClass.objects.create(name="JHS 1", level="basic_7_9")
        self.class_b = SchoolClass.objects.create(name="JHS 2", level="basic_7_9")

        self.admin = User.objects.create_user("admin1", password="x", role="admin")
        self.t_a_user = User.objects.create_user("ta", password="x", role="teacher", first_name="Tina", last_name="A")
        self.t_b_user = User.objects.create_user("tb", password="x", role="teacher")
        self.t_none_user = User.objects.create_user("tn", password="x", role="teacher")
        self.teacher_a = Teacher.objects.create(teacher_id="T1", user=self.t_a_user, school_class=self.class_a)
        self.teacher_b = Teacher.objects.create(teacher_id="T2", user=self.t_b_user, school_class=self.class_b)
        Teacher.objects.create(teacher_id="T3", user=self.t_none_user)

        self.s_a1 = self._student("sa1", "A001", "Ama", "Mensah", self.class_a)
        self.s_a2 = self._student("sa2", "A002", "Kofi", "Boateng", self.class_a)
        self.s_b1 = self._student("sb1", "B001", "Esi", "Owusu", self.class_b)

    def _student(self, username, adm, first, last, klass):
        u = User.objects.create_user(username, password="x", role="student")
        return Student.objects.create(user=u, admission_number=adm, first_name=first, last_name=last, school_class=klass)

    def client_for(self, user):
        c = APIClient()
        c.force_authenticate(user=user)
        return c

    def mark(self, student, klass, d, status="present"):
        return Attendance.objects.create(student=student, school_class=klass, date=d, status=status)

    def payload(self, student, klass, d, status="present"):
        return {"student": student.id, "school_class": klass.id, "date": str(d), "status": status}

    def results(self, resp):
        data = resp.json()
        return data["results"] if isinstance(data, dict) and "results" in data else data


class DatesSanity(TestCase):
    def test_fixture_dates(self):
        self.assertEqual(MON.weekday(), 0)
        self.assertEqual(SAT.weekday(), 5)
        self.assertLess(SUN, _today)


# ---------------------------------------------------------------------------
# Permissions & scoping
# ---------------------------------------------------------------------------
class PermissionTests(Base):
    def test_requires_login(self):
        self.assertEqual(APIClient().get(ATT).status_code, 401)

    def test_admin_sees_everything(self):
        self.mark(self.s_a1, self.class_a, MON)
        self.mark(self.s_b1, self.class_b, MON)
        self.assertEqual(len(self.results(self.client_for(self.admin).get(ATT))), 2)

    def test_teacher_sees_only_own_class(self):
        self.mark(self.s_a1, self.class_a, MON)
        self.mark(self.s_b1, self.class_b, MON)
        rows = self.results(self.client_for(self.t_a_user).get(ATT))
        self.assertEqual([r["school_class"] for r in rows], [self.class_a.id])

    def test_teacher_cannot_filter_their_way_into_other_class(self):
        self.mark(self.s_b1, self.class_b, MON)
        r = self.client_for(self.t_a_user).get(ATT, {"school_class": self.class_b.id})
        self.assertEqual(self.results(r), [])
        r = self.client_for(self.t_a_user).get(ATT, {"teacher": self.teacher_b.id})
        self.assertEqual(self.results(r), [])

    def test_teacher_without_class_sees_nothing_and_cannot_write(self):
        self.mark(self.s_a1, self.class_a, MON)
        c = self.client_for(self.t_none_user)
        self.assertEqual(self.results(c.get(ATT)), [])
        self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, TUE), format="json").status_code, 403)

    def test_student_sees_only_own_and_cannot_write(self):
        self.mark(self.s_a1, self.class_a, MON)
        self.mark(self.s_a2, self.class_a, MON)
        c = self.client_for(self.s_a1.user)
        rows = self.results(c.get(ATT))
        self.assertEqual([r["student"] for r in rows], [self.s_a1.id])
        self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, TUE), format="json").status_code, 403)

    def test_teacher_cannot_touch_other_class_record(self):
        rec = self.mark(self.s_b1, self.class_b, MON)
        c = self.client_for(self.t_a_user)
        self.assertEqual(c.get(f"{ATT}{rec.id}/").status_code, 404)
        self.assertEqual(c.patch(f"{ATT}{rec.id}/", {"status": "absent"}, format="json").status_code, 404)
        self.assertEqual(c.delete(f"{ATT}{rec.id}/").status_code, 404)
        rec.refresh_from_db()
        self.assertEqual(rec.status, "present")

    def test_teacher_cannot_create_for_other_class(self):
        r = self.client_for(self.t_a_user).post(ATT, self.payload(self.s_b1, self.class_b, TUE), format="json")
        self.assertEqual(r.status_code, 403)
        self.assertFalse(Attendance.objects.exists())

    def test_teacher_cannot_move_record_to_other_class(self):
        rec = self.mark(self.s_a1, self.class_a, MON)
        r = self.client_for(self.t_a_user).patch(
            f"{ATT}{rec.id}/", {"school_class": self.class_b.id}, format="json")
        self.assertIn(r.status_code, (400, 403))
        rec.refresh_from_db()
        self.assertEqual(rec.school_class_id, self.class_a.id)

    def test_teacher_cannot_delete_even_own_class(self):
        rec = self.mark(self.s_a1, self.class_a, MON)
        r = self.client_for(self.t_a_user).delete(f"{ATT}{rec.id}/")
        self.assertEqual(r.status_code, 403)
        self.assertTrue(Attendance.objects.filter(pk=rec.pk).exists())

    def test_admin_can_delete_and_it_is_audited(self):
        rec = self.mark(self.s_a1, self.class_a, MON)
        self.assertEqual(self.client_for(self.admin).delete(f"{ATT}{rec.id}/").status_code, 204)
        self.assertFalse(Attendance.objects.filter(pk=rec.pk).exists())
        self.assertTrue(AuditLog.objects.filter(module="attendance", action="delete").exists())


# ---------------------------------------------------------------------------
# Marking, audit trail, integrity
# ---------------------------------------------------------------------------
class MarkingTests(Base):
    def test_teacher_marks_own_class_and_audit_fields_set(self):
        r = self.client_for(self.t_a_user).post(ATT, self.payload(self.s_a1, self.class_a, MON, "late"), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        rec = Attendance.objects.get()
        self.assertEqual(rec.created_by, self.t_a_user)
        self.assertEqual(rec.updated_by, self.t_a_user)
        self.assertEqual(rec.term, settings.CURRENT_TERM)
        self.assertEqual(rec.year, settings.CURRENT_YEAR)
        body = r.json()
        self.assertEqual(body["created_by_name"], "Tina A")
        self.assertTrue(body["created_at"] and body["updated_at"])
        self.assertTrue(AuditLog.objects.filter(module="attendance", action="create").exists())

    def test_client_cannot_set_term_year_or_created_by(self):
        data = self.payload(self.s_a1, self.class_a, MON)
        data.update({"term": "term1", "year": 2001, "created_by": self.admin.id})
        r = self.client_for(self.t_a_user).post(ATT, data, format="json")
        self.assertEqual(r.status_code, 201)
        rec = Attendance.objects.get()
        self.assertEqual((rec.term, rec.year, rec.created_by), (settings.CURRENT_TERM, settings.CURRENT_YEAR, self.t_a_user))

    def test_update_records_modifier_and_audit_with_previous_value(self):
        rec = self.mark(self.s_a1, self.class_a, MON)
        r = self.client_for(self.admin).patch(f"{ATT}{rec.id}/", {"status": "excused"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        rec.refresh_from_db()
        self.assertEqual((rec.status, rec.updated_by), ("excused", self.admin))
        log = AuditLog.objects.get(module="attendance", action="attendance_update")
        self.assertEqual(log.previous_value["status"], "present")
        self.assertEqual(log.new_value["status"], "excused")

    def test_excused_status_accepted_invalid_rejected(self):
        c = self.client_for(self.admin)
        self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, MON, "excused"), format="json").status_code, 201)
        self.assertEqual(c.post(ATT, self.payload(self.s_a2, self.class_a, MON, "sleeping"), format="json").status_code, 400)

    def test_duplicate_rejected(self):
        c = self.client_for(self.t_a_user)
        self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, MON), format="json").status_code, 201)
        self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, MON, "absent"), format="json").status_code, 400)
        self.assertEqual(Attendance.objects.count(), 1)

    def test_patch_does_not_trip_duplicate_check(self):
        rec = self.mark(self.s_a1, self.class_a, MON)
        r = self.client_for(self.t_a_user).patch(f"{ATT}{rec.id}/", {"status": "absent"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)

    def test_student_must_be_enrolled_in_class(self):
        r = self.client_for(self.admin).post(ATT, self.payload(self.s_b1, self.class_a, MON), format="json")
        self.assertEqual(r.status_code, 400)

    def test_future_date_rejected(self):
        future = _today + timedelta(days=3)
        r = self.client_for(self.admin).post(ATT, self.payload(self.s_a1, self.class_a, future), format="json")
        self.assertEqual(r.status_code, 400)

    def test_archived_student_rejected(self):
        self.s_a1.user.account_status = "archived"
        self.s_a1.user.save()
        r = self.client_for(self.admin).post(ATT, self.payload(self.s_a1, self.class_a, MON), format="json")
        self.assertEqual(r.status_code, 400)

    def test_deleted_student_cascades_cleanly(self):
        self.mark(self.s_a1, self.class_a, MON)
        self.s_a1.delete()
        self.assertEqual(Attendance.objects.count(), 0)


# ---------------------------------------------------------------------------
# Holidays / weekends
# ---------------------------------------------------------------------------
class NonSchoolDayTests(Base):
    def hol(self, start, end=None, **kw):
        return SchoolCalendar.objects.create(
            name=kw.pop("name", "Break"), start_date=start, end_date=end or start,
            year=settings.CURRENT_YEAR, **kw)

    def test_holiday_blocks_teacher_via_api(self):
        self.hol(TUE)
        r = self.client_for(self.t_a_user).post(ATT, self.payload(self.s_a1, self.class_a, TUE), format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("non-school day", str(r.json()["date"]))
        self.assertFalse(Attendance.objects.exists())

    def test_holiday_blocks_admin_too(self):
        self.hol(TUE)
        r = self.client_for(self.admin).post(ATT, self.payload(self.s_a1, self.class_a, TUE), format="json")
        self.assertEqual(r.status_code, 400)

    def test_multi_day_range_blocks_every_day_but_not_neighbours(self):
        self.hol(TUE, THU, event_type="mid_term_break")
        c = self.client_for(self.t_a_user)
        for d in (TUE, WED, THU):
            self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, d), format="json").status_code, 400, d)
        for d in (MON, FRI):
            self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, d), format="json").status_code, 201, d)

    def test_weekend_blocked_by_default(self):
        c = self.client_for(self.t_a_user)
        for d in (SAT, SUN):
            self.assertEqual(c.post(ATT, self.payload(self.s_a1, self.class_a, d), format="json").status_code, 400, d)

    @override_settings(ATTENDANCE_ALLOW_WEEKENDS=True)
    def test_weekend_allowed_when_configured(self):
        r = self.client_for(self.t_a_user).post(ATT, self.payload(self.s_a1, self.class_a, SAT), format="json")
        self.assertEqual(r.status_code, 201)

    def test_school_day_override_allows_a_saturday(self):
        self.hol(SAT, name="Make-up class", is_school_day=True)
        r = self.client_for(self.t_a_user).post(ATT, self.payload(self.s_a1, self.class_a, SAT), format="json")
        self.assertEqual(r.status_code, 201, r.content)

    def test_moving_a_record_onto_a_holiday_is_blocked(self):
        self.hol(WED)
        rec = self.mark(self.s_a1, self.class_a, TUE)
        r = self.client_for(self.admin).patch(f"{ATT}{rec.id}/", {"date": str(WED)}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_legacy_record_on_holiday_can_still_be_corrected_or_deleted_by_admin(self):
        rec = self.mark(self.s_a1, self.class_a, WED)   # recorded before the holiday existed
        self.hol(WED)
        c = self.client_for(self.admin)
        self.assertEqual(c.patch(f"{ATT}{rec.id}/", {"status": "absent"}, format="json").status_code, 200)
        self.assertEqual(c.delete(f"{ATT}{rec.id}/").status_code, 204)

    def test_model_level_guard(self):
        from django.core.exceptions import ValidationError
        self.hol(TUE)
        with self.assertRaises(ValidationError):
            Attendance(student=self.s_a1, school_class=self.class_a, date=TUE, status="present").full_clean(exclude=["id"])


# ---------------------------------------------------------------------------
# Filtering
# ---------------------------------------------------------------------------
class FilterTests(Base):
    def setUp(self):
        super().setUp()
        self.mark(self.s_a1, self.class_a, MON, "present")
        self.mark(self.s_a1, self.class_a, TUE, "absent")
        self.mark(self.s_a2, self.class_a, TUE, "late")
        self.mark(self.s_a1, self.class_a, WED, "excused")
        self.mark(self.s_b1, self.class_b, TUE, "absent")
        self.c = self.client_for(self.admin)

    def ids(self, **params):
        r = self.c.get(ATT, params)
        self.assertEqual(r.status_code, 200, r.content)
        return len(self.results(r))

    def test_single_date(self):
        self.assertEqual(self.ids(date=str(TUE)), 3)

    def test_date_range_and_aliases(self):
        self.assertEqual(self.ids(date_after=str(TUE), date_before=str(WED)), 4)
        self.assertEqual(self.ids(start_date=str(TUE), end_date=str(WED)), 4)

    def test_class_student_teacher_status(self):
        self.assertEqual(self.ids(school_class=self.class_b.id), 1)
        self.assertEqual(self.ids(**{"class": self.class_b.id}), 1)
        self.assertEqual(self.ids(student=self.s_a2.id), 1)
        self.assertEqual(self.ids(teacher=self.teacher_a.id), 4)
        self.assertEqual(self.ids(status="absent"), 2)
        self.assertEqual(self.ids(status="absent,late"), 3)
        self.assertEqual(self.ids(status="excused"), 1)

    def test_year_term_and_academic_year_alias(self):
        self.assertEqual(self.ids(year=settings.CURRENT_YEAR, term=settings.CURRENT_TERM), 5)
        self.assertEqual(self.ids(academic_year=f"{settings.CURRENT_YEAR}/{settings.CURRENT_YEAR + 1}"), 5)
        self.assertEqual(self.ids(year=1999), 0)

    def test_filters_combine(self):
        self.assertEqual(self.ids(school_class=self.class_a.id, status="absent",
                                  date_after=str(MON), date_before=str(FRI)), 1)

    def test_invalid_inputs_return_400(self):
        self.assertEqual(self.c.get(ATT, {"date_after": str(FRI), "date_before": str(MON)}).status_code, 400)
        self.assertEqual(self.c.get(ATT, {"date_after": "not-a-date"}).status_code, 400)
        self.assertEqual(self.c.get(ATT, {"status": "napping"}).status_code, 400)

    def test_search_by_name_or_admission_number(self):
        self.assertEqual(self.ids(search="Boateng"), 1)
        self.assertEqual(self.ids(search="B001"), 1)

    def test_pagination_is_opt_in(self):
        plain = self.c.get(ATT).json()
        self.assertIsInstance(plain, list)
        paged = self.c.get(ATT, {"page": 1, "page_size": 2}).json()
        self.assertEqual((paged["count"], len(paged["results"])), (5, 2))


# ---------------------------------------------------------------------------
# Calculations & summary
# ---------------------------------------------------------------------------
class CalculationTests(Base):
    def test_spec_example_19_school_days(self):
        # Sept 2026: 30 calendar days, 8 weekend days, 3 holiday weekdays -> 19
        SchoolCalendar.objects.create(name="Break", start_date=date(2026, 9, 14),
                                      end_date=date(2026, 9, 16), year=2026)
        self.assertEqual(services.count_school_days(date(2026, 9, 1), date(2026, 9, 30)), 19)

    def test_spec_percentage_17_of_19(self):
        qs = Attendance.objects.none()
        row = services._finish({"present": 15, "late": 2, "absent": 2, "excused": 0})
        self.assertEqual(row["percentage"], 89.47)

    def _week_of_records(self):
        SchoolCalendar.objects.create(name="Holiday", start_date=FRI, end_date=FRI, year=settings.CURRENT_YEAR)
        self.mark(self.s_a1, self.class_a, MON, "present")
        self.mark(self.s_a1, self.class_a, TUE, "late")
        self.mark(self.s_a1, self.class_a, WED, "absent")
        self.mark(self.s_a1, self.class_a, THU, "excused")
        self.mark(self.s_a1, self.class_a, FRI, "absent")   # on a holiday: must be ignored
        self.mark(self.s_a1, self.class_a, SAT, "absent")   # on a weekend: must be ignored

    def test_counts_ignore_holidays_weekends_and_exclude_excused(self):
        self._week_of_records()
        c = services.attendance_counts(Attendance.objects.filter(student=self.s_a1))
        self.assertEqual((c["present"], c["late"], c["absent"], c["excused"]), (1, 1, 1, 1))
        self.assertEqual(c["counted_days"], 3)             # excused not counted
        self.assertEqual(c["percentage"], 66.67)           # 2 / 3

    def test_percentage_none_when_nothing_counted(self):
        self.mark(self.s_a1, self.class_a, MON, "excused")
        c = services.attendance_counts(Attendance.objects.all())
        self.assertIsNone(c["percentage"])

    def test_summary_endpoint(self):
        self._week_of_records()
        self.mark(self.s_a2, self.class_a, MON, "present")
        r = self.client_for(self.admin).get(f"{ATT}summary/", {
            "school_class": self.class_a.id, "start_date": str(MON), "end_date": str(SUN)})
        self.assertEqual(r.status_code, 200, r.content)
        d = r.json()
        self.assertEqual(d["period"], {"start": str(MON), "end": str(SUN)})
        self.assertEqual(d["school_days"], 4)              # Mon-Thu; Fri holiday; weekend
        self.assertEqual([h["date"] for h in d["holidays"]], [str(FRI)])
        rows = {s["admission_number"]: s for s in d["students"]}
        self.assertEqual(rows["A001"]["percentage"], 66.67)
        self.assertEqual(rows["A001"]["excused"], 1)
        self.assertEqual(rows["A002"]["percentage"], 100.0)
        self.assertEqual(d["totals"]["school_days"], 4)

    def test_summary_is_scoped_for_teachers(self):
        self.mark(self.s_a1, self.class_a, MON, "present")
        self.mark(self.s_b1, self.class_b, MON, "absent")
        d = self.client_for(self.t_a_user).get(f"{ATT}summary/", {"date": str(MON)}).json()
        self.assertEqual([s["admission_number"] for s in d["students"]], ["A001"])
        self.assertEqual(d["totals"]["absent"], 0)

    def test_summary_rejects_bad_range(self):
        r = self.client_for(self.admin).get(f"{ATT}summary/", {"start_date": str(FRI), "end_date": str(MON)})
        self.assertEqual(r.status_code, 400)

    def test_analytics_dashboard_uses_school_day_maths(self):
        self._week_of_records()
        r = self.client_for(self.admin).get(
            "/api/analytics/dashboard/", {"term": settings.CURRENT_TERM, "year": settings.CURRENT_YEAR})
        self.assertEqual(r.status_code, 200, r.content)
        att = r.json()["attendance"]
        self.assertEqual(att["rate"], 66.7)
        self.assertEqual(att["total_records"], 3)


# ---------------------------------------------------------------------------
# School calendar API
# ---------------------------------------------------------------------------
class CalendarApiTests(Base):
    def body(self, **kw):
        d = {"name": "Mid-Term Break", "event_type": "mid_term_break",
             "start_date": str(MON), "end_date": str(WED), "term": "term3", "description": "Rest"}
        d.update(kw)
        return d

    def test_admin_crud_and_audit(self):
        c = self.client_for(self.admin)
        r = c.post(CAL, self.body(), format="json")
        self.assertEqual(r.status_code, 201, r.content)
        pk = r.json()["id"]
        self.assertEqual(r.json()["year"], MON.year)
        self.assertEqual(SchoolCalendar.objects.get(pk=pk).created_by, self.admin)
        self.assertEqual(c.patch(f"{CAL}{pk}/", {"name": "Break 2"}, format="json").status_code, 200)
        self.assertEqual(SchoolCalendar.objects.get(pk=pk).updated_by, self.admin)
        self.assertEqual(c.delete(f"{CAL}{pk}/").status_code, 204)
        for action in ("create", "update", "delete"):
            self.assertTrue(AuditLog.objects.filter(module="attendance", resource_type="SchoolCalendar", action=action).exists(), action)

    def test_single_date_defaults_end_date(self):
        body = self.body()
        del body["end_date"]
        r = self.client_for(self.admin).post(CAL, body, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["end_date"], str(MON))

    def test_end_before_start_rejected(self):
        r = self.client_for(self.admin).post(CAL, self.body(start_date=str(WED), end_date=str(MON)), format="json")
        self.assertEqual(r.status_code, 400)

    def test_teacher_and_student_can_read_not_write(self):
        entry = SchoolCalendar.objects.create(name="H", start_date=MON, end_date=MON, year=2026)
        for u in (self.t_a_user, self.s_a1.user):
            c = self.client_for(u)
            self.assertEqual(c.get(CAL).status_code, 200)
            self.assertEqual(c.post(CAL, self.body(), format="json").status_code, 403)
            self.assertEqual(c.patch(f"{CAL}{entry.id}/", {"name": "x"}, format="json").status_code, 403)
            self.assertEqual(c.delete(f"{CAL}{entry.id}/").status_code, 403)
        self.assertEqual(APIClient().get(CAL).status_code, 401)

    def test_list_filters(self):
        SchoolCalendar.objects.create(name="A", start_date=MON, end_date=MON, year=2026, term="term1")
        SchoolCalendar.objects.create(name="B", start_date=TUE, end_date=TUE, year=2025, term="term3")
        c = self.client_for(self.admin)
        self.assertEqual(len(c.get(CAL, {"year": 2026}).json()), 1)
        self.assertEqual(len(c.get(CAL, {"term": "term3"}).json()), 1)
        self.assertEqual(len(c.get(CAL, {"date_after": str(TUE), "date_before": str(TUE)}).json()), 1)

    def test_check_endpoint(self):
        SchoolCalendar.objects.create(name="Founders Day", start_date=TUE, end_date=TUE, year=2026)
        c = self.client_for(self.t_a_user)
        hol = c.get(f"{CAL}check/", {"date": str(TUE)}).json()
        self.assertFalse(hol["is_school_day"])
        self.assertEqual(hol["reason"], "Founders Day")
        self.assertTrue(c.get(f"{CAL}check/", {"date": str(MON)}).json()["is_school_day"])
        self.assertEqual(c.get(f"{CAL}check/", {"date": str(SAT)}).json()["reason"], "Weekend")
        self.assertEqual(c.get(f"{CAL}check/", {"date": "bad"}).status_code, 400)

    def test_days_endpoint(self):
        SchoolCalendar.objects.create(name="Break", start_date=TUE, end_date=WED, year=2026)
        d = self.client_for(self.t_a_user).get(f"{CAL}days/", {"start": str(MON), "end": str(SUN)}).json()
        self.assertEqual(d["school_days"], 3)              # Mon, Thu, Fri
        self.assertEqual(len(d["non_school_days"]), 4)     # Tue, Wed, Sat, Sun
        r = self.client_for(self.admin).get(f"{CAL}days/", {"start": str(SUN), "end": str(MON)})
        self.assertEqual(r.status_code, 400)
