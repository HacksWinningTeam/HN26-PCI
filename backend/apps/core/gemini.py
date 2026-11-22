"""Shared REST client for Google Gemini Developer API and Vertex AI Express endpoints."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any

from django.conf import settings

logger = logging.getLogger(__name__)


def _build_candidate_requests(
    api_key: str,
    model: str,
    project: str,
    location: str,
) -> list[tuple[str, dict[str, str]]]:
    """Return ordered (url, headers) candidates for AI Studio (AIza) and Vertex (AQ.) keys."""
    base_headers = {"Content-Type": "application/json"}
    candidates: list[tuple[str, dict[str, str]]] = []

    if api_key.startswith("AQ."):
        if project:
            candidates.append(
                (
                    f"https://aiplatform.googleapis.com/v1/projects/{project}"
                    f"/locations/{location}/publishers/google/models/{model}:generateContent",
                    {**base_headers, "x-goog-api-key": api_key, "x-goog-user-project": project},
                )
            )
        candidates.append(
            (
                f"https://aiplatform.googleapis.com/v1/publishers/google/models/{model}"
                ":generateContent",
                {**base_headers, "x-goog-api-key": api_key},
            )
        )

    candidates.append(
        (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
            f":generateContent?key={api_key}",
            base_headers,
        )
    )
    return candidates


def call_gemini_json(prompt: str, *, temperature: float = 0.2) -> dict[str, Any] | list[Any] | None:
    """Invoke Gemini requesting JSON output; return parsed JSON or None on error/missing key."""
    api_key = getattr(settings, "GEMINI_API_KEY", "").strip()
    if not api_key:
        return None

    model = getattr(settings, "GEMINI_MODEL", "gemini-3.8-flash").strip() or "gemini-3.8-flash"
    timeout = int(getattr(settings, "GEMINI_TIMEOUT_SECONDS", 45) or 45)
    project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "").strip()
    location = getattr(settings, "GOOGLE_CLOUD_LOCATION", "global").strip() or "global"

    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "responseMimeType": "application/json",
            },
        }
    ).encode("utf-8")

    for url, headers in _build_candidate_requests(api_key, model, project, location):
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw_body = resp.read().decode("utf-8")
            data = json.loads(raw_body)
            parts = data["candidates"][0]["content"]["parts"]
            text = next(
                (p["text"] for p in reversed(parts) if isinstance(p, dict) and p.get("text")),
                "",
            )
            parsed = json.loads(text)
            if isinstance(parsed, (dict, list)):
                return parsed
            return None
        except urllib.error.HTTPError as exc:
            err_body = exc.read().decode("utf-8", errors="replace")[:300]
            logger.warning("Gemini endpoint HTTP %s: %s", exc.code, err_body)
        except (
            urllib.error.URLError,
            TimeoutError,
            KeyError,
            IndexError,
            json.JSONDecodeError,
        ) as exc:
            logger.warning("Gemini request failed: %s", exc)
            break

    return None
