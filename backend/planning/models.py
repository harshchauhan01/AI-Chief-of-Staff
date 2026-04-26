from django.db import models


class NightReview(models.Model):
	user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="night_reviews")
	day = models.DateField(db_index=True)
	wins = models.TextField(blank=True)
	energy = models.PositiveSmallIntegerField(default=3)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-day", "-updated_at"]
		constraints = [
			models.UniqueConstraint(fields=["user", "day"], name="unique_user_night_review_day"),
		]

	def __str__(self):
		return f"{self.user_id}:{self.day}"


class NightReviewItem(models.Model):
	OUTCOME_DONE = "done"
	OUTCOME_SLIPPED = "slipped"
	OUTCOME_CHOICES = [
		(OUTCOME_DONE, "Done"),
		(OUTCOME_SLIPPED, "Slipped"),
	]

	review = models.ForeignKey(NightReview, on_delete=models.CASCADE, related_name="items")
	task = models.ForeignKey("tasks.Task", on_delete=models.CASCADE, related_name="night_review_items")
	outcome = models.CharField(max_length=16, choices=OUTCOME_CHOICES)
	reason = models.CharField(max_length=280, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["task_id"]
		constraints = [
			models.UniqueConstraint(fields=["review", "task"], name="unique_night_review_item_task"),
		]

	def __str__(self):
		return f"{self.review_id}:{self.task_id}:{self.outcome}"


class InboxItem(models.Model):
	"""Quick Capture - Fast inbox for ideas, notes, and random thoughts with auto-tagging"""
	user = models.ForeignKey("auth.User", on_delete=models.CASCADE, related_name="inbox_items")
	content = models.TextField()
	tags = models.CharField(max_length=500, blank=True, help_text="Comma-separated tags")
	auto_tags = models.CharField(max_length=500, blank=True, help_text="Auto-detected tags based on content")
	is_archived = models.BooleanField(default=False)
	converted_to_task = models.ForeignKey("tasks.Task", null=True, blank=True, on_delete=models.SET_NULL, related_name="inbox_source")
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-created_at"]
		indexes = [
			models.Index(fields=["user", "is_archived"]),
		]

	def __str__(self):
		return f"Inbox ({self.user_id}): {self.content[:50]}"
