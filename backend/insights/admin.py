from django.contrib import admin
from .models import DailyInsight, PatternInsight, UserInsightsSummary


@admin.register(DailyInsight)
class DailyInsightAdmin(admin.ModelAdmin):
	list_display = ('user', 'day', 'completion_rate', 'tasks_completed', 'created_at')
	list_filter = ('day', 'user')
	search_fields = ('user__username',)


@admin.register(PatternInsight)
class PatternInsightAdmin(admin.ModelAdmin):
	list_display = ('user', 'day_of_week', 'avg_completion_rate', 'total_tasks_completed')
	list_filter = ('day_of_week', 'is_positive_pattern')
	search_fields = ('user__username',)


@admin.register(UserInsightsSummary)
class UserInsightsSummaryAdmin(admin.ModelAdmin):
	list_display = ('user', 'overall_completion_rate', 'best_day', 'worst_day')
	search_fields = ('user__username',)
