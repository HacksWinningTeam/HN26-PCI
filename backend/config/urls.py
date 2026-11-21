"""URL configuration for config project."""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/", include("apps.innovations.urls")),
    path("api/", include("apps.discovery.urls")),
    path("api/", include("apps.accounts.urls")),
    path("api/", include("apps.implementation.urls")),
    path("api/", include("apps.ingestion.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="api-schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="api-schema"),
        name="api-swagger-ui",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="api-schema"),
        name="api-redoc",
    ),
]
