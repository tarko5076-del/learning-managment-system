from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryViewSet,
    CourseViewSet,
    DashboardStatsView,
    EnrollmentViewSet,
    InstructorListView,
    LessonProgressViewSet,
    LessonViewSet,
    MyCoursesView,
)


router = DefaultRouter(trailing_slash=False)
router.register("categories", CategoryViewSet, basename="category")
router.register("courses", CourseViewSet, basename="course")
router.register("lessons", LessonViewSet, basename="lesson")
router.register("lesson-progress", LessonProgressViewSet, basename="lesson-progress")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("instructors", InstructorListView.as_view(), name="instructor-list"),
    path("my-courses", MyCoursesView.as_view(), name="my-courses"),
]
