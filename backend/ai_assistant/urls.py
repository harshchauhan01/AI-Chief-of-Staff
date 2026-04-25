from django.urls import path

from .views import CoachingSuggestionView, QuickDecisionView

urlpatterns = [
    path("coach/", CoachingSuggestionView.as_view(), name="coach-suggestion"),
    path("quick-decision/", QuickDecisionView.as_view(), name="quick-decision"),
]
