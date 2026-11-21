from django.urls import path

from .views import AuthMeView, LoginView, LogoutView, ProfileView, RegisterView

urlpatterns = [
    path("auth/me/", AuthMeView.as_view(), name="auth-me"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("profile/", ProfileView.as_view(), name="adopter-profile"),
]
