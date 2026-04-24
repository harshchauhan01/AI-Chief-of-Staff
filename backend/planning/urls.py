from django.urls import path

from .views import DailyPlanView

urlpatterns = [
    path("daily/", DailyPlanView.as_view(), name="daily-plan"),
]
