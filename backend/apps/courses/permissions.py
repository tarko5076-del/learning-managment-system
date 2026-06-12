from rest_framework import permissions


class IsInstructor(permissions.BasePermission):
    message = "Only instructors can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "instructor"
        )


class IsStudent(permissions.BasePermission):
    message = "Only students can perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == "student"
        )


class IsCourseInstructorOrReadOnly(permissions.BasePermission):
    message = "Only the course instructor can modify this resource."

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and obj.instructor_id == request.user.id)
