from django.contrib import admin

from .models import Category, Course, Enrollment, Lesson


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "instructor", "created_at", "updated_at")
    list_filter = ("category", "created_at")
    search_fields = ("title", "description", "instructor__email", "instructor__full_name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "order")
    list_filter = ("course",)
    search_fields = ("title", "content", "course__title")
    ordering = ("course", "order")


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ("student", "course", "enrollment_date")
    list_filter = ("enrollment_date",)
    search_fields = ("student__email", "student__full_name", "course__title")
    readonly_fields = ("enrollment_date",)
