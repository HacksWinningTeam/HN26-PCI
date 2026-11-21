from django.contrib.auth import authenticate, get_user_model, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AdopterProfile
from .serializers import (
    AdopterProfileSerializer,
    AuthMeResponseSerializer,
    LoginSerializer,
    LogoutResponseSerializer,
    RegisterSerializer,
)

User = get_user_model()


def _serialize_auth_state(user) -> dict:
    if not user or not user.is_authenticated:
        return {"authenticated": False, "user": None, "profile": None}
    profile, _ = AdopterProfile.objects.get_or_create(user=user)
    is_admin = bool(user.is_staff or profile.is_pci_admin)
    return {
        "authenticated": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.get_full_name() or user.username,
            "is_pci_admin": is_admin,
        },
        "profile": AdopterProfileSerializer(profile).data,
    }


@method_decorator(ensure_csrf_cookie, name="dispatch")
class AuthMeView(APIView):
    """Return current session user & profile and ensure CSRF cookie is set."""

    authentication_classes = [SessionAuthentication]
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Accounts"],
        responses={200: AuthMeResponseSerializer},
        summary="Get current session user and adopter profile",
    )
    def get(self, request):
        return Response(_serialize_auth_state(request.user))


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Accounts"],
        request=RegisterSerializer,
        responses={201: AuthMeResponseSerializer},
        summary="Create an adopter account and start session",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"].strip().lower()

        if (
            User.objects.filter(email=email).exists()
            or User.objects.filter(username=email).exists()
        ):
            return Response(
                {"detail": "Konto z tym adresem e-mail już istnieje. Zaloguj się."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.create_user(
            username=email,
            email=email,
            password=data["password"],
            first_name=data.get("full_name", "")[:150],
        )
        AdopterProfile.objects.create(
            user=user,
            organization_type=data.get("organization_type", "public_institution"),
            organization_name=data.get("organization_name", ""),
            role_title=data.get("role_title", ""),
            deployment_location=data.get("deployment_location", ""),
        )
        login(request, user)
        return Response(_serialize_auth_state(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Accounts"],
        request=LoginSerializer,
        responses={200: AuthMeResponseSerializer},
        summary="Authenticate user session",
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        user = authenticate(request, username=email, password=password)
        if not user:
            return Response(
                {"detail": "Nieprawidłowy adres e-mail lub hasło."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response(_serialize_auth_state(user), status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Accounts"],
        request=None,
        responses={200: LogoutResponseSerializer},
        summary="Log out current session",
    )
    def post(self, request):
        logout(request)
        return Response({"ok": True})


class ProfileView(APIView):
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Accounts"],
        responses={200: AdopterProfileSerializer},
        summary="Retrieve organization questionnaire profile",
    )
    def get(self, request):
        profile, _ = AdopterProfile.objects.get_or_create(user=request.user)
        return Response(AdopterProfileSerializer(profile).data)

    @extend_schema(
        tags=["Accounts"],
        request=AdopterProfileSerializer,
        responses={200: AdopterProfileSerializer},
        summary="Update organization questionnaire profile",
    )
    def patch(self, request):
        profile, _ = AdopterProfile.objects.get_or_create(user=request.user)
        serializer = AdopterProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
