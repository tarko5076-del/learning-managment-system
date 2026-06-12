from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "email", "role", "created_at")
        read_only_fields = ("id", "email", "role", "created_at")


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "full_name", "email", "role")
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, trim_whitespace=False)
    password_confirmation = serializers.CharField(
        write_only=True,
        min_length=8,
        trim_whitespace=False,
    )

    class Meta:
        model = User
        fields = ("id", "full_name", "email", "password", "password_confirmation", "role")
        read_only_fields = ("id",)

    def validate(self, attrs):
        password = attrs.get("password")
        password_confirmation = attrs.pop("password_confirmation", None)

        if password != password_confirmation:
            raise serializers.ValidationError(
                {"password_confirmation": "Passwords do not match."}
            )

        validate_password(password)
        return attrs

    def create(self, validated_data):
        # UserManager.create_user calls set_password, so the database stores a Django hash.
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        request = self.context.get("request")
        user = authenticate(request=request, username=attrs["email"], password=attrs["password"])

        if user is None:
            raise serializers.ValidationError("Invalid email or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")

        attrs["user"] = user
        return attrs
