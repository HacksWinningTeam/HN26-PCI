from django.urls import path

from .views import (
    AdminImplementationOverviewView,
    ImplementationPlanDetailView,
    ImplementationPlanExportView,
    ImplementationPlanListCreateView,
    ImplementationStepUpdateView,
)

urlpatterns = [
    path(
        "implementation-plans/",
        ImplementationPlanListCreateView.as_view(),
        name="implementation-plans",
    ),
    path(
        "implementation-plans/<int:pk>/",
        ImplementationPlanDetailView.as_view(),
        name="implementation-plan-detail",
    ),
    path(
        "implementation-plans/<int:pk>/export/",
        ImplementationPlanExportView.as_view(),
        name="implementation-plan-export",
    ),
    path(
        "implementation-steps/<int:pk>/",
        ImplementationStepUpdateView.as_view(),
        name="implementation-step-update",
    ),
    path(
        "admin/implementations/",
        AdminImplementationOverviewView.as_view(),
        name="admin-implementations",
    ),
]
