from django.contrib import admin

from .models import Goal


@admin.register(Goal)
class GoalAdmin(admin.ModelAdmin):
	list_display = ("title", "user", "priority", "status", "target_date")
	list_filter = ("status", "priority")

# Register your models here.
