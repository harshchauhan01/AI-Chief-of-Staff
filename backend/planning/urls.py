from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import DailyBriefView, DailyPlanView, NightReviewView, InboxViewSet

router = DefaultRouter()
router.register(r"inbox", InboxViewSet, basename="inbox")

urlpatterns = [
    path("daily/", DailyPlanView.as_view(), name="daily-plan"),
    path("daily-brief/", DailyBriefView.as_view(), name="daily-brief"),
    path("night-review/", NightReviewView.as_view(), name="night-review"),
] + router.urls
