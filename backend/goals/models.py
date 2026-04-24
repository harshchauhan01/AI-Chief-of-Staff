from django.conf import settings
from django.db import models


class Goal(models.Model):
	STATUS_CHOICES = [
		("active", "Active"),
		("completed", "Completed"),
		("on_hold", "On Hold"),
	]

	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goals")
	title = models.CharField(max_length=255)
	description = models.TextField(blank=True)
	target_date = models.DateField(null=True, blank=True)
	priority = models.PositiveSmallIntegerField(default=3)
	status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-priority", "target_date", "-created_at"]

	def __str__(self):
		return self.title

# Create your models here.
