from django.contrib import admin
from .models import Result, CharacterAssessment, Report

@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "student", "subject", "school_class"
        )

@admin.register(CharacterAssessment)
class CharacterAssessmentAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).select_related("student", "school_class")

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        return super().get_queryset(request).select_related("student")
