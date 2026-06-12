from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    CategoryListCreateView,
    CourseViewSet,
    DashboardStatsView,
    EnrollmentViewSet,
    LessonViewSet,
    MyCoursesView,
)


router = DefaultRouter(trailing_slash=False)
router.register("courses", CourseViewSet, basename="course")
router.register("lessons", LessonViewSet, basename="lesson")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")

urlpatterns = [
    path("", include(router.urls)),
    path("categories", CategoryListCreateView.as_view(), name="category-list"),
    path("dashboard", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("my-courses", MyCoursesView.as_view(), name="my-courses"),
]
