from django.urls import path

from .views import (
    InnovationDetailView,
    InnovationListView,
    InnovationRegisteredDetailView,
)

urlpatterns = [
    path("innovations/", InnovationListView.as_view(), name="innovation-list"),
    path("innovations/<slug:slug>/", InnovationDetailView.as_view(), name="innovation-detail"),
    path(
        "innovations/<slug:slug>/full/",
        InnovationRegisteredDetailView.as_view(),
        name="innovation-full-detail",
    ),
]
