"""Source adapters for APIs (JSON/RSS/OAI-PMH), HTML pages, and documents."""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from html.parser import HTMLParser
from typing import Any


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


def parse_html_document(
    html_content: str,
    *,
    url: str,
    registry: str,
    label: str,
) -> RawSourceRecord:
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


def _first_elem(node: ET.Element, *tags: str) -> ET.Element | None:
    for tag in tags:
        found = node.find(tag)
        if found is not None:
            return found
    return None


def parse_api_payload(
    raw_bytes: bytes,
    *,
    content_type: str,
    base_url: str,
    registry: str,
    label: str,
) -> list[RawSourceRecord]:
    text = raw_bytes.decode("utf-8", errors="replace").strip()
    if not text:
        return []

    if "json" in content_type.lower() or text.startswith(("{", "[")):
        payload = json.loads(text)
        items = (
            payload
            if isinstance(payload, list)
            else payload.get("items") or payload.get("results") or [payload]
        )
        records: list[RawSourceRecord] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            item_title = str(item.get("title") or item.get("name") or label).strip()
            item_text = str(
                item.get("description")
                or item.get("summary")
                or item.get("abstract")
                or item.get("text")
                or item_title
            ).strip()
            org_val = str(item.get("organization") or item.get("organization_name") or "")
            meta_val = item.get("metadata") if isinstance(item.get("metadata"), dict) else {}
            records.append(
                RawSourceRecord(
                    title=item_title[:250],
                    text=item_text[:8000],
                    url=str(item.get("url") or base_url),
                    registry=registry,
                    label=str(item.get("label") or item_title[:120] or label),
                    organization_name=org_val,
                    metadata=meta_val,
                )
            )
        return records

    lowered = text.lower()
    if text.startswith("<") and ("<rss" in lowered or "<feed" in lowered or "<oai-pmh" in lowered):
        root = ET.fromstring(text)
        records = []
        for node in root.findall(".//item") + root.findall(".//{http://www.w3.org/2005/Atom}entry"):
            t_node = _first_elem(node, "title", "{http://www.w3.org/2005/Atom}title")
            d_node = _first_elem(
                node,
                "description",
                "{http://www.w3.org/2005/Atom}summary",
                "{http://www.w3.org/2005/Atom}content",
            )
            l_node = _first_elem(node, "link", "{http://www.w3.org/2005/Atom}link")
            link = base_url
            if l_node is not None:
                link = (l_node.text or l_node.attrib.get("href") or base_url).strip()
            item_title = (t_node.text or label).strip() if t_node is not None else label
            item_text = (d_node.text or item_title).strip() if d_node is not None else item_title
            records.append(
                RawSourceRecord(
                    title=item_title[:250],
                    text=item_text[:8000],
                    url=link,
                    registry=registry,
                    label=item_title[:120],
                )
            )
        return records

    return [parse_html_document(text, url=base_url, registry=registry, label=label)]


def fetch_feed_records(
    *,
    url: str,
    method: str,
    registry: str,
    label: str,
    timeout: int = 10,
) -> list[RawSourceRecord]:
    """Fetch live records from a configured public API, HTML page, or document URL."""
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Praktoteka-Radar/1.0 (+https://pcinn.org)"},
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw_bytes = resp.read()
        content_type = resp.headers.get("Content-Type", "")

    method_l = method.lower()
    if "api" in method_l or "json" in content_type.lower() or "xml" in content_type.lower():
        return parse_api_payload(
            raw_bytes,
            content_type=content_type,
            base_url=url,
            registry=registry,
            label=label,
        )

    decoded = raw_bytes.decode("utf-8", errors="replace")
    if "<html" in decoded.lower() or "html" in content_type.lower():
        return [parse_html_document(decoded, url=url, registry=registry, label=label)]

    return [
        RawSourceRecord(
            title=label[:250],
            text=re.sub(r"\s+", " ", decoded).strip()[:8000] or label,
            url=url,
            registry=registry,
            label=label,
        )
    ]
