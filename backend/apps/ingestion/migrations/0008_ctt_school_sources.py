from django.db import migrations
from django.utils import timezone


FEEDS = [
    {
        "name": "CTT UŁ — Oferta technologiczna dla biznesu",
        "category": "Startupy i biznes",
        "url": "https://www.ctt.uni.lodz.pl/dla-biznesu/oferta-technologiczna",
        "method": "HTML katalog",
        "config": {"adapter": "ctt_offers", "max_records": 10, "live_fetch": True},
    },
    {
        "name": "IBE — Innowacje pedagogiczne w szkołach",
        "category": "Administracja i edukacja",
        "url": "https://www.ibe.edu.pl/pl/dobre-praktyki",
        "method": "HTML katalog",
        "config": {"adapter": "ibe_school_pdf", "max_records": 10, "live_fetch": True},
    },
]


def add_catalogues(apps, schema_editor):
    Feed = apps.get_model("ingestion", "SourceFeed")
    feeds = Feed.objects.using(schema_editor.connection.alias)
    for spec in FEEDS:
        if not feeds.filter(url=spec["url"]).exists():
            feeds.create(**spec, last_synced_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [("ingestion", "0007_live_harvesting_only")]
    operations = [migrations.RunPython(add_catalogues, migrations.RunPython.noop)]
