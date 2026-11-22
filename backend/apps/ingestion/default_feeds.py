"""Public channel configuration, independent of innovation or account fixtures."""

from urllib.parse import urlparse

from django.utils import timezone

from apps.innovations.models import InnovationSource

from .models import SourceFeed

DEFAULT_FEEDS = [
    {
        "name": "CORDIS — Projekty B+R z udziałem Polski (EU Open Data)",
        "category": "Projekty B+R",
        "url": (
            "https://cordis.europa.eu/search/en?"
            "q=contenttype%3D%27project%27%20AND%20%27Poland%27%20AND%20"
            "(%27innovation%27%20OR%20%27prototype%27%20OR%20%27pilot%27)"
            "&p=1&num=10&format=json"
        ),
        "method": "API",
        "adapter": "cordis_json",
    },
    {
        "name": "RUJ UJ / Repozytoria Uczelniane (OAI-PMH)",
        "category": "Nauka i patenty",
        "url": "https://ruj.uj.edu.pl/server/oai/request?verb=ListRecords&metadataPrefix=oai_dc",
        "method": "OAI-PMH",
        "adapter": "oai_pmh",
    },
    {
        "name": "Nauka w Polsce — Technologie i Innowacje (RSS)",
        "category": "Nauka i patenty",
        "url": "https://naukawpolsce.pl/technologia/rss.xml",
        "method": "RSS",
        "adapter": "rss",
    },
    {
        "name": "OpenAlex PL — Badania i innowacje",
        "category": "Nauka i patenty",
        "url": (
            "https://api.openalex.org/works?filter=institutions.country_code:pl,"
            "has_abstract:true&search=innovation&per-page=10"
        ),
        "method": "API",
        "adapter": "openalex",
    },
    {
        "name": "CTT UŁ — Oferta technologiczna dla biznesu",
        "category": "Startupy i biznes",
        "url": "https://www.ctt.uni.lodz.pl/dla-biznesu/oferta-technologiczna",
        "method": "HTML katalog",
        "adapter": "ctt_offers",
    },
    {
        "name": "IBE — Innowacje pedagogiczne w szkołach",
        "category": "Administracja i edukacja",
        "url": "https://www.ibe.edu.pl/pl/dobre-praktyki",
        "method": "HTML katalog",
        "adapter": "ibe_school_pdf",
    },
]

LEGACY_PLACEHOLDERS = [
    ("NCN — Baza Projektów", "https://projekty.ncn.gov.pl/"),
    ("Samorządy, Szkoły, CTT & Startupy", "https://samorzad.gov.pl/"),
]


def configure_default_feeds() -> None:
    for name, url in LEGACY_PLACEHOLDERS:
        SourceFeed.objects.filter(name=name, url=url).delete()

    for spec in DEFAULT_FEEDS:
        defaults = {key: value for key, value in spec.items() if key not in {"name", "adapter"}}
        feed, _ = SourceFeed.objects.get_or_create(
            name=spec["name"],
            defaults={**defaults, "last_synced_at": timezone.now()},
        )
        config = dict(feed.config or {})
        config.update(adapter=spec["adapter"], max_records=10)
        config.setdefault("live_fetch", True)
        feed.url = spec["url"]
        feed.config = config
        # Recover provenance for records imported before explicit feed links existed.
        registry = feed.name.split("—")[0].strip()
        host = urlparse(feed.url).hostname
        sources = InnovationSource.objects.filter(registry=registry)
        for source in sources:
            if urlparse(source.url).hostname == host:
                feed.sources.add(source)
        feed.records_count = feed.local_records_count
        feed.save(update_fields=["url", "config", "records_count"])
