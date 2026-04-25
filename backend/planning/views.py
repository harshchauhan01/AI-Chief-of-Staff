from datetime import date

from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import NightReview, NightReviewItem
from .serializers import NightReviewSerializer
from tasks.models import RoutineCheck, RoutineTask, Task
from tasks.serializers import TaskSerializer


MEETING_KEYWORDS = ("meeting", "call", "sync", "standup", "1:1", "demo")


def score_task(task):
	return (task.urgency_score * 0.45) + (task.impact_score * 0.45) + (0.10 * (1 / max(task.estimated_minutes or 30, 1)) * 300)


def score_routine_task(routine_task):
	time_urgency = 1.0
	if routine_task.routine_time:
		if routine_task.routine_time.hour < 11:
			time_urgency = 1.35
		elif routine_task.routine_time.hour < 16:
			time_urgency = 1.15

	return round(2.8 + time_urgency, 2)


def serialize_routine_priority(routine_task, priority_score):
	estimated_minutes = 20
	return {
		"id": f"routine-{routine_task.id}",
		"title": routine_task.title,
		"description": "Routine tracker item",
		"due_date": None,
		"estimated_minutes": estimated_minutes,
		"impact_score": 3,
		"urgency_score": 3,
		"priority_score": priority_score,
		"status": "todo",
		"source": "routine",
	}


def build_morning_brief(user, brief_day):
	pending_tasks = Task.objects.filter(user=user).exclude(status="done")
	task_ranked = sorted(pending_tasks, key=score_task, reverse=True)

	active_routines = list(
		RoutineTask.objects.filter(user=user, is_active=True).order_by("routine_time", "order", "created_at")
	)
	routine_done_ids = set(
		RoutineCheck.objects.filter(
			user=user,
			day=brief_day,
			done=True,
			routine_task_id__in=[item.id for item in active_routines],
		).values_list("routine_task_id", flat=True)
	)
	pending_routines = [item for item in active_routines if item.id not in routine_done_ids]

	ranked_candidates = []
	for task in task_ranked:
		ranked_candidates.append(
			{
				"priority_score": score_task(task),
				"payload": task,
				"source": "task",
			}
		)

	for routine_task in pending_routines:
		ranked_candidates.append(
			{
				"priority_score": score_routine_task(routine_task),
				"payload": routine_task,
				"source": "routine",
			}
		)

	ranked_candidates.sort(key=lambda item: item["priority_score"], reverse=True)
	top_three_ranked = ranked_candidates[:3]

	task_ids_in_top_three = [item["payload"].id for item in top_three_ranked if item["source"] == "task"]
	top_task_map = {
		item["id"]: item
		for item in TaskSerializer(Task.objects.filter(id__in=task_ids_in_top_three), many=True).data
	}

	top_three = []
	for item in top_three_ranked:
		if item["source"] == "task":
			task_data = dict(top_task_map.get(item["payload"].id, {}))
			task_data["source"] = "task"
			top_three.append(task_data)
		else:
			top_three.append(serialize_routine_priority(item["payload"], item["priority_score"]))

	meeting_filter = Q()
	for keyword in MEETING_KEYWORDS:
		meeting_filter |= Q(title__icontains=keyword) | Q(description__icontains=keyword)

	meetings = list(
		Task.objects.filter(user=user, due_date=brief_day)
		.filter(meeting_filter)
		.order_by("due_date", "-urgency_score")[:5]
	)

	planned_minutes = sum((task.get("estimated_minutes") or 45) for task in top_three)
	overdue_count = pending_tasks.filter(due_date__lt=brief_day).count()
	due_today_count = pending_tasks.filter(due_date=brief_day).count()
	routine_pending_count = len(pending_routines)

	risks = []
	if planned_minutes > 360:
		risks.append("Too much planned today. Your top priorities exceed 6 hours.")
	if overdue_count >= 3:
		risks.append("Backlog risk is high. You have 3 or more overdue tasks.")
	if due_today_count >= 6:
		risks.append("Calendar pressure is building. Consider reducing scope for today.")
	if routine_pending_count >= 6:
		risks.append("Routine load is heavy. Batch your recurring habits into fixed blocks.")
	if not risks:
		risks.append("Plan looks balanced. Protect focus blocks and execute in order.")

	load_percent = min(100, round((planned_minutes / 420) * 100)) if planned_minutes else 0
	if load_percent < 45:
		load_tone = "light"
	elif load_percent < 75:
		load_tone = "balanced"
	else:
		load_tone = "heavy"

	return {
		"day": brief_day.isoformat(),
		"summary": "Start with the highest priority task, then clear key routines before context switches.",
		"top_priorities": top_three,
		"meetings": TaskSerializer(meetings, many=True).data,
		"risks": risks,
		"capacity": {
			"planned_minutes": planned_minutes,
			"focus_capacity_minutes": 420,
			"load_percent": load_percent,
			"load_tone": load_tone,
			"pending_routines": routine_pending_count,
		},
	}


class DailyPlanView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		brief = build_morning_brief(request.user, date.today())
		return Response(
			{
				"summary": brief["summary"],
				"top_tasks": brief["top_priorities"],
			}
		)


class DailyBriefView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		day_text = request.query_params.get("day")
		if day_text:
			try:
				brief_day = date.fromisoformat(day_text)
			except ValueError:
				return Response({"detail": "day must be YYYY-MM-DD."}, status=400)
		else:
			brief_day = date.today()

		return Response(build_morning_brief(request.user, brief_day))


class NightReviewView(APIView):
	permission_classes = [IsAuthenticated]

	def get_day(self, request):
		day_text = request.query_params.get("day")
		if not day_text:
			return date.today(), None
		try:
			return date.fromisoformat(day_text), None
		except ValueError:
			return None, Response({"detail": "day must be YYYY-MM-DD."}, status=400)

	def get(self, request):
		review_day, error = self.get_day(request)
		if error is not None:
			return error

		done_task_candidates = list(Task.objects.filter(
			user=request.user,
			status="done",
			updated_at__date=review_day,
		).order_by("-updated_at")[:10])

		done_routine_checks = list(
			RoutineCheck.objects.filter(
				user=request.user,
				day=review_day,
				done=True,
				routine_task__is_active=True,
			)
			.select_related("routine_task")
			.order_by("-updated_at")[:10]
		)

		done_candidates = []
		for task in done_task_candidates:
			serialized = TaskSerializer(task).data
			serialized["source"] = "task"
			done_candidates.append(serialized)

		for check in done_routine_checks:
			done_candidates.append(
				{
					"id": f"routine-{check.routine_task_id}",
					"title": check.routine_task.title,
					"status": "done",
					"source": "routine",
					"day": review_day.isoformat(),
				}
			)
		slipped_candidates = Task.objects.filter(
			user=request.user,
			due_date__lte=review_day,
		).exclude(status="done").order_by("due_date", "-urgency_score")[:10]

		review = NightReview.objects.filter(user=request.user, day=review_day).prefetch_related("items__task").first()
		review_payload = NightReviewSerializer(review).data if review else {
			"day": review_day.isoformat(),
			"wins": "",
			"energy": 3,
			"items": [],
			"updated_at": None,
		}

		return Response(
			{
				"day": review_day.isoformat(),
				"done_candidates": done_candidates,
				"slipped_candidates": TaskSerializer(slipped_candidates, many=True).data,
				"review": review_payload,
			}
		)

	def post(self, request):
		review_day, error = self.get_day(request)
		if error is not None:
			return error

		energy = request.data.get("energy", 3)
		wins = request.data.get("wins", "")
		entries = request.data.get("items", [])

		if not isinstance(entries, list):
			return Response({"detail": "items must be a list."}, status=400)
		if not isinstance(energy, int) or energy < 1 or energy > 5:
			return Response({"detail": "energy must be an integer from 1 to 5."}, status=400)

		review, _created = NightReview.objects.update_or_create(
			user=request.user,
			day=review_day,
			defaults={"wins": str(wins)[:1500], "energy": energy},
		)

		NightReviewItem.objects.filter(review=review).delete()
		if entries:
			task_ids = []
			for item in entries:
				if not isinstance(item, dict):
					return Response({"detail": "Each item must be an object."}, status=400)
				task_id = item.get("task")
				outcome = item.get("outcome")
				reason = str(item.get("reason", ""))[:280]
				if not task_id:
					return Response({"detail": "Each item must include task."}, status=400)
				if outcome not in {NightReviewItem.OUTCOME_DONE, NightReviewItem.OUTCOME_SLIPPED}:
					return Response({"detail": "Invalid outcome value."}, status=400)
				task_ids.append(int(task_id))

			tasks_by_id = {
				task.id: task
				for task in Task.objects.filter(user=request.user, id__in=task_ids)
			}
			new_items = []
			for item in entries:
				task_id = int(item.get("task"))
				task = tasks_by_id.get(task_id)
				if task is None:
					return Response({"detail": f"Task {task_id} was not found."}, status=400)
				new_items.append(
					NightReviewItem(
						review=review,
						task=task,
						outcome=item.get("outcome"),
						reason=str(item.get("reason", ""))[:280],
					)
				)
			NightReviewItem.objects.bulk_create(new_items)

		review = NightReview.objects.filter(id=review.id).prefetch_related("items__task").first()
		return Response({"saved": True, "review": NightReviewSerializer(review).data})

# Create your views here.
