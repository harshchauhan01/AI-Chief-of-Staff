from django.contrib import admin

from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
	list_display = ("title", "user", "status", "due_date", "impact_score", "urgency_score")
	list_filter = ("status",)

# Register your models here.
