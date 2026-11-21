from django.urls import path

from .views import (
    DiscoveryMatchView,
    MatchNotificationCreateView,
    SavedComparisonListCreateView,
    SavedInnovationListCreateView,
)

urlpatterns = [
    path("discovery/match/", DiscoveryMatchView.as_view(), name="discovery-match"),
    path(
        "notifications/matches/", MatchNotificationCreateView.as_view(), name="match-notifications"
    ),
    path("comparisons/", SavedComparisonListCreateView.as_view(), name="saved-comparisons"),
    path("saved-innovations/", SavedInnovationListCreateView.as_view(), name="saved-innovations"),
]
