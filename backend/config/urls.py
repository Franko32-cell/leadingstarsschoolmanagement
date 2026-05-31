from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse, JsonResponse  # ← add JsonResponse
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

def robots_txt(request):
    content = "User-agent: *\nDisallow: /api/\nDisallow: /admin/\n"
    return HttpResponse(content, content_type="text/plain")

def health_check(request):                          # ← add this
    return JsonResponse({"status": "ok"})

schema_view = get_schema_view(
    openapi.Info(
        title="School Management API",
        default_version='v1',
        description="API documentation for the school system",
    ),
    public=True,
    permission_classes=[permissions.AllowAny],
)

urlpatterns = [
    path("robots.txt", robots_txt),
    path("api/health/", health_check),              # ← add this
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
    path("api/docs/", schema_view.with_ui('swagger', cache_timeout=0), name="swagger-docs"),
    path("api/redoc/", schema_view.with_ui('redoc', cache_timeout=0), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
