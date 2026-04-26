from rest_framework import serializers
from .models import DailyInsight, PatternInsight, UserInsightsSummary


class DailyInsightSerializer(serializers.ModelSerializer):
	class Meta:
		model = DailyInsight
		fields = [
			"id",
			"day",
			"tasks_completed",
			"tasks_total",
			"completion_rate",
			"avg_energy",
			"routine_completion_rate",
			"longest_streak_days",
			"current_streak_days",
			"updated_at",
		]
		read_only_fields = ["id", "updated_at"]


class PatternInsightSerializer(serializers.ModelSerializer):
	day_of_week_display = serializers.CharField(source="get_day_of_week_display", read_only=True)

	class Meta:
		model = PatternInsight
		fields = [
			"id",
			"day_of_week",
			"day_of_week_display",
			"avg_completion_rate",
			"total_tasks_completed",
			"sample_days",
			"insight_text",
			"is_positive_pattern",
			"updated_at",
		]
		read_only_fields = ["id", "updated_at"]


class UserInsightsSummarySerializer(serializers.ModelSerializer):
	class Meta:
		model = UserInsightsSummary
		fields = [
			"overall_completion_rate",
			"best_day",
			"worst_day",
			"avg_daily_tasks",
			"top_productivity_insight",
			"recommendations",
			"updated_at",
		]
		read_only_fields = ["updated_at"]
