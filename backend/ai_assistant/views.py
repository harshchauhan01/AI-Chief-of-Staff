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


def normalize_deadline(days_until_deadline):
	if days_until_deadline <= 0:
		return 5
	if days_until_deadline == 1:
		return 4
	if days_until_deadline <= 3:
		return 3
	if days_until_deadline <= 7:
		return 2
	return 1


def normalize_energy_fit(current_energy, required_energy):
	difference = abs(current_energy - required_energy)
	return max(1, 5 - difference)


class QuickDecisionView(APIView):
	permission_classes = [IsAuthenticated]

	def post(self, request):
		options = request.data.get("options", [])
		current_energy = request.data.get("current_energy", 3)

		if not isinstance(options, list) or len(options) < 2 or len(options) > 3:
			return Response({"detail": "options must include 2 or 3 choices."}, status=400)

		if not isinstance(current_energy, int) or current_energy < 1 or current_energy > 5:
			return Response({"detail": "current_energy must be an integer from 1 to 5."}, status=400)

		scored_options = []
		for index, option in enumerate(options):
			if not isinstance(option, dict):
				return Response({"detail": f"option at index {index} must be an object."}, status=400)

			label = option.get("label", "")
			importance = option.get("importance", 3)
			days_until_deadline = option.get("days_until_deadline", 7)
			required_energy = option.get("required_energy", 3)

			if not isinstance(label, str) or not label.strip():
				return Response({"detail": f"option at index {index} requires a non-empty label."}, status=400)
			if not isinstance(importance, int) or importance < 1 or importance > 5:
				return Response({"detail": f"importance for option {index + 1} must be an integer from 1 to 5."}, status=400)
			if not isinstance(days_until_deadline, int):
				return Response({"detail": f"days_until_deadline for option {index + 1} must be an integer."}, status=400)
			if not isinstance(required_energy, int) or required_energy < 1 or required_energy > 5:
				return Response({"detail": f"required_energy for option {index + 1} must be an integer from 1 to 5."}, status=400)

			deadline_score = normalize_deadline(days_until_deadline)
			energy_fit_score = normalize_energy_fit(current_energy, required_energy)
			weighted_score = round((deadline_score * 0.4) + (importance * 0.4) + (energy_fit_score * 0.2), 2)

			scored_options.append(
				{
					"label": label.strip(),
					"days_until_deadline": days_until_deadline,
					"importance": importance,
					"required_energy": required_energy,
					"score_breakdown": {
						"deadline": deadline_score,
						"importance": importance,
						"energy_fit": energy_fit_score,
					},
					"weighted_score": weighted_score,
				}
			)

		ranked_options = sorted(scored_options, key=lambda item: item["weighted_score"], reverse=True)
		best_choice = ranked_options[0]

		return Response(
			{
				"best_choice": best_choice,
				"ranked_options": ranked_options,
				"weights": {
					"deadline": 0.4,
					"importance": 0.4,
					"energy_fit": 0.2,
				},
			}
		)

# Create your views here.
