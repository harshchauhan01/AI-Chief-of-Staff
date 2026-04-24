from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class CoachingSuggestionView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		prompt = request.data.get("prompt", "")
		return Response(
			{
				"prompt": prompt,
				"advice": "Prioritize one strategic task, one execution task, and one quick win today.",
				"reasoning": "This balance keeps momentum while protecting long-term outcomes.",
			}
		)

# Create your views here.
