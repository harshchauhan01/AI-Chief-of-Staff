from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DailyInsightViewSet, PatternInsightViewSet, UserInsightsSummaryViewSet, InsightsAPIView

router = DefaultRouter()
router.register(r"daily", DailyInsightViewSet, basename="daily-insight")
router.register(r"patterns", PatternInsightViewSet, basename="pattern-insight")
router.register(r"summary", UserInsightsSummaryViewSet, basename="insights-summary")
router.register(r"", InsightsAPIView, basename="insights")

urlpatterns = router.urls
