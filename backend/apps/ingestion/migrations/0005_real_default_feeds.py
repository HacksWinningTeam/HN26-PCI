from urllib.parse import urlparse

from django.db import migrations
from django.utils import timezone


DEFAULT_FEEDS = [{'name': 'CORDIS — Projekty B+R z udziałem Polski (EU Open Data)',
  'category': 'Projekty B+R',
  'url': 'https://cordis.europa.eu/search/en?q=contenttype%3D%27project%27%20AND%20%27Poland%27%20AND%20(%27innovation%27%20OR%20%27prototype%27%20OR%20%27pilot%27)&p=1&num=10&format=json',
  'method': 'API',
  'adapter': 'cordis_json'},
 {'name': 'RUJ UJ / Repozytoria Uczelniane (OAI-PMH)',
  'category': 'Nauka i patenty',
  'url': 'https://ruj.uj.edu.pl/server/oai/request?verb=ListRecords&metadataPrefix=oai_dc',
  'method': 'OAI-PMH',
  'adapter': 'oai_pmh'},
 {'name': 'Nauka w Polsce — Technologie i Innowacje (RSS)',
  'category': 'Nauka i patenty',
  'url': 'https://naukawpolsce.pl/technologia/rss.xml',
  'method': 'RSS',
  'adapter': 'rss'},
 {'name': 'OpenAlex PL — Badania i innowacje',
  'category': 'Nauka i patenty',
  'url': 'https://api.openalex.org/works?filter=institutions.country_code:pl,has_abstract:true&search=innovation&per-page=10',
  'method': 'API',
  'adapter': 'openalex'}]

LEGACY_PLACEHOLDERS = [('NCN — Baza Projektów', 'https://projekty.ncn.gov.pl/'),
 ('Samorządy, Szkoły, CTT & Startupy', 'https://samorzad.gov.pl/')]


def upgrade_feeds(apps, schema_editor):
    Feed = apps.get_model("ingestion", "SourceFeed")
    Source = apps.get_model("innovations", "InnovationSource")
    Run = apps.get_model("ingestion", "IngestionRun")
    alias = schema_editor.connection.alias
    for name, url in LEGACY_PLACEHOLDERS:
        Feed.objects.using(alias).filter(name=name, url=url).delete()

    for spec in DEFAULT_FEEDS:
        defaults = {k: v for k, v in spec.items() if k not in {"name", "adapter"}}
        feed, _ = Feed.objects.using(alias).get_or_create(
            name=spec["name"], defaults={**defaults, "last_synced_at": timezone.now()}
        )
        config = dict(feed.config or {})
        config.update(adapter=spec["adapter"], max_records=10)
        config.setdefault("live_fetch", False)
        feed.url = spec["url"]
        feed.config = config
        feed.save(using=alias, update_fields=["url", "config"])

    for feed in Feed.objects.using(alias).all():
        registry = feed.name.split("—")[0].strip()
        host = urlparse(feed.url).hostname
        for source in Source.objects.using(alias).filter(registry=registry):
            if urlparse(source.url).hostname == host:
                feed.sources.add(source)
        feed.records_count = (
            feed.sources.using(alias).filter(innovation__is_merged=False)
            .values("innovation_id").distinct().count()
        )
        feed.save(using=alias, update_fields=["records_count"])

    # Only this exact historical seed entry fabricated a network outage.
    Run.objects.using(alias).filter(
        summary="Zaindeksowano rekordy demo; 1 źródło (NCN) zwróciło HTTP 503."
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("ingestion", "0004_sourcefeed_sources")]
    operations = [migrations.RunPython(upgrade_feeds, migrations.RunPython.noop)]
