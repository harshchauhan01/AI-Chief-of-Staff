from django.urls import path

from .views import CoachingSuggestionView

urlpatterns = [
    path("coach/", CoachingSuggestionView.as_view(), name="coach-suggestion"),
]
