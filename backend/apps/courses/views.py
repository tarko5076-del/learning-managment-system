from django.db.models import Count, Q
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User

from .models import Category, Course, Enrollment, Lesson
from .permissions import IsCourseInstructorOrReadOnly, IsInstructor, IsStudent
from .serializers import CategorySerializer, CourseSerializer, EnrollmentSerializer, LessonSerializer


class CategoryListCreateView(generics.ListCreateAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [permissions.IsAuthenticated(), IsInstructor()]
        return [permissions.IsAuthenticated()]


class CourseViewSet(viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        queryset = (
            Course.objects.select_related("category", "instructor")
            .annotate(
                lessons_total=Count("lessons", distinct=True),
                enrollments_total=Count("enrollments", distinct=True),
            )
            .all()
        )

        search = self.request.query_params.get("search") or self.request.query_params.get("q")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(category__name__icontains=search)
                | Q(instructor__full_name__icontains=search)
            )

        mine = self.request.query_params.get("mine")
        if mine in {"1", "true", "True"} and self.request.user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(instructor=self.request.user)

        return queryset

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsInstructor()]
        if self.action in {"update", "partial_update", "destroy"}:
            return [permissions.IsAuthenticated(), IsCourseInstructorOrReadOnly()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)


class LessonViewSet(viewsets.ModelViewSet):
    serializer_class = LessonSerializer

    def get_queryset(self):
        queryset = Lesson.objects.select_related("course", "course__category", "course__instructor")
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.role == User.Role.INSTRUCTOR:
            queryset = queryset.filter(course__instructor=user)
        elif user.role == User.Role.STUDENT:
            queryset = queryset.filter(course__enrollments__student=user)
        else:
            queryset = queryset.none()

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        return queryset.distinct()

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [permissions.IsAuthenticated(), IsInstructor()]
        return [permissions.IsAuthenticated()]

    def _assert_course_owner(self, course):
        if course.instructor_id != self.request.user.id:
            raise PermissionDenied("Only the course instructor can manage its lessons.")

    def perform_create(self, serializer):
        course = serializer.validated_data["course"]
        self._assert_course_owner(course)
        try:
            serializer.save()
        except Exception as exc:
            raise ValidationError("A lesson already exists for this course order.") from exc

    def perform_update(self, serializer):
        course = serializer.validated_data.get("course", serializer.instance.course)
        self._assert_course_owner(course)
        try:
            serializer.save()
        except Exception as exc:
            raise ValidationError("A lesson already exists for this course order.") from exc


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    http_method_names = ("get", "post", "delete", "head", "options")

    def get_queryset(self):
        user = self.request.user
        queryset = Enrollment.objects.select_related("student", "course", "course__category", "course__instructor")

        if not user.is_authenticated:
            return queryset.none()
        if user.role == User.Role.STUDENT:
            return queryset.filter(student=user)
        if user.role == User.Role.INSTRUCTOR:
            return queryset.filter(course__instructor=user)
        return queryset.none()

    def get_permissions(self):
        if self.action == "create":
            return [permissions.IsAuthenticated(), IsStudent()]
        return [permissions.IsAuthenticated()]


class MyCoursesView(generics.ListAPIView):
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        queryset = (
            Course.objects.select_related("category", "instructor")
            .annotate(
                lessons_total=Count("lessons", distinct=True),
                enrollments_total=Count("enrollments", distinct=True),
            )
            .all()
        )
        user = self.request.user

        if user.role == User.Role.STUDENT:
            return queryset.filter(enrollments__student=user)
        if user.role == User.Role.INSTRUCTOR:
            return queryset.filter(instructor=user)
        return queryset.none()


class DashboardStatsView(APIView):
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        payload = {
            "total_courses": Course.objects.count(),
            "total_students": User.objects.filter(role=User.Role.STUDENT).count(),
            "total_enrollments": Enrollment.objects.count(),
            "my_courses": 0,
            "my_enrollments": 0,
        }

        if request.user.role == User.Role.INSTRUCTOR:
            payload["my_courses"] = Course.objects.filter(instructor=request.user).count()
            payload["my_enrollments"] = Enrollment.objects.filter(
                course__instructor=request.user
            ).count()
        elif request.user.role == User.Role.STUDENT:
            payload["my_courses"] = Enrollment.objects.filter(student=request.user).count()
            payload["my_enrollments"] = payload["my_courses"]

        return Response(payload, status=status.HTTP_200_OK)
