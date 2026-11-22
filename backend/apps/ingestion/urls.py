from django.urls import path

from .views import (
    AdminDataQualityView,
    AdminInnovationHistoryView,
    AdminInnovationRejectView,
    AdminInnovationUpdateView,
    AdminMergeDuplicateView,
    AdminRunIngestionView,
    AdminScoringConfigView,
)

urlpatterns = [
    path("admin/innovations/", AdminDataQualityView.as_view(), name="admin-innovations"),
    path(
        "admin/innovations/<slug:slug>/",
        AdminInnovationUpdateView.as_view(),
        name="admin-innovation-update",
    ),
    path(
        "admin/innovations/<slug:slug>/reject/",
        AdminInnovationRejectView.as_view(),
        name="admin-innovation-reject",
    ),
    path(
        "admin/innovations/<slug:slug>/history/",
        AdminInnovationHistoryView.as_view(),
        name="admin-innovation-history",
    ),
    path(
        "admin/innovations/<slug:slug>/merge-duplicate/",
        AdminMergeDuplicateView.as_view(),
        name="admin-merge-duplicate",
    ),
    path("admin/ingestion/run/", AdminRunIngestionView.as_view(), name="admin-ingestion-run"),
    path("admin/scoring-config/", AdminScoringConfigView.as_view(), name="admin-scoring-config"),
]
