from django.db import migrations


def enable_real_harvesting(apps, schema_editor):
    Feed = apps.get_model("ingestion", "SourceFeed")
    Innovation = apps.get_model("innovations", "Innovation")
    alias = schema_editor.connection.alias
    for feed in Feed.objects.using(alias).all():
        config = dict(feed.config or {})
        config.pop("sample_items", None)
        # The old flag selected offline fixtures; it now enables automatic HTTP harvesting.
        config["live_fetch"] = True
        config.setdefault("max_records", 10)
        feed.config = config
        feed.save(using=alias, update_fields=["config"])
    # Preserve records and related user data; synthetic examples leave the public catalog.
    Innovation.objects.using(alias).filter(is_synthetic_demo=True).update(is_public=False)
    placeholder_scores = {
        "innovativeness": 70, "application_potential": 72,
        "transferability": 68, "credibility": 65,
    }
    for innovation in Innovation.objects.using(alias).filter(
        is_synthetic_demo=False, verification_status="pending_review",
    ):
        if innovation.scores == placeholder_scores:
            innovation.scores = {}
            innovation.save(using=alias, update_fields=["scores"])


class Migration(migrations.Migration):
    dependencies = [("ingestion", "0006_sourcefeed_harvest_state")]
    operations = [migrations.RunPython(enable_real_harvesting, migrations.RunPython.noop)]
