from rest_framework import serializers

from .models import NightReview, NightReviewItem, InboxItem


class NightReviewItemSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source="task.title", read_only=True)

    class Meta:
        model = NightReviewItem
        fields = ["task", "task_title", "outcome", "reason"]


class NightReviewSerializer(serializers.ModelSerializer):
    items = NightReviewItemSerializer(many=True, read_only=True)

    class Meta:
        model = NightReview
        fields = ["day", "wins", "energy", "items", "updated_at"]


class InboxItemSerializer(serializers.ModelSerializer):
	class Meta:
		model = InboxItem
		fields = [
			"id",
			"content",
			"tags",
			"auto_tags",
			"is_archived",
			"converted_to_task",
			"created_at",
			"updated_at",
		]
		read_only_fields = ["id", "auto_tags", "created_at", "updated_at"]

