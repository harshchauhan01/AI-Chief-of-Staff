from django.conf import settings
from django.db import models


class DailyInsight(models.Model):
	"""Pattern insights computed daily for user's dashboard"""
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_insights")
	day = models.DateField(db_index=True)
	
	# Completion stats
	tasks_completed = models.PositiveIntegerField(default=0)
	tasks_total = models.PositiveIntegerField(default=0)
	completion_rate = models.FloatField(default=0.0, help_text="Percentage 0-100")
	
	# Energy and patterns
	avg_energy = models.PositiveSmallIntegerField(null=True, blank=True)
	routine_completion_rate = models.FloatField(default=0.0)
	
	# Streaks
	longest_streak_days = models.PositiveIntegerField(default=0)
	current_streak_days = models.PositiveIntegerField(default=0)
	
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-day"]
		constraints = [
			models.UniqueConstraint(fields=["user", "day"], name="unique_user_daily_insight"),
		]
		indexes = [
			models.Index(fields=["user", "day"]),
		]

	def __str__(self):
		return f"Insights: {self.user_id} on {self.day}"


class PatternInsight(models.Model):
	"""Aggregated patterns - identify when user is most productive"""
	DAY_OF_WEEK_CHOICES = [
		(0, "Monday"),
		(1, "Tuesday"),
		(2, "Wednesday"),
		(3, "Thursday"),
		(4, "Friday"),
		(5, "Saturday"),
		(6, "Sunday"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pattern_insights")
	
	# Day of week patterns
	day_of_week = models.PositiveSmallIntegerField(choices=DAY_OF_WEEK_CHOICES)
	avg_completion_rate = models.FloatField(default=0.0)
	total_tasks_completed = models.PositiveIntegerField(default=0)
	sample_days = models.PositiveIntegerField(default=0)
	
	# Insights text
	insight_text = models.CharField(max_length=500, blank=True)
	is_positive_pattern = models.BooleanField(default=True)
	
	computed_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-avg_completion_rate"]
		constraints = [
			models.UniqueConstraint(fields=["user", "day_of_week"], name="unique_user_pattern_day"),
		]
		indexes = [
			models.Index(fields=["user", "day_of_week"]),
		]

	def __str__(self):
		return f"Pattern: {self.user_id} on {self.get_day_of_week_display()}"


class UserInsightsSummary(models.Model):
	"""Weekly/Monthly summary of insights for dashboard"""
	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="insights_summary")
	
	# Overall stats (last 30 days)
	overall_completion_rate = models.FloatField(default=0.0)
	best_day = models.CharField(max_length=20, blank=True, help_text="Day of week with highest completion")
	worst_day = models.CharField(max_length=20, blank=True)
	avg_daily_tasks = models.FloatField(default=0.0)
	
	# Recommended actions
	top_productivity_insight = models.TextField(blank=True)
	recommendations = models.JSONField(default=list, blank=True)
	
	computed_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name_plural = "User Insights Summaries"

	def __str__(self):
		return f"Summary: {self.user_id}"
