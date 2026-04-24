from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import RoutineTaskViewSet, TaskViewSet

router = DefaultRouter()
router.register(r"", TaskViewSet, basename="task")

routine_list = RoutineTaskViewSet.as_view({"get": "list", "post": "create"})
routine_detail = RoutineTaskViewSet.as_view({"delete": "destroy"})
routine_move = RoutineTaskViewSet.as_view({"post": "move"})
routine_matrix = RoutineTaskViewSet.as_view({"get": "matrix"})
routine_progress = RoutineTaskViewSet.as_view({"get": "progress"})
routine_check = RoutineTaskViewSet.as_view({"post": "check"})

urlpatterns = [
	path("routines/", routine_list, name="routine-list"),
	path("routines/matrix/", routine_matrix, name="routine-matrix"),
	path("routines/progress/", routine_progress, name="routine-progress"),
	path("routines/<int:pk>/", routine_detail, name="routine-detail"),
	path("routines/<int:pk>/move/", routine_move, name="routine-move"),
	path("routines/<int:pk>/check/", routine_check, name="routine-check"),
] + router.urls
