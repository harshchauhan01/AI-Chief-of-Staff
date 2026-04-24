from datetime import date, timedelta

from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import RoutineCheck, RoutineTask, Task
from .serializers import RoutineCheckSerializer, RoutineTaskSerializer, TaskSerializer


class TaskViewSet(viewsets.ModelViewSet):
	serializer_class = TaskSerializer

	def get_queryset(self):
		queryset = Task.objects.filter(user=self.request.user)
		status_filter = self.request.query_params.get("status")
		if status_filter:
			queryset = queryset.filter(status=status_filter)
		return queryset

	def perform_create(self, serializer):
		serializer.save(user=self.request.user)


class RoutineTaskViewSet(viewsets.ModelViewSet):
	serializer_class = RoutineTaskSerializer

	def get_queryset(self):
		return RoutineTask.objects.filter(user=self.request.user).order_by("order", "created_at")

	def perform_create(self, serializer):
		next_order = (
			RoutineTask.objects.filter(user=self.request.user).aggregate(max_order=models.Max("order")).get("max_order")
			or 0
		)
		serializer.save(user=self.request.user, order=next_order + 1)

	def _current_streak(self, routine_task):
		days = list(
			routine_task.checks.filter(done=True)
			.order_by("-day")
			.values_list("day", flat=True)
		)
		if not days:
			return 0

		streak = 0
		cursor = days[0]
		for day in days:
			if day == cursor:
				streak += 1
				cursor = cursor.fromordinal(cursor.toordinal() - 1)
			elif day < cursor:
				break
		return streak

	@action(detail=True, methods=["post"], url_path="move")
	def move(self, request, pk=None):
		routine_task = self.get_object()
		direction = request.data.get("direction")
		if direction not in {"up", "down"}:
			return Response({"detail": "direction must be up or down."}, status=status.HTTP_400_BAD_REQUEST)

		ordered_tasks = list(self.get_queryset())
		index = next((i for i, item in enumerate(ordered_tasks) if item.id == routine_task.id), None)
		if index is None:
			return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

		neighbor_index = index - 1 if direction == "up" else index + 1
		if neighbor_index < 0 or neighbor_index >= len(ordered_tasks):
			return Response(RoutineTaskSerializer(routine_task).data)

		neighbor = ordered_tasks[neighbor_index]
		routine_task.order, neighbor.order = neighbor.order, routine_task.order
		routine_task.save(update_fields=["order", "updated_at"])
		neighbor.save(update_fields=["order", "updated_at"])

		return Response(RoutineTaskSerializer(routine_task).data)

	@action(detail=False, methods=["get"], url_path="matrix")
	def matrix(self, request):
		start_text = request.query_params.get("start")
		try:
			days_count = int(request.query_params.get("days", "14"))
		except ValueError:
			return Response({"detail": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
		days_count = min(max(days_count, 7), 31)

		if start_text:
			try:
				start_day = date.fromisoformat(start_text)
			except ValueError:
				return Response({"detail": "start must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
		else:
			today = date.today()
			start_day = today - timedelta(days=today.weekday())

		days = [start_day + timedelta(days=index) for index in range(days_count)]
		end_day = days[-1]
		tasks = list(self.get_queryset().filter(is_active=True))
		task_ids = [item.id for item in tasks]

		checks = RoutineCheck.objects.filter(
			user=request.user,
			routine_task_id__in=task_ids,
			day__gte=start_day,
			day__lte=end_day,
		)

		check_map = {}
		for item in checks:
			check_map[(item.routine_task_id, item.day.isoformat())] = item.done

		task_rows = []
		for task in tasks:
			row = {
				"id": task.id,
				"title": task.title,
				"routine_time": task.routine_time.isoformat() if task.routine_time else None,
				"order": task.order,
				"current_streak": self._current_streak(task),
				"checks": {},
			}
			for day in days:
				iso_day = day.isoformat()
				row["checks"][iso_day] = bool(check_map.get((task.id, iso_day), False))
			task_rows.append(row)

		return Response(
			{
				"start": start_day.isoformat(),
				"end": end_day.isoformat(),
				"days": [item.isoformat() for item in days],
				"tasks": task_rows,
			}
		)

	@action(detail=False, methods=["get"], url_path="progress")
	def progress(self, request):
		try:
			days_count = int(request.query_params.get("days", "30"))
		except ValueError:
			return Response({"detail": "days must be an integer."}, status=status.HTTP_400_BAD_REQUEST)

		days_count = min(max(days_count, 7), 180)
		end_day = date.today()
		start_day = end_day - timedelta(days=days_count - 1)
		days = [start_day + timedelta(days=index) for index in range(days_count)]

		tasks = list(self.get_queryset().filter(is_active=True))
		task_ids = [item.id for item in tasks]
		checks = RoutineCheck.objects.filter(
			user=request.user,
			routine_task_id__in=task_ids,
			day__gte=start_day,
			day__lte=end_day,
		)

		check_map = {}
		for item in checks:
			check_map[(item.routine_task_id, item.day.isoformat())] = item.done

		total_tasks = len(tasks)
		daily = []
		for day in days:
			iso_day = day.isoformat()
			done_count = sum(1 for task in tasks if check_map.get((task.id, iso_day), False))
			rate = round((done_count / total_tasks) * 100, 2) if total_tasks > 0 else 0
			daily.append({"day": iso_day, "done": done_count, "total": total_tasks, "rate": rate})

		task_stats = []
		for task in tasks:
			done_days = sum(1 for day in days if check_map.get((task.id, day.isoformat()), False))
			rate = round((done_days / days_count) * 100, 2)
			task_stats.append(
				{
					"id": task.id,
					"title": task.title,
					"done_days": done_days,
					"total_days": days_count,
					"completion_rate": rate,
					"current_streak": self._current_streak(task),
				}
			)

		overall_rate = round((sum(item["rate"] for item in daily) / days_count), 2) if days_count > 0 else 0
		best_day = max(daily, key=lambda item: item["rate"], default=None)

		return Response(
			{
				"start": start_day.isoformat(),
				"end": end_day.isoformat(),
				"days": days_count,
				"overall_rate": overall_rate,
				"best_day": best_day,
				"daily": daily,
				"tasks": sorted(task_stats, key=lambda item: item["completion_rate"], reverse=True),
			}
		)

	@action(detail=True, methods=["post"], url_path="check")
	def check(self, request, pk=None):
		routine_task = self.get_object()
		day_text = request.data.get("day")

		if not day_text:
			return Response({"detail": "day is required."}, status=status.HTTP_400_BAD_REQUEST)

		try:
			day_value = date.fromisoformat(day_text)
		except ValueError:
			return Response({"detail": "day must be YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
		check_obj, _created = RoutineCheck.objects.get_or_create(
			user=request.user,
			routine_task=routine_task,
			day=day_value,
			defaults={"done": False},
		)

		if "done" in request.data:
			raw_done = request.data.get("done")
			if isinstance(raw_done, bool):
				check_obj.done = raw_done
			elif isinstance(raw_done, str):
				check_obj.done = raw_done.strip().lower() in {"true", "1", "yes", "y", "on"}
			else:
				check_obj.done = bool(raw_done)
		else:
			check_obj.done = not check_obj.done
		check_obj.save(update_fields=["done", "updated_at"])

		return Response(RoutineCheckSerializer(check_obj).data)

# Create your views here.
