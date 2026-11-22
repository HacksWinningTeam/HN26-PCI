"""Bounded discovery of individual offers/documents from two public Polish catalogues."""

import hashlib
import re
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, unquote, urljoin, urlparse

from .adapters import (
    FeedBatch,
    RawSourceRecord,
    _assert_not_antibot,
    _download,
    parse_pdf_document,
)

CTT_HOST = "www.ctt.uni.lodz.pl"
IBE_HOST = "www.ibe.edu.pl"
CTT_DETAIL_PATH = "/wspolpraca/transfer-technologii/oferta-technologiczna-unilodz/szczegol-oftech"
IBE_DOCUMENT_PATH = "/images/badania/Kariera-bez-barier/Dobre_Praktyki/Innowacje pedagogiczne/"
_VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
              "param", "source", "track", "wbr"}


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


class _CatalogueLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[dict[str, str]] = []
        self.anchor: dict[str, str] | None = None
        self.row_parts: list[str] = []
        self.row_links: list[dict[str, str]] = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "li":
            self.row_parts, self.row_links = [], []
        if tag == "a":
            self.anchor = {"url": data.get("href", ""), "title": data.get("title", ""),
                           "text": "", "context": ""}

    def handle_data(self, data):
        self.row_parts.append(data)
        if self.anchor is not None:
            self.anchor["text"] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.anchor is not None:
            self.links.append(self.anchor)
            self.row_links.append(self.anchor)
            self.anchor = None
        elif tag == "li":
            for link in self.row_links:
                link["context"] = _clean(" ".join(self.row_parts))


class _ArticleText(HTMLParser):
    """Read CTT headline/teaser/body, excluding global navigation and footer."""

    def __init__(self):
        super().__init__()
        self.depth = 0
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in _VOID_TAGS:
            return
        if self.depth or dict(attrs).get("itemprop") in {"headline", "description", "articleBody"}:
            self.depth += 1

    def handle_endtag(self, tag):
        if self.depth and tag not in _VOID_TAGS:
            self.depth -= 1

    def handle_data(self, data):
        if self.depth:
            self.parts.append(data)


def discover_catalogue_links(html: str, url: str) -> tuple[list[dict[str, str]], str]:
    _assert_not_antibot(html)
    parser = _CatalogueLinks()
    parser.feed(html)
    host = urlparse(url).hostname
    page = int(parse_qs(urlparse(url).query).get("tx_news_pi1[currentPage]", ["1"])[0])
    documents: dict[str, dict[str, str]] = {}
    next_pages: dict[int, str] = {}
    for link in parser.links:
        target = urljoin(url, link["url"])
        parsed = urlparse(target)
        # Follow only known document paths on the same publisher, never external links.
        if parsed.scheme != "https" or parsed.hostname != host:
            continue
        query = parse_qs(parsed.query)
        if host == CTT_HOST:
            if parsed.path == CTT_DETAIL_PATH and query.get("tx_news_pi1[news]", [""])[0].isdigit():
                title = _clean(link["title"] or link["text"])
                documents.setdefault(target, {"url": target, "title": title})
            elif parsed.path == urlparse(url).path:
                candidate = query.get("tx_news_pi1[currentPage]", [""])[0]
                if candidate.isdigit() and int(candidate) > page:
                    next_pages[int(candidate)] = target
        elif host == IBE_HOST:
            path = unquote(parsed.path)
            if path.startswith(IBE_DOCUMENT_PATH) and path.lower().endswith(".pdf"):
                title = _clean(re.sub(r"\s*\(\s*kliknij i pobierz PDF\s*\)\s*$", "",
                                     link["context"], flags=re.IGNORECASE))
                documents.setdefault(target, {"url": target, "title": title})
    if not documents:
        raise ValueError(
            "Katalog nie zawiera rozpoznanych kart innowacji; sprawdź strukturę źródła."
        )
    return list(documents.values()), next_pages[min(next_pages)] if next_pages else ""


def _ctt_record(raw: bytes, document: dict[str, str], registry: str) -> RawSourceRecord:
    html = raw.decode("utf-8", errors="replace")
    _assert_not_antibot(html)
    parser = _ArticleText()
    parser.feed(html)
    text = _clean(" ".join(parser.parts))
    if not text:
        raise ValueError("Karta CTT nie zawiera opisu technologii.")
    metadata: dict[str, Any] = {
        "primary_area": "technological", "organization_type": "university",
        "origin_location": "Łódź", "target_org_types": ["company", "startup", "university"],
        "radar_user_types": [
            "startups_enterprises", "investors_commercial", "universities_science",
        ],
    }
    trl = re.search(r"(?:Poziom\s+TRL|Poziom\s+gotowości\s+technologicznej)\s*:\s*"
                    r"([1-9]|VIII|VII|VI|IV|IX|III|II|V|I)\b", text, re.IGNORECASE)
    if trl:
        value = trl.group(1).upper()
        romans = {"I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6,
                  "VII": 7, "VIII": 8, "IX": 9}
        metadata["trl"] = int(value) if value.isdigit() else romans[value]
    return RawSourceRecord(
        title=document["title"], text=text[:8000], url=document["url"], registry=registry,
        label=document["title"][:120], organization_name="Uniwersytet Łódzki", metadata=metadata,
    )


def _ibe_record(raw: bytes, document: dict[str, str], registry: str) -> RawSourceRecord:
    record = parse_pdf_document(raw, url=document["url"], registry=registry,
                                label=document["title"])
    # The listing supplies the actual innovation title, unlike generic PDF metadata.
    record.title = document["title"][:250]
    school = re.search(r"\bSzkoła\s+(.+?)\s+Imię i nazwisko autora", record.text, re.IGNORECASE)
    if school:
        record.organization_name = school.group(1).strip()[:255]
    record.metadata.update(
        primary_area="educational", organization_type="school",
        # The IBE catalogue explicitly describes school innovations realized in 2024/25.
        deployment_level="deployed", sectors=["edukacja"],
        target_org_types=["school", "public_institution"],
        radar_user_types=["schools_education", "public_institutions"],
    )
    # Do not infer the school's location from the repeated Warsaw publisher header.
    record.metadata["origin_location"] = "Polska (lokalizacja do potwierdzenia)"
    return record


def fetch_catalogue_batch(
    *, url: str, registry: str, label: str, max_records: int,
    state: dict[str, Any] | None = None,
) -> FeedBatch:
    host = urlparse(url).hostname
    if host not in {CTT_HOST, IBE_HOST} or urlparse(url).scheme != "https":
        raise ValueError("Nieobsługiwany katalog HTML. Obsługiwane są katalogi CTT UŁ oraz IBE.")
    signature = hashlib.sha256(f"catalogue-v1|{url}|{max_records}".encode()).hexdigest()
    current = dict(state or {})
    if current.get("signature") != signature:
        current = {}
    revisit_head = current.get("batches", 0) >= 5
    current_url = url if revisit_head else current.get("url", url)
    if urlparse(current_url).hostname != host or urlparse(current_url).scheme != "https":
        raise ValueError("Zapisana strona katalogu musi należeć do tego samego wydawcy.")
    offset = 0 if revisit_head else max(0, int(current.get("offset", 0)))
    raw, _ = _download(current_url)
    documents, next_page = discover_catalogue_links(
        raw.decode("utf-8", errors="replace"), current_url,
    )
    # Removed entries must not strand a saved offset beyond the end of a catalogue.
    if offset >= len(documents):
        offset = 0
    records = []
    for document in documents[offset:offset + max_records]:
        detail, content_type = _download(document["url"])
        if host == IBE_HOST:
            record = _ibe_record(detail, document, registry)
        else:
            if "html" not in content_type.lower():
                raise ValueError("Karta CTT nie jest dokumentem HTML.")
            record = _ctt_record(detail, document, registry)
        record.metadata["catalogue_url"] = url
        records.append(record)
    if revisit_head:
        return FeedBatch(records, {**current, "batches": 0})
    next_state = {"signature": signature, "batches": int(current.get("batches", 0)) + 1}
    if offset + max_records < len(documents):
        next_state.update(url=current_url, offset=offset + max_records)
    elif next_page:
        next_state.update(url=next_page, offset=0)
    else:
        next_state = {}
    return FeedBatch(records, next_state)
