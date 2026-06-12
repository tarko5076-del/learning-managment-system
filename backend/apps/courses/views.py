from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import User
from apps.users.serializers import UserSummarySerializer

from .models import Category, Course, Enrollment, Lesson, LessonProgress
from .permissions import IsCourseInstructorOrReadOnly, IsInstructor, IsStudent
from .serializers import (
    CategorySerializer,
    CourseSerializer,
    EnrollmentSerializer,
    LessonProgressSerializer,
    LessonSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    http_method_names = ("get", "post", "put", "patch", "delete", "head", "options")

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [permissions.IsAuthenticated(), IsInstructor()]
        return [permissions.IsAuthenticated()]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError as exc:
            raise ValidationError(
                "This category has courses attached. Move or delete those courses first."
            ) from exc


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

        category_id = self.request.query_params.get("category")
        if category_id:
            queryset = queryset.filter(category_id=category_id)

        instructor_id = self.request.query_params.get("instructor")
        if instructor_id:
            queryset = queryset.filter(instructor_id=instructor_id)

        ordering = self.request.query_params.get("ordering", "newest")
        ordering_map = {
            "newest": "-created_at",
            "oldest": "created_at",
            "most_enrolled": "-enrollments_total",
            "title": "title",
        }
        return queryset.order_by(ordering_map.get(ordering, "-created_at"))

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


class LessonProgressViewSet(viewsets.ModelViewSet):
    serializer_class = LessonProgressSerializer
    http_method_names = ("get", "post", "head", "options")

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsStudent()]

    def get_queryset(self):
        queryset = LessonProgress.objects.select_related("student", "lesson", "lesson__course")
        queryset = queryset.filter(student=self.request.user)

        course_id = self.request.query_params.get("course")
        if course_id:
            queryset = queryset.filter(lesson__course_id=course_id)

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        lesson = serializer.validated_data["lesson"]
        completed = serializer.validated_data.get("completed", True)
        progress, _created = LessonProgress.objects.get_or_create(
            student=request.user,
            lesson=lesson,
            defaults={"completed": completed},
        )
        progress.completed = completed
        progress.completed_at = timezone.now() if completed else None
        progress.save(update_fields=("completed", "completed_at", "updated_at"))

        response_serializer = self.get_serializer(progress)
        return Response(response_serializer.data, status=status.HTTP_200_OK)


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


class InstructorListView(generics.ListAPIView):
    serializer_class = UserSummarySerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return User.objects.filter(role=User.Role.INSTRUCTOR, is_active=True).order_by("full_name")
