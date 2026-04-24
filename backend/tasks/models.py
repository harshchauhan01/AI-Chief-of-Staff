from django.conf import settings
from django.db import models


class Task(models.Model):
	STATUS_CHOICES = [
		("todo", "To Do"),
		("in_progress", "In Progress"),
		("done", "Done"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tasks")
	goal = models.ForeignKey("goals.Goal", null=True, blank=True, on_delete=models.SET_NULL, related_name="tasks")
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	due_date = models.DateField(null=True, blank=True)
	estimated_minutes = models.PositiveIntegerField(null=True, blank=True)
	impact_score = models.PositiveSmallIntegerField(default=3)
	urgency_score = models.PositiveSmallIntegerField(default=3)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="todo")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["due_date", "-urgency_score", "-impact_score", "-created_at"]

	def __str__(self):
		return self.title


class RoutineTask(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="routine_tasks")
	title = models.CharField(max_length=160)
	routine_time = models.TimeField(null=True, blank=True)
	order = models.PositiveIntegerField(default=0, db_index=True)
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["order", "created_at"]

	def __str__(self):
		return self.title


class RoutineCheck(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="routine_checks")
	routine_task = models.ForeignKey(RoutineTask, on_delete=models.CASCADE, related_name="checks")
	day = models.DateField()
	done = models.BooleanField(default=False)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-day", "routine_task_id"]
		constraints = [
			models.UniqueConstraint(fields=["routine_task", "day"], name="unique_routine_task_day"),
		]
		indexes = [
			models.Index(fields=["user", "day"]),
		]

	def __str__(self):
		return f"{self.routine_task_id}:{self.day}:{self.done}"

# Create your models here.
