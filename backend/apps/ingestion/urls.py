from django.urls import path

from .views import (
    AdminDataQualityView,
    AdminInnovationUpdateView,
    AdminMergeDuplicateView,
    AdminRunIngestionView,
)

urlpatterns = [
    path("admin/innovations/", AdminDataQualityView.as_view(), name="admin-innovations"),
    path(
        "admin/innovations/<slug:slug>/",
        AdminInnovationUpdateView.as_view(),
        name="admin-innovation-update",
    ),
    path(
        "admin/innovations/<slug:slug>/merge-duplicate/",
        AdminMergeDuplicateView.as_view(),
        name="admin-merge-duplicate",
    ),
    path("admin/ingestion/run/", AdminRunIngestionView.as_view(), name="admin-ingestion-run"),
]
