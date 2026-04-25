from rest_framework import serializers

from .models import NightReview, NightReviewItem


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
