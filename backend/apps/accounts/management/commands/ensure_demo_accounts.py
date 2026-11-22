"""Idempotently ensure PCI admin, demo adopter, and tester accounts exist."""

import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.accounts.models import AdopterProfile

User = get_user_model()


class Command(BaseCommand):
    help = "Create default PCI admin, demo organization, and tester accounts if missing."

    def handle(self, *args, **options):
        admin_email = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@pcinn.org").strip().lower()
        admin_password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "admin1234")
        demo_email = os.getenv("BOOTSTRAP_DEMO_EMAIL", "soltys@trzebownisko.pl").strip().lower()
        demo_password = os.getenv("BOOTSTRAP_DEMO_PASSWORD", "demo1234")
        tester_email = os.getenv("BOOTSTRAP_TESTER_EMAIL", "tester@test.com").strip().lower()
        tester_password = os.getenv("BOOTSTRAP_TESTER_PASSWORD", "Haslo123")

        created_accounts: list[str] = []

        admin_user, created = User.objects.get_or_create(
            username=admin_email,
            defaults={
                "email": admin_email,
                "first_name": "Operator PCI",
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin_user.set_password(admin_password)
            admin_user.save(update_fields=["password"])
            created_accounts.append(admin_email)
        AdopterProfile.objects.get_or_create(
            user=admin_user,
            defaults={
                "organization_type": "public_institution",
                "organization_name": "Podkarpackie Centrum Innowacji",
                "role_title": "Administrator Praktoteki",
                "deployment_location": "Rzeszów, Podkarpackie",
                "is_pci_admin": True,
            },
        )

        demo_user, created = User.objects.get_or_create(
            username=demo_email,
            defaults={"email": demo_email, "first_name": "Jan Kowalski"},
        )
        if created:
            demo_user.set_password(demo_password)
            demo_user.save(update_fields=["password"])
            created_accounts.append(demo_email)
        AdopterProfile.objects.get_or_create(
            user=demo_user,
            defaults={
                "organization_type": "public_institution",
                "organization_name": "Gmina Trzebownisko",
                "role_title": "Sołtys Gminy",
                "deployment_location": "Trzebownisko, Podkarpackie",
                "potential_users_count": 3400,
                "current_approach": "Ręczne objazdy OSP podczas ulew",
                "available_resources": "Fundusz sołecki + zespół OSP",
                "team_competencies": "Koordynator kryzysowy w urzędzie",
                "target_timeline": "Q1 2027",
                "key_constraints": "Słaby zasięg GSM w jednej dolinie",
            },
        )

        tester_user, created = User.objects.get_or_create(
            username=tester_email,
            defaults={"email": tester_email, "first_name": "Konto Testowe"},
        )
        if created:
            tester_user.set_password(tester_password)
            tester_user.save(update_fields=["password"])
            created_accounts.append(tester_email)
        AdopterProfile.objects.get_or_create(user=tester_user)

        if created_accounts:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Bootstrapped accounts: {', '.join(created_accounts)}."
                )
            )
        else:
            self.stdout.write("All bootstrap accounts already exist.")
