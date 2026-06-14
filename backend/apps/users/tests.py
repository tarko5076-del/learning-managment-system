from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User


class AuthTests(APITestCase):
    def setUp(self):
        self.register_url = reverse("auth-register")
        self.login_url = reverse("auth-login")
        self.profile_url = reverse("auth-profile")

    def test_register_student(self):
        data = {
            "full_name": "John Doe",
            "email": "john@example.com",
            "password": "ComplexP@ssw0rd!",
            "password_confirmation": "ComplexP@ssw0rd!",
            "role": "student",
        }
        response = self.client.post(self.register_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "john@example.com")
        self.assertEqual(response.data["user"]["role"], "student")

    def test_login_success(self):
        user = User.objects.create_user(
            full_name="Jane Doe",
            email="jane@example.com",
            password="ComplexP@ssw0rd!",
            role="instructor",
        )
        data = {
            "email": "jane@example.com",
            "password": "ComplexP@ssw0rd!",
        }
        response = self.client.post(self.login_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertEqual(response.data["user"]["role"], "instructor")

    def test_get_profile_authenticated(self):
        user = User.objects.create_user(
            full_name="Alex Smith",
            email="alex@example.com",
            password="ComplexP@ssw0rd!",
            role="student",
        )
        # Obtain JWT Token
        data = {
            "email": "alex@example.com",
            "password": "ComplexP@ssw0rd!",
        }
        login_response = self.client.post(self.login_url, data, format="json")
        token = login_response.data["access"]

        # Request Profile
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Alex Smith")

    def test_get_profile_unauthenticated(self):
        response = self.client.get(self.profile_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
