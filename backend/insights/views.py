from datetime import date, timedelta
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count, F, ExpressionWrapper, FloatField
from django.utils import timezone

from .models import DailyInsight, PatternInsight, UserInsightsSummary
from .serializers import DailyInsightSerializer, PatternInsightSerializer, UserInsightsSummarySerializer
from tasks.models import Task, RoutineCheck
from planning.models import NightReview


class DailyInsightViewSet(viewsets.ReadOnlyModelViewSet):
	"""Daily insights about task completion patterns"""
	serializer_class = DailyInsightSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		queryset = DailyInsight.objects.filter(user=self.request.user)
		start_date = self.request.query_params.get("start_date")
		end_date = self.request.query_params.get("end_date")
		
		if start_date:
			try:
				queryset = queryset.filter(day__gte=date.fromisoformat(start_date))
			except ValueError:
				pass
		
		if end_date:
			try:
				queryset = queryset.filter(day__lte=date.fromisoformat(end_date))
			except ValueError:
				pass
		
		return queryset.order_by("-day")


class PatternInsightViewSet(viewsets.ReadOnlyModelViewSet):
	"""Pattern insights - identify productivity patterns by day of week"""
	serializer_class = PatternInsightSerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return PatternInsight.objects.filter(user=self.request.user).order_by("-avg_completion_rate")


class UserInsightsSummaryViewSet(viewsets.ReadOnlyModelViewSet):
	"""User's aggregated insights summary"""
	serializer_class = UserInsightsSummarySerializer
	permission_classes = [IsAuthenticated]

	def get_queryset(self):
		return UserInsightsSummary.objects.filter(user=self.request.user)

	def list(self, request, *args, **kwargs):
		summary, created = UserInsightsSummary.objects.get_or_create(user=request.user)
		serializer = self.get_serializer(summary)
		return Response(serializer.data)


class InsightsAPIView(viewsets.ViewSet):
	"""Insights API - compute and retrieve analytics"""
	permission_classes = [IsAuthenticated]

	@action(detail=False, methods=["get"], url_path="dashboard")
	def dashboard(self, request):
		"""Get comprehensive dashboard insights"""
		today = date.today()
		last_30_days = today - timedelta(days=30)
		
		# Task completion stats
		completed_tasks = Task.objects.filter(
			user=request.user,
			status="done",
			updated_at__date__gte=last_30_days
		).count()
		
		total_tasks = Task.objects.filter(user=request.user).count()
		
		# Routine completion
		routine_checks = RoutineCheck.objects.filter(
			user=request.user,
			day__gte=last_30_days
		)
		routine_done = routine_checks.filter(done=True).count()
		routine_total = routine_checks.count()
		
		routine_rate = round((routine_done / routine_total * 100), 2) if routine_total > 0 else 0
		
		# Get best performing day
		pattern_insights = PatternInsight.objects.filter(user=request.user).order_by("-avg_completion_rate").first()
		best_day = pattern_insights.get_day_of_week_display() if pattern_insights else None
		best_day_rate = pattern_insights.avg_completion_rate if pattern_insights else 0
		
		# Energy trend (last 7 days)
		energy_trend = []
		for i in range(6, -1, -1):
			check_day = today - timedelta(days=i)
			night_review = NightReview.objects.filter(user=request.user, day=check_day).first()
			if night_review:
				energy_trend.append({
					"day": check_day.isoformat(),
					"energy": night_review.energy
				})
		
		# Streaks
		recent_daily_insights = DailyInsight.objects.filter(user=request.user).order_by("-day").first()
		current_streak = recent_daily_insights.current_streak_days if recent_daily_insights else 0
		longest_streak = recent_daily_insights.longest_streak_days if recent_daily_insights else 0
		
		return Response({
			"period": f"Last 30 days",
			"tasks_completed": completed_tasks,
			"total_tasks": total_tasks,
			"routine_completion_rate": routine_rate,
			"best_day": best_day,
			"best_day_rate": best_day_rate,
			"current_streak_days": current_streak,
			"longest_streak_days": longest_streak,
			"energy_trend": energy_trend,
			"overall_productivity_insight": self._get_insight_text(
				best_day, best_day_rate, routine_rate, current_streak
			)
		})

	def _get_insight_text(self, best_day, best_day_rate, routine_rate, streak):
		"""Generate human-readable insight text"""
		if not best_day:
			return "Keep building your productivity data to see patterns!"
		
		insights = []
		
		if best_day_rate > 75:
			insights.append(f"You're most productive on {best_day}s ({best_day_rate:.0f}% completion). Consider scheduling important tasks then.")
		
		if routine_rate > 80:
			insights.append(f"Excellent routine adherence at {routine_rate:.0f}%! Your consistency is building strong habits.")
		elif routine_rate > 50:
			insights.append(f"Your routine completion is {routine_rate:.0f}%. Try adding them to time blocks for better consistency.")
		
		if streak >= 7:
			insights.append(f"🔥 {streak}-day streak! You're building momentum—keep the consistency going.")
		elif streak >= 3:
			insights.append(f"You have a {streak}-day streak. Small wins compound into big changes.")
		
		return " ".join(insights) if insights else "Keep tracking your habits to unlock personalized insights!"

# Create your views here.
