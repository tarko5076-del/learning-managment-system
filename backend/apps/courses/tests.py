from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User
from apps.courses.models import Category, Course, Lesson, Enrollment


class CourseAPITests(APITestCase):
    def setUp(self):
        # Create users
        self.instructor = User.objects.create_user(
            full_name="Instructor Alice",
            email="alice@example.com",
            password="ComplexP@ssw0rd!",
            role="instructor",
        )
        self.student = User.objects.create_user(
            full_name="Student Bob",
            email="bob@example.com",
            password="ComplexP@ssw0rd!",
            role="student",
        )

        # Create Category
        self.category = Category.objects.create(name="Programming")

        # URLs
        self.course_list_url = reverse("course-list")
        self.enrollment_list_url = reverse("enrollment-list")

        # Get Instructor Token
        login_url = reverse("auth-login")
        response = self.client.post(login_url, {"email": "alice@example.com", "password": "ComplexP@ssw0rd!"})
        self.instructor_token = response.data["access"]

        # Get Student Token
        response = self.client.post(login_url, {"email": "bob@example.com", "password": "ComplexP@ssw0rd!"})
        self.student_token = response.data["access"]

    def test_instructor_can_create_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.instructor_token}")
        data = {
            "title": "Introduction to Python",
            "description": "Learn python from scratch.",
            "category_id": self.category.id,
        }
        response = self.client.post(self.course_list_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Course.objects.count(), 1)
        self.assertEqual(Course.objects.first().instructor, self.instructor)

    def test_student_cannot_create_course(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.student_token}")
        data = {
            "title": "Hack the Planet",
            "description": "Ethical hacking course.",
            "category_id": self.category.id,
        }
        response = self.client.post(self.course_list_url, data, format="json")
        # Should be forbidden for non-instructors to write/create courses
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_can_enroll_in_course(self):
        # Create course first
        course = Course.objects.create(
            title="Django Basics",
            description="Intermediate course.",
            category=self.category,
            instructor=self.instructor,
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.student_token}")
        response = self.client.post(self.enrollment_list_url, {"course_id": course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Enrollment.objects.count(), 1)

    def test_prevent_duplicate_enrollment(self):
        course = Course.objects.create(
            title="Vite React",
            description="Frontend course.",
            category=self.category,
            instructor=self.instructor,
        )
        # First enrollment
        Enrollment.objects.create(student=self.student, course=course)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.student_token}")
        response = self.client.post(self.enrollment_list_url, {"course_id": course.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
