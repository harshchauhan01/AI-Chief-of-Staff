from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class QuickDecisionApiTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="assistant-user", password="pass12345")
		self.client.force_authenticate(user=self.user)

	def test_quick_decision_returns_best_choice_and_ranked_options(self):
		payload = {
			"current_energy": 3,
			"options": [
				{
					"label": "Finish investor update",
					"days_until_deadline": 1,
					"importance": 5,
					"required_energy": 3,
				},
				{
					"label": "Refactor dashboard widgets",
					"days_until_deadline": 7,
					"importance": 4,
					"required_energy": 4,
				},
			],
		}

		response = self.client.post(reverse("quick-decision"), payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("best_choice", response.data)
		self.assertIn("ranked_options", response.data)
		self.assertEqual(response.data["best_choice"]["label"], "Finish investor update")
		self.assertEqual(len(response.data["ranked_options"]), 2)

	def test_quick_decision_requires_two_or_three_options(self):
		payload = {
			"current_energy": 3,
			"options": [
				{
					"label": "Only option",
					"days_until_deadline": 2,
					"importance": 4,
					"required_energy": 3,
				}
			],
		}

		response = self.client.post(reverse("quick-decision"), payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data["detail"], "options must include 2 or 3 choices.")
