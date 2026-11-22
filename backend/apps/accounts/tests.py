import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from apps.accounts.models import AdopterProfile

User = get_user_model()


@pytest.mark.django_db
def test_ensure_demo_accounts_creates_expected_accounts_idempotently():
    call_command("ensure_demo_accounts")

    admin = User.objects.get(email="admin@pcinn.org")
    assert admin.is_staff is True
    assert admin.check_password("admin1234")
    assert admin.adopter_profile.is_pci_admin is True

    demo = User.objects.get(email="soltys@trzebownisko.pl")
    assert demo.check_password("demo1234")
    assert demo.adopter_profile.organization_name == "Gmina Trzebownisko"
    assert demo.adopter_profile.is_complete() is True

    tester = User.objects.get(email="tester@test.com")
    assert tester.check_password("Haslo123")
    assert tester.adopter_profile.is_pci_admin is False
    assert tester.adopter_profile.is_complete() is False

    # Manual changes to existing accounts must not be overwritten on subsequent runs.
    tester.set_password("CustomPass999")
    tester.save()
    AdopterProfile.objects.filter(user=tester).update(organization_name="Szkoła Testowa")

    call_command("ensure_demo_accounts")

    tester.refresh_from_db()
    assert tester.check_password("CustomPass999")
    assert tester.adopter_profile.organization_name == "Szkoła Testowa"
