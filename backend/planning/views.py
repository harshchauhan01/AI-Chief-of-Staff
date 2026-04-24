from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tasks.models import Task
from tasks.serializers import TaskSerializer


class DailyPlanView(APIView):
	permission_classes = [IsAuthenticated]

	def get(self, request):
		pending_tasks = Task.objects.filter(user=request.user).exclude(status="done")
		ranked = sorted(
			pending_tasks,
			key=lambda t: ((t.urgency_score * 0.45) + (t.impact_score * 0.45) + (0.10 * (1 / max(t.estimated_minutes or 30, 1)) * 300)),
			reverse=True,
		)
		top_three = ranked[:3]
		return Response(
			{
				"summary": "Focus on the highest-impact and most urgent work first.",
				"top_tasks": TaskSerializer(top_three, many=True).data,
			}
		)

# Create your views here.
