from rest_framework import permissions


class IsInstructor(permissions.BasePermission):
    message = "Only instructor accounts can create or manage courses, lessons, and categories."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "instructor"
        )


class IsStudent(permissions.BasePermission):
    message = "Only student accounts can enroll in courses or track lesson progress."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsCourseInstructorOrReadOnly(permissions.BasePermission):
    message = "Only the instructor who owns this course can change or delete it."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and obj.instructor_id == request.user.id)
