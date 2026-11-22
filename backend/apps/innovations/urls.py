from django.urls import path

from .views import (
    InnovationDetailView,
    InnovationExportView,
    InnovationListView,
    InnovationRegisteredDetailView,
)

urlpatterns = [
    path("innovations/", InnovationListView.as_view(), name="innovation-list"),
    path("innovations/<slug:slug>/", InnovationDetailView.as_view(), name="innovation-detail"),
    path(
        "innovations/<slug:slug>/export/",
        InnovationExportView.as_view(),
        name="innovation-export",
    ),
    path(
        "innovations/<slug:slug>/full/",
        InnovationRegisteredDetailView.as_view(),
        name="innovation-full-detail",
    ),
]
