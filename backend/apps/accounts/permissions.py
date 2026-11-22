from rest_framework.permissions import BasePermission

from .models import AdopterProfile


class IsPCIAdmin(BasePermission):
    message = "Wymagane uprawnienia operatora PCI."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active
            and (
                user.is_staff
                or AdopterProfile.objects.filter(user=user, is_pci_admin=True).exists()
            )
        )
