"""Extraction and classification service with Gemini API and deterministic rule fallback."""

from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from django.conf import settings

from apps.core.gemini import call_gemini_json

logger = logging.getLogger(__name__)

ALLOWED_PRIMARY_AREAS = {"technological", "educational", "administrative"}
ALLOWED_CHARACTERS = {"product", "process", "organizational", "social"}
ALLOWED_SECTORS = {
    "administracja",
    "edukacja",
    "zdrowie_jakosc_zycia",
    "ICT",
    "lotnictwo",
    "motoryzacja",
    "sektor_kosmiczny",
}
ALLOWED_BENEFICIARIES = {
    "children_0_12",
    "youth_13_18",
    "young_adults_19_26",
    "adults_27_59",
    "seniors_60_plus",
    "families_parents",
    "disabilities_special_needs",
    "ill_needing_care",
    "mental_crisis",
    "difficult_life_situation",
    "social_digital_exclusion",
    "students_teachers",
    "workers_jobseekers",
    "entrepreneurs_startups",
    "public_orgs_communities",
}
ALLOWED_DEPLOYMENT_LEVELS = {"concept", "prototype", "tests", "pilot", "deployed"}
ALLOWED_ORG_TYPES = {
    "public_institution",
    "school",
    "university",
    "social_org",
    "company",
    "startup",
    "other",
}
ALLOWED_RADAR_USERS = {
    "investors_commercial",
    "public_institutions",
    "universities_science",
    "schools_education",
    "startups_enterprises",
    "individual_innovators",
}

_AREA_KEYWORDS: dict[str, tuple[str, ...]] = {
    "educational": ("szkol", "uczni", "student", "nauczyciel", "edukac", "dydakty", "lekcj"),
    "administrative": ("gmin", "urzad", "urzed", "samorzad", "administrac", "wniosk", "jst"),
    "technological": ("czujnik", "ai", "satelit", "system", "skaner", "algorytm", "prototyp"),
}

_SECTOR_KEYWORDS: dict[str, tuple[str, ...]] = {
    "administracja": ("gmin", "urzad", "urzed", "samorzad", "administrac", "jst", "soltys"),
    "edukacja": ("szkol", "uczni", "student", "nauczyciel", "edukac", "dydakty"),
    "zdrowie_jakosc_zycia": ("zdrow", "pacjent", "psycholog", "szpital", "biofilm", "opiek"),
    "ICT": ("cyfrow", "aplikac", "chmur", "dane", "ai", "ml", "lorawan", "iot", "gis"),
    "lotnictwo": ("lotnic", "samolot", "kompozyt", "easa", "ndt"),
    "motoryzacja": ("motoryzac", "pojazd", "aut", "transport"),
    "sektor_kosmiczny": ("satelit", "kosmic", "copernicus", "sentinel", "orbita"),
}

_BENEFICIARY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "children_0_12": ("dziec", "podstawow"),
    "youth_13_18": ("mlodziez", "lice"),
    "seniors_60_plus": ("senior", "starsz", "60+"),
    "families_parents": ("rodzin", "rodzic", "opiekun"),
    "disabilities_special_needs": ("niepelnosprawn", "szczegoln potrzeb", "wcag"),
    "ill_needing_care": ("chor", "pacjent", "szpital"),
    "mental_crisis": ("psychiczn", "kryzys", "stygmatyz"),
    "social_digital_exclusion": ("wykluczen", "cyfrow"),
    "students_teachers": ("uczni", "student", "nauczyciel"),
    "workers_jobseekers": ("pracown", "bezrobot"),
    "entrepreneurs_startups": ("przedsiebiorc", "startup", "firma", "mro"),
    "public_orgs_communities": ("gmin", "urzad", "samorzad", "spoleczn", "osp", "solectw"),
}

_VOIVODESHIPS_OR_CITIES = (
    "Rzeszów",
    "Krosno",
    "Stalowa Wola",
    "Gdynia",
    "Gdańsk",
    "Kraków",
    "Warszawa",
    "Wrocław",
    "Poznań",
    "Katowice",
    "Lublin",
    "Łódź",
    "Szczecin",
    "Podkarpackie",
    "Pomorskie",
    "Małopolska",
    "Śląskie",
    "Mazowieckie",
)


def _norm(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "")).strip()


def _detect_deployment_and_trl(norm_text: str) -> tuple[str, int | None, list[str]]:
    trl = None
    m = re.search(r"\btrl[\s:-]*([1-9])\b", norm_text)
    if m:
        trl = int(m.group(1))

    evidences: list[str] = []
    if any(k in norm_text for k in ("wdrozon", "produkcyjn", "stosowan", "w praktyce")):
        level = "deployed"
        evidences.append("Wykryto wzmiankę o stosowaniu rozwiązania w praktyce.")
    elif any(k in norm_text for k in ("pilotaz", "pilot")):
        level = "pilot"
        evidences.append("Wykryto informację o przeprowadzonym lub trwającym pilotażu.")
    elif any(k in norm_text for k in ("test", "przebad", "walidac")):
        level = "tests"
        evidences.append("Wykryto informację o testach lub walidacji.")
    elif any(k in norm_text for k in ("prototyp", "mvp", "demo")):
        level = "prototype"
        evidences.append("Wykryto opis prototypu.")
    else:
        level = "concept"

    if trl is None and level == "deployed":
        trl = 8
    elif trl is None and level == "pilot":
        trl = 6
    elif trl is None and level == "prototype":
        trl = 4

    return level, trl, evidences


def _rule_based_extract(
    raw_text: str,
    *,
    title_hint: str = "",
    organization_hint: str = "",
    source_registry: str = "",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    meta = metadata or {}
    clean_text = normalize_whitespace(raw_text)
    norm_text = _norm(f"{title_hint} {clean_text}")

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", clean_text) if s.strip()]
    fallback_title = sentences[0][:120] if sentences else "Nowa innowacja"
    title = normalize_whitespace(title_hint or fallback_title)
    short_summary = normalize_whitespace(" ".join(sentences[:2])[:420] or title)

    problem = ""
    solution = ""
    for s in sentences:
        ns = _norm(s)
        if not problem and any(k in ns for k in ("problem", "wyzwani", "trudno", "brak", "opozn")):
            problem = s
        elif not solution and any(
            k in ns for k in ("rozwiaz", "system", "aplikac", "narzedzi", "umozliw", "algorytm")
        ):
            solution = s
    if not problem:
        problem = short_summary
    if not solution:
        solution = clean_text[:600] or short_summary

    # Primary area
    area_hits = {
        area: sum(1 for kw in kws if kw in norm_text) for area, kws in _AREA_KEYWORDS.items()
    }
    primary_area = max(area_hits, key=lambda k: area_hits[k])
    if area_hits[primary_area] == 0:
        primary_area = "technological"

    # Character tags
    characters: list[str] = []
    if any(k in norm_text for k in ("aplikac", "czujnik", "urzadzen", "skaner", "platform")):
        characters.append("product")
    if any(k in norm_text for k in ("proces", "procedur", "automat", "obieg", "metod")):
        characters.append("process")
    if any(k in norm_text for k in ("organizac", "urzad", "szkol", "jednost")):
        characters.append("organizational")
    if any(k in norm_text for k in ("spolecz", "senior", "mlodziez", "wyklucz", "pomoc")):
        characters.append("social")
    if not characters:
        characters = ["product"]

    # Sectors & beneficiaries
    sectors = [sec for sec, kws in _SECTOR_KEYWORDS.items() if any(kw in norm_text for kw in kws)]
    if not sectors:
        sectors = ["ICT"] if primary_area == "technological" else ["administracja"]

    beneficiaries = [
        ben for ben, kws in _BENEFICIARY_KEYWORDS.items() if any(kw in norm_text for kw in kws)
    ]
    if not beneficiaries:
        beneficiaries = ["public_orgs_communities"]

    # Organization & type
    org_name = normalize_whitespace(
        organization_hint or str(meta.get("organization_name") or "Organizacja ze źródła")
    )
    norm_org = _norm(org_name)
    if any(k in norm_org for k in ("politechnika", "uniwersytet", "uczelnia", "pan", "instytut")):
        org_type = "university"
    elif any(k in norm_org for k in ("szkola", "liceum", "technikum", "przedszkole")):
        org_type = "school"
    elif any(k in norm_org for k in ("gmina", "urzad", "miasto", "powiat", "samorzad")):
        org_type = "public_institution"
    elif any(k in norm_org for k in ("fundacja", "stowarzyszenie")):
        org_type = "social_org"
    elif "startup" in norm_org:
        org_type = "startup"
    elif any(k in norm_org for k in ("sp.", "s.a.", "firma")):
        org_type = "company"
    else:
        org_type = "other"

    location = normalize_whitespace(str(meta.get("origin_location") or ""))
    if not location:
        for city in _VOIVODESHIPS_OR_CITIES:
            if _norm(city) in norm_text or _norm(city) in norm_org:
                location = city
                break
    if not location:
        location = "Polska (lokalizacja do potwierdzenia)"

    deployment_level, trl, proof_notes = _detect_deployment_and_trl(norm_text)

    if any(k in norm_text for k in ("udzielon patent", "patent nr")):
        patent_status = "patent_granted"
    elif any(k in norm_text for k in ("uprp", "epo", "zgloszenie patent", "patentow")):
        patent_status = "application_filed"
    else:
        patent_status = "none"

    missing_info: list[str] = []
    if location.startswith("Polska ("):
        missing_info.append("Brak dokładnej lokalizacji pochodzenia")
    if primary_area == "technological" and trl is None:
        missing_info.append("Brak określonego poziomu TRL")
    if deployment_level == "concept":
        missing_info.append("Brak udokumentowanego prototypu lub pilotażu")
    if not meta.get("contact_info"):
        missing_info.append("Brak zweryfikowanych danych kontaktowych")

    provenance = {
        "primary_area": "source" if meta.get("primary_area") else "rule_based",
        "innovation_character": "rule_based",
        "sectors": "source" if meta.get("sectors") else "rule_based",
        "beneficiary_groups": "rule_based",
        "trl": "source" if meta.get("trl") else "rule_based",
        "deployment_level": "source" if meta.get("deployment_level") else "rule_based",
    }

    target_org_types = ["public_institution", "company"]
    if primary_area == "educational":
        target_org_types = ["school", "university", "public_institution"]

    radar_users = ["public_institutions", "startups_enterprises"]
    if org_type == "university":
        radar_users.append("universities_science")
    if primary_area == "educational":
        radar_users.append("schools_education")

    evidences: list[dict[str, str]] = []
    lim_note = f"Wyekstrahowano regułowo ze źródła {source_registry or 'publicznego'}."
    for note in proof_notes:
        evidences.append(
            {
                "kind": "source_declaration",
                "text_pl": note,
                "text_en": note,
                "confidence": "medium",
                "limitation_note": lim_note,
            }
        )
    if missing_info:
        evidences.append(
            {
                "kind": "missing_info",
                "text_pl": "; ".join(missing_info),
                "text_en": "; ".join(missing_info),
                "confidence": "",
                "limitation_note": "",
            }
        )

    return {
        "title_pl": meta.get("title_pl") or title,
        "title_en": meta.get("title_en") or title,
        "short_summary_pl": meta.get("short_summary_pl") or short_summary,
        "short_summary_en": meta.get("short_summary_en") or short_summary,
        "problem_pl": meta.get("problem_pl") or problem,
        "problem_en": meta.get("problem_en") or problem,
        "solution_pl": meta.get("solution_pl") or solution,
        "solution_en": meta.get("solution_en") or solution,
        "primary_area": meta.get("primary_area") or primary_area,
        "innovation_character": meta.get("innovation_character") or characters,
        "sectors": meta.get("sectors") or sectors,
        "beneficiary_groups": meta.get("beneficiary_groups") or beneficiaries,
        "target_org_types": meta.get("target_org_types") or target_org_types,
        "tags": meta.get("tags") or sectors[:3],
        "organization_name": org_name,
        "organization_type": meta.get("organization_type") or org_type,
        "origin_location": location,
        "deployment_level": meta.get("deployment_level") or deployment_level,
        "trl": meta.get("trl") if meta.get("trl") is not None else trl,
        "patent_status": meta.get("patent_status") or patent_status,
        "radar_user_types": meta.get("radar_user_types") or radar_users,
        "oslo_compliant": True,
        "oslo_assessment": {
            "compliant": True,
            "novelty": (
                "Rozwiązanie wykazuje cechy nowego lub ulepszonego podejścia "
                "w analizowanym obszarze."
            ),
            "implementation_or_availability": f"Poziom wdrożenia: {deployment_level}.",
            "value_rationale": short_summary,
        },
        "classification_provenance": provenance,
        "missing_info": missing_info,
        "conflicting_info": list(meta.get("conflicting_info") or []),
        "evidences": evidences,
        "is_incomplete": len(missing_info) >= 2,
        "ai_used": False,
    }


def _call_gemini_structured(prompt: str) -> dict[str, Any] | None:
    """Invoke Gemini requesting structured JSON output."""
    parsed = call_gemini_json(prompt, temperature=0.2)
    return parsed if isinstance(parsed, dict) else None


def extract_and_classify_innovation(
    raw_text: str,
    *,
    title_hint: str = "",
    organization_hint: str = "",
    source_registry: str = "",
    url: str = "",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Extract standardized innovation fields using rules and optional Gemini enrichment."""
    baseline = _rule_based_extract(
        raw_text,
        title_hint=title_hint,
        organization_hint=organization_hint,
        source_registry=source_registry,
        metadata=metadata,
    )

    if not getattr(settings, "GEMINI_API_KEY", "").strip():
        return baseline

    prompt = (
        "Przeanalizuj poniższy opis polskiej innowacji wyłącznie na podstawie podanego tekstu. "
        "Nie zmyślaj faktów ani danych kontaktowych. Zwróć JSON z kluczami: "
        "short_summary_pl, problem_pl, solution_pl, primary_area "
        "(technological|educational|administrative), innovation_character (lista z: "
        "product,process,organizational,social), sectors (lista z: administracja,edukacja,"
        "zdrowie_jakosc_zycia,ICT,lotnictwo,motoryzacja,sektor_kosmiczny), "
        "beneficiary_groups (lista kluczy: seniors_60_plus,children_0_12,youth_13_18,"
        "students_teachers,disabilities_special_needs,public_orgs_communities,"
        "entrepreneurs_startups,ill_needing_care,mental_crisis,families_parents), "
        "deployment_level (concept|prototype|tests|pilot|deployed), trl (int 1-9 lub null), "
        "missing_info (lista braków), oslo_novelty (krótkie zdanie).\n\n"
        f"Źródło: {source_registry} ({url})\nTytuł roboczy: {title_hint}\nTreść:\n{raw_text[:4000]}"
    )
    ai_data = _call_gemini_structured(prompt)
    if not ai_data:
        return baseline

    provenance = dict(baseline["classification_provenance"])
    for text_field in ("short_summary_pl", "problem_pl", "solution_pl"):
        val = ai_data.get(text_field)
        if isinstance(val, str) and val.strip():
            baseline[text_field] = normalize_whitespace(val)

    if (
        ai_data.get("primary_area") in ALLOWED_PRIMARY_AREAS
        and provenance["primary_area"] != "source"
    ):
        baseline["primary_area"] = ai_data["primary_area"]
        provenance["primary_area"] = "ai_suggested"

    ai_chars = [c for c in (ai_data.get("innovation_character") or []) if c in ALLOWED_CHARACTERS]
    if ai_chars:
        baseline["innovation_character"] = ai_chars
        provenance["innovation_character"] = "ai_suggested"

    ai_sectors = [s for s in (ai_data.get("sectors") or []) if s in ALLOWED_SECTORS]
    if ai_sectors and provenance["sectors"] != "source":
        baseline["sectors"] = ai_sectors
        provenance["sectors"] = "ai_suggested"

    ai_bens = [b for b in (ai_data.get("beneficiary_groups") or []) if b in ALLOWED_BENEFICIARIES]
    if ai_bens:
        baseline["beneficiary_groups"] = ai_bens
        provenance["beneficiary_groups"] = "ai_suggested"

    if (
        ai_data.get("deployment_level") in ALLOWED_DEPLOYMENT_LEVELS
        and provenance["deployment_level"] != "source"
    ):
        baseline["deployment_level"] = ai_data["deployment_level"]
        provenance["deployment_level"] = "ai_suggested"

    ai_trl = ai_data.get("trl")
    if isinstance(ai_trl, int) and 1 <= ai_trl <= 9 and provenance["trl"] != "source":
        baseline["trl"] = ai_trl
        provenance["trl"] = "ai_suggested"

    if isinstance(ai_data.get("oslo_novelty"), str) and ai_data["oslo_novelty"].strip():
        baseline["oslo_assessment"]["novelty"] = normalize_whitespace(ai_data["oslo_novelty"])

    if isinstance(ai_data.get("missing_info"), list):
        merged_missing = list(
            dict.fromkeys(
                [str(x) for x in baseline["missing_info"]]
                + [normalize_whitespace(str(x)) for x in ai_data["missing_info"] if str(x).strip()]
            )
        )
        baseline["missing_info"] = merged_missing
        baseline["is_incomplete"] = len(merged_missing) >= 2

    baseline["classification_provenance"] = provenance
    baseline["ai_used"] = True
    baseline["evidences"].append(
        {
            "kind": "ai_estimate",
            "text_pl": "Streszczenie i klasyfikacja wspomagana analizą Gemini AI.",
            "text_en": "Summary and classification assisted by Gemini AI.",
            "confidence": "medium",
            "limitation_note": (
                "Klasyfikacja AI wymaga weryfikacji operatora PCI na podstawie źródła."
            ),
        }
    )
    return baseline
