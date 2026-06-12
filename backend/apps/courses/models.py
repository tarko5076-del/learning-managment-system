from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "categories"

    def __str__(self) -> str:
        return self.name


class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    thumbnail = models.ImageField(upload_to="course_thumbnails/", blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="courses")
    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="courses_taught",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["title"]),
            models.Index(fields=["created_at"]),
        ]

    def clean(self) -> None:
        if self.instructor_id and self.instructor.role != "instructor":
            raise ValidationError({"instructor": "Course owner must have the instructor role."})

    def __str__(self) -> str:
        return self.title


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=255)
    content = models.TextField()
    video_url = models.URLField(max_length=500, blank=True)
    order = models.PositiveIntegerField()

    class Meta:
        ordering = ["course", "order"]
        constraints = [
            models.UniqueConstraint(fields=["course", "order"], name="unique_lesson_order_per_course"),
        ]

    def __str__(self) -> str:
        return f"{self.course.title} - {self.title}"


class Enrollment(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    enrollment_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-enrollment_date"]
        constraints = [
            models.UniqueConstraint(fields=["student", "course"], name="unique_student_course_enrollment"),
        ]
        indexes = [
            models.Index(fields=["student", "course"]),
            models.Index(fields=["enrollment_date"]),
        ]

    def clean(self) -> None:
        if self.student_id and self.student.role != "student":
            raise ValidationError({"student": "Only students can enroll in courses."})

    def __str__(self) -> str:
        return f"{self.student.email} -> {self.course.title}"
