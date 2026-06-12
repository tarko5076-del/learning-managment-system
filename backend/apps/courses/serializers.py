from django.db import IntegrityError, transaction
from rest_framework import serializers

from apps.users.models import User
from apps.users.serializers import UserSummarySerializer

from .models import Category, Course, Enrollment, Lesson


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name")


class LessonSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Lesson
        fields = ("id", "course", "course_title", "title", "content", "video_url", "order")


class CourseSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        source="category",
        write_only=True,
    )
    category_name = serializers.CharField(required=False, write_only=True, allow_blank=False)
    instructor = UserSummarySerializer(read_only=True)
    thumbnail_url = serializers.SerializerMethodField()
    lessons_count = serializers.SerializerMethodField()
    enrollments_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = (
            "id",
            "title",
            "description",
            "thumbnail",
            "thumbnail_url",
            "category",
            "category_id",
            "category_name",
            "instructor",
            "created_at",
            "updated_at",
            "lessons_count",
            "enrollments_count",
            "is_enrolled",
        )
        read_only_fields = ("id", "instructor", "created_at", "updated_at")

    def get_thumbnail_url(self, obj):
        if not obj.thumbnail:
            return ""

        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.thumbnail.url)
        return obj.thumbnail.url

    def get_lessons_count(self, obj):
        return getattr(obj, "lessons_total", obj.lessons.count())

    def get_enrollments_count(self, obj):
        return getattr(obj, "enrollments_total", obj.enrollments.count())

    def get_is_enrolled(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if not user or not user.is_authenticated or user.role != User.Role.STUDENT:
            return False

        return obj.enrollments.filter(student=user).exists()

    def validate(self, attrs):
        category_name = attrs.get("category_name")
        category = attrs.get("category")

        if self.instance is None and not category and not category_name:
            raise serializers.ValidationError(
                {"category_name": "Provide a category name or category_id."}
            )

        return attrs

    def _assign_category_from_name(self, validated_data):
        category_name = validated_data.pop("category_name", None)
        if category_name and "category" not in validated_data:
            category, _created = Category.objects.get_or_create(
                name__iexact=category_name.strip(),
                defaults={"name": category_name.strip()},
            )
            validated_data["category"] = category
        return validated_data

    def create(self, validated_data):
        validated_data = self._assign_category_from_name(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._assign_category_from_name(validated_data)
        return super().update(instance, validated_data)


class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserSummarySerializer(read_only=True)
    course = CourseSerializer(read_only=True)
    course_id = serializers.PrimaryKeyRelatedField(
        queryset=Course.objects.select_related("category", "instructor").all(),
        source="course",
        write_only=True,
    )

    class Meta:
        model = Enrollment
        fields = ("id", "student", "course", "course_id", "enrollment_date")
        read_only_fields = ("id", "student", "course", "enrollment_date")

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        course = attrs.get("course")

        if not user or not user.is_authenticated or user.role != User.Role.STUDENT:
            raise serializers.ValidationError("Only students can enroll in courses.")

        if course and Enrollment.objects.filter(student=user, course=course).exists():
            raise serializers.ValidationError("You are already enrolled in this course.")

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        try:
            return Enrollment.objects.create(student=request.user, **validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError("You are already enrolled in this course.") from exc
