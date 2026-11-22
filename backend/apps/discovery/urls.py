from django.urls import path

from .views import (
    AnalyticsTrackView,
    AnalyticsTrendsView,
    ComparisonExportView,
    DiscoveryCompareView,
    DiscoveryMatchView,
    MatchNotificationCreateView,
    SavedComparisonListCreateView,
    SavedInnovationDetailView,
    SavedInnovationListCreateView,
)

urlpatterns = [
    path("discovery/match/", DiscoveryMatchView.as_view(), name="discovery-match"),
    path("discovery/compare/", DiscoveryCompareView.as_view(), name="discovery-compare"),
    path("analytics/track/", AnalyticsTrackView.as_view(), name="analytics-track"),
    path("analytics/trends/", AnalyticsTrendsView.as_view(), name="analytics-trends"),
    path(
        "notifications/matches/", MatchNotificationCreateView.as_view(), name="match-notifications"
    ),
    path("comparisons/", SavedComparisonListCreateView.as_view(), name="saved-comparisons"),
    path("comparisons/export/", ComparisonExportView.as_view(), name="comparison-export"),
    path("saved-innovations/", SavedInnovationListCreateView.as_view(), name="saved-innovations"),
    path(
        "saved-innovations/<slug:slug>/",
        SavedInnovationDetailView.as_view(),
        name="saved-innovation-detail",
    ),
]
