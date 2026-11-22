"""Source adapters for APIs (JSON/RSS/Atom/OAI-PMH), HTML pages, and PDF documents."""

from __future__ import annotations

import hashlib
import io
import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pypdf import PdfReader

_ANTIBOT_MARKERS = (
    "verifying browser",
    "cf-browser-verification",
    "checking your browser before accessing",
    "g-recaptcha",
    "hcaptcha",
    "turnstile",
)


@dataclass
class RawSourceRecord:
    title: str
    text: str
    url: str
    registry: str
    label: str
    organization_name: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class _SimpleHTMLTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._skip_depth = 0
        self._in_title = False
        self.title_parts: list[str] = []
        self.text_parts: list[str] = []
        self.meta_description = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_l = tag.lower()
        if tag_l in {"script", "style", "noscript"}:
            self._skip_depth += 1
        elif tag_l == "title":
            self._in_title = True
        elif tag_l == "meta":
            attr_map = {k.lower(): (v or "") for k, v in attrs}
            if attr_map.get("name", "").lower() == "description" and attr_map.get("content"):
                self.meta_description = attr_map["content"].strip()

    def handle_endtag(self, tag: str) -> None:
        tag_l = tag.lower()
        if tag_l in {"script", "style", "noscript"} and self._skip_depth > 0:
            self._skip_depth -= 1
        elif tag_l == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._skip_depth > 0:
            return
        cleaned = re.sub(r"\s+", " ", data).strip()
        if not cleaned:
            return
        if self._in_title:
            self.title_parts.append(cleaned)
        else:
            self.text_parts.append(cleaned)


def _strip_html(fragment: str) -> str:
    if "<" not in fragment:
        return re.sub(r"\s+", " ", fragment).strip()
    parser = _SimpleHTMLTextParser()
    parser.feed(fragment)
    return re.sub(r"\s+", " ", " ".join(parser.text_parts)).strip()


def _assert_not_antibot(text: str) -> None:
    lowered = text[:4000].lower()
    if any(marker in lowered for marker in _ANTIBOT_MARKERS):
        raise ValueError(
            "Źródło wymaga weryfikacji antybotowej / CAPTCHA — "
            "pominięto zgodnie z polityką dostępu."
        )


def parse_html_document(
    html_content: str,
    *,
    url: str,
    registry: str,
    label: str,
) -> RawSourceRecord:
    _assert_not_antibot(html_content)
    parser = _SimpleHTMLTextParser()
    parser.feed(html_content)
    title = " ".join(parser.title_parts).strip() or label
    body = " ".join(parser.text_parts).strip()
    if parser.meta_description and parser.meta_description not in body:
        body = f"{parser.meta_description}. {body}".strip()
    return RawSourceRecord(
        title=title[:250],
        text=body[:8000] or title,
        url=url,
        registry=registry,
        label=label,
    )


def parse_pdf_document(
    pdf_bytes: bytes,
    *,
    url: str,
    registry: str,
    label: str,
    max_pages: int = 20,
) -> RawSourceRecord:
    """Extract text and title metadata from a PDF document using pypdf."""
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
    except Exception as exc:
        raise ValueError(f"Nie udało się odczytać dokumentu PDF: {exc}") from exc

    meta_title = ""
    if reader.metadata and getattr(reader.metadata, "title", None):
        meta_title = re.sub(r"\s+", " ", str(reader.metadata.title)).strip()

    page_texts: list[str] = []
    for page in reader.pages[:max_pages]:
        extracted = page.extract_text() or ""
        cleaned = re.sub(r"\s+", " ", extracted).strip()
        if cleaned:
            page_texts.append(cleaned)

    full_text = " ".join(page_texts).strip()
    if not full_text:
        raise ValueError("Dokument PDF nie zawiera możliwej do odczytania warstwy tekstowej.")

    url_name = urlparse(url).path.rsplit("/", 1)[-1].replace(".pdf", "").replace("-", " ").strip()
    title = meta_title or (label if label and label != url else url_name) or "Dokument PDF"
    return RawSourceRecord(
        title=title[:250],
        text=full_text[:10000],
        url=url,
        registry=registry,
        label=(label or title)[:255],
        metadata={
            "document_format": "pdf",
            "pages_parsed": min(len(reader.pages), max_pages),
            "total_pages": len(reader.pages),
        },
    )


def _first_elem(node: ET.Element, *tags: str) -> ET.Element | None:
    for tag in tags:
        found = node.find(tag)
        if found is not None:
            return found
    return None


def _reconstruct_openalex_abstract(inverted_index: dict[str, list[int]] | None) -> str:
    if not isinstance(inverted_index, dict) or not inverted_index:
        return ""
    positions: dict[int, str] = {}
    for word, idxs in inverted_index.items():
        if not isinstance(idxs, list):
            continue
        for idx in idxs:
            if isinstance(idx, int):
                positions[idx] = str(word)
    if not positions:
        return ""
    return " ".join(positions[i] for i in sorted(positions))


def _parse_cordis_hits(
    payload: dict[str, Any],
    *,
    base_url: str,
    registry: str,
    label: str,
    max_records: int,
) -> list[RawSourceRecord]:
    hits_container = payload.get("hits")
    if not isinstance(hits_container, dict):
        return []
    hits = hits_container.get("hit") or []
    if isinstance(hits, dict):
        hits = [hits]
    records: list[RawSourceRecord] = []
    for hit in hits[:max_records]:
        if not isinstance(hit, dict):
            continue
        proj = hit.get("project") if isinstance(hit.get("project"), dict) else hit
        proj_id = str(proj.get("id") or "").strip()
        acronym = str(proj.get("acronym") or "").strip()
        raw_title = str(proj.get("title") or label).strip()
        title = f"{acronym} — {raw_title}" if acronym and acronym not in raw_title else raw_title
        teaser = str(proj.get("teaser") or "").strip()
        objective = str(proj.get("objective") or "").strip()
        text = _strip_html(f"{teaser} {objective}".strip()) or title
        proj_url = f"https://cordis.europa.eu/project/id/{proj_id}" if proj_id else base_url
        records.append(
            RawSourceRecord(
                title=title[:250],
                text=text[:8000],
                url=proj_url,
                registry=registry or "CORDIS",
                label=(f"CORDIS {acronym}" if acronym else title)[:120],
                metadata={
                    "cordis_id": proj_id,
                    "acronym": acronym,
                    "status": proj.get("status", ""),
                    "start_date": proj.get("startDate", ""),
                    "end_date": proj.get("endDate", ""),
                },
            )
        )
    return records


def _parse_json_api_items(
    payload: Any,
    *,
    base_url: str,
    registry: str,
    label: str,
    max_records: int,
) -> list[RawSourceRecord]:
    if isinstance(payload, dict) and isinstance(payload.get("hits"), dict):
        return _parse_cordis_hits(
            payload,
            base_url=base_url,
            registry=registry,
            label=label,
            max_records=max_records,
        )

    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        if payload.get("error") or payload.get("errors"):
            raise ValueError(f"API zwróciło błąd: {payload.get('error') or payload['errors']}")
        items = next(
            (payload[key] for key in ("items", "results", "data") if key in payload), [payload]
        )
        if isinstance(items, dict):
            items = [items]
    else:
        return []

    records: list[RawSourceRecord] = []
    for item in items[:max_records]:
        if not isinstance(item, dict):
            continue

        # Dane.gov.pl JSON:API shape
        attrs = item.get("attributes") if isinstance(item.get("attributes"), dict) else None
        if attrs is not None:
            item_title = str(attrs.get("title") or label).strip()
            item_text = _strip_html(
                str(attrs.get("notes") or attrs.get("description") or item_title)
            )
            links = item.get("links") if isinstance(item.get("links"), dict) else {}
            item_url = str(links.get("self") or attrs.get("url") or base_url)
            records.append(
                RawSourceRecord(
                    title=item_title[:250],
                    text=item_text[:8000] or item_title,
                    url=item_url,
                    registry=registry,
                    label=item_title[:120] or label,
                    organization_name=str(attrs.get("institution_title") or ""),
                    metadata={"source_id": item.get("id", "")},
                )
            )
            continue

        # OpenAlex work shape
        if "abstract_inverted_index" in item or "authorships" in item:
            item_title = str(item.get("title") or item.get("display_name") or label).strip()
            abstract = _reconstruct_openalex_abstract(item.get("abstract_inverted_index"))
            primary_loc = (
                item.get("primary_location")
                if isinstance(item.get("primary_location"), dict)
                else {}
            )
            item_url = str(
                primary_loc.get("landing_page_url") or item.get("doi") or item.get("id") or base_url
            )
            org_name = ""
            authorships = item.get("authorships") or []
            if isinstance(authorships, list) and authorships:
                first_auth = authorships[0] if isinstance(authorships[0], dict) else {}
                insts = first_auth.get("institutions") or []
                if isinstance(insts, list) and insts and isinstance(insts[0], dict):
                    org_name = str(insts[0].get("display_name") or "")
            records.append(
                RawSourceRecord(
                    title=item_title[:250],
                    text=(abstract or item_title)[:8000],
                    url=item_url,
                    registry=registry,
                    label=item_title[:120] or label,
                    organization_name=org_name,
                    metadata={
                        "publication_year": item.get("publication_year"),
                        "doi": item.get("doi") or "",
                    },
                )
            )
            continue

        item_title = str(item.get("title") or item.get("name") or label).strip()
        item_text = _strip_html(
            str(
                item.get("description")
                or item.get("summary")
                or item.get("abstract")
                or item.get("text")
                or item_title
            )
        )
        org_val = str(item.get("organization") or item.get("organization_name") or "")
        meta_val = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
        records.append(
            RawSourceRecord(
                title=item_title[:250],
                text=(item_text or item_title)[:8000],
                url=str(item.get("url") or base_url),
                registry=registry,
                label=str(item.get("label") or item_title[:120] or label),
                organization_name=org_val,
                metadata=meta_val,
            )
        )
    return records


def _parse_oai_pmh_records(
    root: ET.Element,
    *,
    base_url: str,
    registry: str,
    label: str,
    max_records: int,
) -> list[RawSourceRecord]:
    oai_ns = "{http://www.openarchives.org/OAI/2.0/}"
    dc_ns = "{http://purl.org/dc/elements/1.1/}"

    records: list[RawSourceRecord] = []
    oai_nodes = root.findall(f".//{oai_ns}record") or root.findall(".//record")
    for node in oai_nodes:
        header = node.find(f"{oai_ns}header")
        if header is None:
            header = node.find("header")
        if header is not None and header.attrib.get("status") == "deleted":
            continue

        titles = [
            re.sub(r"\s+", " ", (el.text or "")).strip()
            for el in node.findall(f".//{dc_ns}title")
            if (el.text or "").strip()
        ]
        descs = [
            _strip_html(el.text or "")
            for el in node.findall(f".//{dc_ns}description")
            if (el.text or "").strip()
        ]
        subjects = [
            re.sub(r"\s+", " ", (el.text or "")).strip()
            for el in node.findall(f".//{dc_ns}subject")
            if (el.text or "").strip()
        ]
        creators = [
            re.sub(r"\s+", " ", (el.text or "")).strip()
            for el in (node.findall(f".//{dc_ns}publisher") + node.findall(f".//{dc_ns}creator"))
            if (el.text or "").strip()
        ]
        identifiers = [
            (el.text or "").strip()
            for el in node.findall(f".//{dc_ns}identifier")
            if (el.text or "").strip()
        ]

        item_title = titles[0] if titles else label
        item_url = next((i for i in identifiers if i.startswith(("http://", "https://"))), base_url)
        body_parts = descs or ([f"Tematyka: {', '.join(subjects[:8])}."] if subjects else [])
        item_text = " ".join(body_parts).strip() or item_title

        records.append(
            RawSourceRecord(
                title=item_title[:250],
                text=item_text[:8000],
                url=item_url,
                registry=registry,
                label=item_title[:120] or label,
                organization_name=creators[0][:250] if creators else "",
                metadata={"oai_subjects": subjects[:8]},
            )
        )
        if len(records) >= max_records:
            break
    return records


def parse_api_payload(
    raw_bytes: bytes,
    *,
    content_type: str,
    base_url: str,
    registry: str,
    label: str,
    max_records: int = 10,
) -> list[RawSourceRecord]:
    text = raw_bytes.decode("utf-8", errors="replace").strip()
    if not text:
        return []
    _assert_not_antibot(text)

    if "json" in content_type.lower() or text.startswith(("{", "[")):
        payload = json.loads(text)
        return _parse_json_api_items(
            payload,
            base_url=base_url,
            registry=registry,
            label=label,
            max_records=max_records,
        )

    lowered = text.lower()
    if text.startswith("<") and ("<oai-pmh" in lowered or "openarchives.org/oai/" in lowered):
        root = ET.fromstring(text)
        error = root.find("{http://www.openarchives.org/OAI/2.0/}error")
        if error is not None:
            if error.attrib.get("code") == "noRecordsMatch":
                return []
            raise ValueError(f"OAI-PMH {error.attrib.get('code', '')}: {error.text or ''}")
        return _parse_oai_pmh_records(
            root,
            base_url=base_url,
            registry=registry,
            label=label,
            max_records=max_records,
        )

    if text.startswith("<") and ("<rss" in lowered or "<feed" in lowered):
        root = ET.fromstring(text)
        records: list[RawSourceRecord] = []
        atom_ns = "{http://www.w3.org/2005/Atom}"
        nodes = root.findall(".//item") + root.findall(f".//{atom_ns}entry")
        for node in nodes[:max_records]:
            t_node = _first_elem(node, "title", f"{atom_ns}title")
            d_node = _first_elem(
                node,
                "description",
                f"{atom_ns}summary",
                f"{atom_ns}content",
            )
            l_node = _first_elem(node, "link", f"{atom_ns}link")
            link = base_url
            if l_node is not None:
                link = (l_node.text or l_node.attrib.get("href") or base_url).strip()
            item_title = _strip_html(t_node.text or label) if t_node is not None else label
            item_text = (
                _strip_html(d_node.text or item_title) if d_node is not None else item_title
            )
            records.append(
                RawSourceRecord(
                    title=(item_title or label)[:250],
                    text=(item_text or item_title or label)[:8000],
                    url=link,
                    registry=registry,
                    label=(item_title or label)[:120],
                )
            )
        return records

    return [parse_html_document(text, url=base_url, registry=registry, label=label)]


def _download(url: str, timeout: int = 15) -> tuple[bytes, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Praktoteka-Radar/1.0 (+https://pcinn.org)",
            "Accept": (
                "application/json, application/xml, text/xml, "
                "application/pdf, text/html, */*"
            ),
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read(), resp.headers.get("Content-Type", "")


def fetch_feed_records(
    *,
    url: str,
    method: str,
    registry: str,
    label: str,
    timeout: int = 15,
    max_records: int = 10,
) -> list[RawSourceRecord]:
    """Fetch live records from a public API, RSS/OAI-PMH feed, HTML page, or PDF."""
    raw_bytes, content_type = _download(url, timeout)

    ct_l = content_type.lower()
    method_l = method.lower()
    is_pdf = (
        "application/pdf" in ct_l
        or method_l == "pdf"
        or urlparse(url).path.lower().endswith(".pdf")
        or raw_bytes[:5] == b"%PDF-"
    )
    if is_pdf:
        return [
            parse_pdf_document(
                raw_bytes,
                url=url,
                registry=registry,
                label=label,
            )
        ]

    if (
        "api" in method_l
        or "rss" in method_l
        or "oai" in method_l
        or "json" in ct_l
        or "xml" in ct_l
        or "rss" in ct_l
        or "atom" in ct_l
    ):
        return parse_api_payload(
            raw_bytes,
            content_type=content_type,
            base_url=url,
            registry=registry,
            label=label,
            max_records=max_records,
        )

    decoded = raw_bytes.decode("utf-8", errors="replace")
    stripped = decoded.lstrip()
    if stripped.startswith(("{", "[", "<?xml", "<rss", "<feed", "<OAI-PMH")):
        return parse_api_payload(
            raw_bytes,
            content_type=content_type,
            base_url=url,
            registry=registry,
            label=label,
            max_records=max_records,
        )

    if "<html" in decoded.lower() or "html" in ct_l:
        return [parse_html_document(decoded, url=url, registry=registry, label=label)]

    _assert_not_antibot(decoded)
    return [
        RawSourceRecord(
            title=label[:250],
            text=re.sub(r"\s+", " ", decoded).strip()[:8000] or label,
            url=url,
            registry=registry,
            label=label,
        )
    ]


@dataclass
class FeedBatch:
    records: list[RawSourceRecord]
    next_state: dict[str, Any]


def _query_url(url: str, **updates: Any) -> str:
    parts = urlparse(url)
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.update({key: str(value) for key, value in updates.items()})
    return urlunparse(parts._replace(query=urlencode(query)))


def fetch_feed_batch(
    *, url: str, method: str, registry: str, label: str,
    max_records: int = 10, state: dict[str, Any] | None = None,
) -> FeedBatch:
    """Fetch a bounded live batch; persist offsets/tokens and revisit the head every 5 batches."""
    signature = hashlib.sha256(f"{method}|{url}|{max_records}".encode()).hexdigest()
    current = dict(state or {})
    if current.get("signature") != signature:
        current = {}
    revisit_head = current.get("batches", 0) >= 5
    current_url = url if revisit_head else current.get("url", url)
    offset = 0 if revisit_head else int(current.get("offset", 0))
    base_host = urlparse(url).hostname or ""
    is_cordis = base_host == "cordis.europa.eu"
    is_openalex = base_host == "api.openalex.org"
    if is_cordis:
        current_url = _query_url(current_url, num=max_records)
    elif is_openalex:
        parts = urlparse(current_url)
        query = dict(parse_qsl(parts.query))
        query.pop("per-page", None)
        query["per_page"] = str(max_records)
        current_url = urlunparse(parts._replace(query=urlencode(query)))

    raw, content_type = _download(current_url)
    if "pdf" in content_type.lower() or raw.startswith(b"%PDF-"):
        return FeedBatch([parse_pdf_document(raw, url=url, registry=registry, label=label)], {})
    try:
        records = parse_api_payload(
            raw, content_type=content_type, base_url=current_url,
            registry=registry, label=label, max_records=offset + max_records + 1,
        )
    except ValueError as exc:
        if "badResumptionToken" not in str(exc) or current_url == url:
            raise
        # Expired OAI tokens are restarted through the normal public endpoint.
        raw, content_type = _download(url)
        current_url, offset = url, 0
        records = parse_api_payload(
            raw, content_type=content_type, base_url=url,
            registry=registry, label=label, max_records=max_records + 1,
        )

    batch = records[offset:offset + max_records]
    if revisit_head:
        return FeedBatch(batch, {**current, "batches": 0})
    next_state: dict[str, Any] = {
        "signature": signature, "batches": int(current.get("batches", 0)) + 1,
    }
    if is_cordis or is_openalex:
        params = dict(parse_qsl(urlparse(current_url).query))
        key = "p" if is_cordis else "page"
        page = int(params.get(key, 1))
        if len(batch) == max_records and (not is_openalex or (page + 1) * max_records <= 10000):
            next_state["url"] = _query_url(current_url, **{key: page + 1})
        else:
            next_state = {}
    elif len(records) > offset + max_records:
        next_state.update(url=current_url, offset=offset + max_records)
    elif "oai" in method.lower():
        root = ET.fromstring(raw)
        token = root.find(".//{http://www.openarchives.org/OAI/2.0/}resumptionToken")
        if token is not None and (token.text or "").strip():
            # OAI requires resumptionToken to be exclusive of metadataPrefix/set/from/until.
            parts = urlparse(url)
            query = urlencode({"verb": "ListRecords", "resumptionToken": token.text.strip()})
            next_state.update(url=urlunparse(parts._replace(query=query)), offset=0)
        else:
            next_state = {}
    else:
        next_state = {}
    return FeedBatch(batch, next_state)
