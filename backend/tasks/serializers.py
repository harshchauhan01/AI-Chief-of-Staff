from rest_framework import serializers

from .models import RoutineCheck, RoutineTask, Task


class TaskSerializer(serializers.ModelSerializer):
    priority_score = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "goal",
            "title",
            "description",
            "due_date",
            "estimated_minutes",
            "impact_score",
            "urgency_score",
            "priority_score",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "priority_score"]

    def get_priority_score(self, obj):
        effort_factor = 1 / max(obj.estimated_minutes or 30, 1)
        return round((obj.urgency_score * 0.45) + (obj.impact_score * 0.45) + (effort_factor * 300 * 0.10), 2)


class RoutineCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutineCheck
        fields = ["id", "routine_task", "day", "done", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class RoutineTaskSerializer(serializers.ModelSerializer):
    current_streak = serializers.SerializerMethodField()

    class Meta:
        model = RoutineTask
        fields = ["id", "title", "routine_time", "order", "is_active", "current_streak", "created_at", "updated_at"]
        read_only_fields = ["id", "order", "current_streak", "created_at", "updated_at"]

    def get_current_streak(self, obj):
        days = list(
            obj.checks.filter(done=True)
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
