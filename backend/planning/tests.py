from datetime import date

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tasks.models import RoutineCheck, RoutineTask, Task


class PlanningApiTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="planner", password="pass12345")
		self.client.force_authenticate(user=self.user)

		Task.objects.create(
			user=self.user,
			title="Prepare client meeting notes",
			due_date=date.today(),
			estimated_minutes=90,
			impact_score=5,
			urgency_score=4,
			status="todo",
		)
		Task.objects.create(
			user=self.user,
			title="Ship onboarding updates",
			due_date=date.today(),
			estimated_minutes=180,
			impact_score=5,
			urgency_score=5,
			status="in_progress",
		)
		Task.objects.create(
			user=self.user,
			title="Archive old docs",
			due_date=date.today(),
			estimated_minutes=30,
			impact_score=2,
			urgency_score=2,
			status="done",
		)

		self.morning_routine = RoutineTask.objects.create(
			user=self.user,
			title="Morning planning ritual",
			is_active=True,
		)
		completed_routine = RoutineTask.objects.create(
			user=self.user,
			title="Hydration check-in",
			is_active=True,
		)
		RoutineCheck.objects.create(
			user=self.user,
			routine_task=completed_routine,
			day=date.today(),
			done=True,
		)

	def test_daily_brief_returns_priorities_meetings_and_risks(self):
		response = self.client.get(reverse("daily-brief"))

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("top_priorities", response.data)
		self.assertIn("meetings", response.data)
		self.assertIn("risks", response.data)
		self.assertIn("capacity", response.data)

		sources = {item.get("source") for item in response.data["top_priorities"]}
		self.assertIn("task", sources)
		self.assertIn("routine", sources)
		self.assertIn("pending_routines", response.data["capacity"])

	def test_night_review_can_save_and_reload_feedback(self):
		done_task = Task.objects.filter(user=self.user, status="done").first()
		slipped_task = Task.objects.filter(user=self.user, status="todo").first()

		payload = {
			"day": date.today().isoformat(),
			"wins": "Closed key blockers early.",
			"energy": 4,
			"items": [
				{"task": done_task.id, "outcome": "done", "reason": "Finished in focus block"},
				{"task": slipped_task.id, "outcome": "slipped", "reason": "Unexpected interruptions"},
			],
		}
		save_response = self.client.post(reverse("night-review"), payload, format="json")
		self.assertEqual(save_response.status_code, status.HTTP_200_OK)
		self.assertTrue(save_response.data.get("saved"))

		load_response = self.client.get(reverse("night-review"), {"day": payload["day"]})
		self.assertEqual(load_response.status_code, status.HTTP_200_OK)
		self.assertEqual(load_response.data["review"]["wins"], payload["wins"])
		self.assertEqual(len(load_response.data["review"]["items"]), 2)

	def test_night_review_done_candidates_include_routine_items(self):
		response = self.client.get(reverse("night-review"), {"day": date.today().isoformat()})

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		sources = {item.get("source") for item in response.data["done_candidates"]}
		self.assertIn("task", sources)
		self.assertIn("routine", sources)
