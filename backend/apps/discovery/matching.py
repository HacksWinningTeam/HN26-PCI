import re
import unicodedata

from apps.innovations.models import Innovation

MATURITY_ORDER = {
    "concept": 1,
    "prototype": 2,
    "tests": 3,
    "pilot": 4,
    "deployed": 5,
}

POLISH_STOPWORDS = {
    "aby",
    "albo",
    "bez",
    "chce",
    "chcemy",
    "czy",
    "dla",
    "gdzie",
    "jak",
    "jaki",
    "jakie",
    "jest",
    "kogo",
    "ktora",
    "ktore",
    "ktorej",
    "ktory",
    "ktorych",
    "liczbe",
    "lub",
    "maja",
    "moze",
    "nad",
    "nasz",
    "nasza",
    "nasze",
    "nie",
    "oraz",
    "osoby",
    "osob",
    "pod",
    "pomoze",
    "pomoc",
    "potrzebuje",
    "potrzebujemy",
    "problem",
    "problemu",
    "przez",
    "przy",
    "rezultat",
    "rozwiazania",
    "rozwiazanie",
    "sposob",
    "tak",
    "tylko",
    "wiec",
    "wystepuje",
}


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


def _stem(word: str) -> str:
    # Handle common Polish vowel/stem alternations (urząd/urzędzie -> urz, powódź -> pow)
    if word.startswith(("urzad", "urzed")):
        return "urzad"
    if len(word) >= 6:
        return word[:5]
    if len(word) == 5 and word[-1] in {"a", "e", "i", "o", "u", "y"}:
        return word[:4]
    return word


def _tokens(text: str) -> set[str]:
    norm = _normalize(text)
    words = re.findall(r"[a-z0-9]+", norm)
    return {_stem(w) for w in words if len(w) >= 3 and w not in POLISH_STOPWORDS}


def score_innovation_for_query(
    innovation: Innovation,
    *,
    problem_text: str,
    sector: str = "",
    beneficiary_groups: list[str] | None = None,
    organization_type: str = "",
    preferred_maturity: str = "",
    weights: tuple[int, int, int, int] = (40, 20, 20, 20),
) -> dict:
    """Compute explainable weighted need-similarity match (default 40/20/20/20)."""
    beneficiaries = beneficiary_groups or []
    q_tokens = _tokens(problem_text)
    target_text = (
        f"{innovation.title_pl} {innovation.short_summary_pl} "
        f"{innovation.problem_pl} {innovation.solution_pl} "
        f"{' '.join(innovation.tags or [])}"
    )
    inv_tokens = _tokens(target_text)

    if q_tokens:
        overlap = q_tokens & inv_tokens
        ratio = len(overlap) / max(1, min(len(q_tokens), 5))
        problem_score = min(100, round(ratio * 100))
    else:
        problem_score = 0

    if sector:
        sector_score = 100 if sector in (innovation.sectors or []) else 15
    else:
        sector_score = 50 if q_tokens else 0

    inv_beneficiaries = set(innovation.beneficiary_groups or [])
    if beneficiaries:
        matched_ben = inv_beneficiaries & set(beneficiaries)
        beneficiary_score = (
            min(100, round((len(matched_ben) / len(beneficiaries)) * 100)) if matched_ben else 10
        )
    else:
        beneficiary_score = 50 if q_tokens else 0

    inv_targets = set(innovation.target_org_types or [])
    if organization_type:
        org_fit_score = 100 if organization_type in inv_targets else 20
    else:
        org_fit_score = 50 if q_tokens else 0

    meets_maturity = True
    if preferred_maturity and preferred_maturity in MATURITY_ORDER:
        inv_rank = MATURITY_ORDER.get(innovation.deployment_level, 1)
        pref_rank = MATURITY_ORDER[preferred_maturity]
        meets_maturity = inv_rank >= pref_rank

    w_prob, w_sec, w_ben, w_org = weights
    overall_score = round(
        (
            w_prob * problem_score
            + w_sec * sector_score
            + w_ben * beneficiary_score
            + w_org * org_fit_score
        )
        / 100
    )

    reasons: list[str] = []
    if problem_score >= 45:
        reasons.append(f"Zbieżność opisu problemu ({problem_score}%)")
    if sector and sector_score == 100:
        reasons.append(f"Zgodna branża: {sector}")
    if beneficiaries and beneficiary_score >= 50:
        reasons.append("Zgodne grupy beneficjentów")
    if organization_type and org_fit_score >= 80:
        reasons.append("Dopasowane do typu organizacji")
    if not reasons:
        reasons.append("Częściowe dopasowanie słów kluczowych")

    return {
        "problem_score": problem_score,
        "sector_score": sector_score,
        "beneficiary_score": beneficiary_score,
        "organization_fit_score": org_fit_score,
        "overall_score": overall_score,
        "meets_maturity": meets_maturity,
        "primary_reason": reasons[0],
        "reasons": reasons,
    }


def evaluate_query_sufficiency(
    *,
    problem_text: str,
    sector: str = "",
    beneficiary_groups: list[str] | None = None,
    organization_type: str = "",
) -> dict:
    tokens = _tokens(problem_text)
    missing: list[str] = []
    if len(tokens) < 3:
        missing.append(
            "opisz problem nieco dokładniej (kogo dotyczy i jaki rezultat chcesz osiągnąć)"
        )
    if not sector:
        missing.append("branżę")
    if not beneficiary_groups:
        missing.append("grupę beneficjentów")
    if not organization_type:
        missing.append("typ organizacji")

    sufficient = len(tokens) >= 2
    if not sufficient:
        message = "Wpisz co najmniej kilka słów o problemie, aby rozpocząć wyszukiwanie."
    elif missing:
        message = (
            "Opis jest wystarczający do rozpoczęcia wyszukiwania. "
            f"Dodaj {', '.join(missing[:2])}, aby zwiększyć trafność wyników."
        )
    else:
        message = (
            "Opis i kontekst są kompletne — wyniki uwzględniają wszystkie 4 składowe dopasowania."
        )

    return {
        "sufficient": sufficient,
        "message": message,
    }
