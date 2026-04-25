from django.urls import path

from .views import DailyBriefView, DailyPlanView, NightReviewView

urlpatterns = [
    path("daily/", DailyPlanView.as_view(), name="daily-plan"),
    path("daily-brief/", DailyBriefView.as_view(), name="daily-brief"),
    path("night-review/", NightReviewView.as_view(), name="night-review"),
]
