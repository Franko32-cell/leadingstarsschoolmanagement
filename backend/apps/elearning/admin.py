from django.contrib import admin

from .models import Assignment, Lesson, Submission


admin.site.register((Lesson, Assignment, Submission))