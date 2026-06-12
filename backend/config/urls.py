from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_check(_request):
    return JsonResponse({"status": "ok"})


def api_root(_request):
    return JsonResponse(
        {
            "message": "Learning Management System API",
            "health": "/api/health/",
            "admin": "/admin/",
            "auth": {
                "register": "/api/auth/register",
                "login": "/api/auth/login",
                "profile": "/api/auth/profile",
            },
            "courses": "/api/courses",
            "lessons": "/api/lessons",
            "enrollments": "/api/enrollments",
            "my_courses": "/api/my-courses",
        }
    )


urlpatterns = [
    path("", api_root, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/health/", health_check, name="health-check"),
    path("api/", include("apps.users.urls")),
    path("api/", include("apps.courses.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
