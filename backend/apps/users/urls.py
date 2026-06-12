from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    PasswordResetView,
    ProfileView,
    RegisterView,
)


urlpatterns = [
    path("auth/register", RegisterView.as_view(), name="auth-register"),
    path("auth/login", LoginView.as_view(), name="auth-login"),
    path("auth/refresh", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/logout", LogoutView.as_view(), name="auth-logout"),
    path("auth/profile", ProfileView.as_view(), name="auth-profile"),
    path("auth/change-password", ChangePasswordView.as_view(), name="auth-change-password"),
    path("auth/reset-password", PasswordResetView.as_view(), name="auth-reset-password"),
]
