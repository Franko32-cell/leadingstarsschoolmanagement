from django.contrib import admin
from .models import Attendance, SchoolCalendar, TermDates


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ("student", "school_class", "date", "status", "term", "year", "created_by", "updated_by")
    list_filter = ("status", "term", "year", "school_class")
    search_fields = ("student__first_name", "student__last_name", "student__admission_number")
    date_hierarchy = "date"


@admin.register(SchoolCalendar)
class SchoolCalendarAdmin(admin.ModelAdmin):
    list_display = ("name", "event_type", "start_date", "end_date", "is_school_day", "year", "term")
    list_filter = ("event_type", "is_school_day", "year", "term")
    search_fields = ("name", "description")


@admin.register(TermDates)
class TermDatesAdmin(admin.ModelAdmin):
    list_display = ("term", "year", "start_date", "end_date")
    list_filter = ("year", "term")
    ordering = ("-start_date",)
