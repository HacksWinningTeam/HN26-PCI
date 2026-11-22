"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CompareTray } from "@/components/CompareTray";
import { InnovationCardCompact } from "@/components/InnovationCardCompact";
import { NotifyMeBox } from "@/components/NotifyMeBox";
import { useSession } from "@/components/SessionProvider";
import { Banner } from "@/components/ui";
import { matchProblem, type DiscoveryMatchResponse, type MatchItem } from "@/lib/radar-api";
import {
  BENEFICIARY_LABELS,
  DEPLOYMENT_LABELS,
  ORG_TYPE_LABELS,
  SECTOR_LABELS,
  type DeploymentLevel,
  type OrgType,
} from "@/lib/radar-labels";

const EXAMPLE_PROBLEM =
  "Nasza gmina potrzebuje rozwiązania, które pomoże seniorom korzystać z usług cyfrowych i ograniczy liczbę wizyt w urzędzie.";

const DEPLOYMENT_RANK: Record<DeploymentLevel, number> = {
  concept: 1,
  prototype: 2,
  tests: 3,
  pilot: 4,
  deployed: 5,
};

function getLiveGuidance(
  text: string,
  sector: string,
  beneficiaries: string[],
  orgType: string,
): { sufficient: boolean; message: string } {
  const words = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
  if (words.length < 2) {
    return {
      sufficient: false,
      message: "Wpisz co najmniej kilka słów o problemie, aby rozpocząć wyszukiwanie.",
    };
  }
  const missing: string[] = [];
  if (!sector) missing.push("branżę");
  if (beneficiaries.length === 0) missing.push("grupę beneficjentów");
  if (!orgType) missing.push("typ organizacji");
  if (missing.length === 0) {
    return {
      sufficient: true,
      message:
        "Opis i kontekst są kompletne — wyniki uwzględnią wszystkie 4 składowe dopasowania (40/20/20/20).",
    };
  }
  return {
    sufficient: true,
    message: `Opis jest wystarczający do rozpoczęcia wyszukiwania. Dodaj ${missing.slice(0, 2).join(" i ")}, aby zwiększyć trafność wyników.`,
  };
}

function detectSuggestedBeneficiaries(text: string): string[] {
  const lower = text.toLowerCase();
  const hints: string[] = [];
  if (lower.includes("senior") || lower.includes("starsz")) hints.push("seniors_60_plus");
  if (lower.includes("dziec")) hints.push("children_0_12");
  if (lower.includes("młodzie") || lower.includes("uczni")) hints.push("youth_13_18", "students_teachers");
  if (lower.includes("niepełnospraw")) hints.push("disabilities_special_needs");
  if (lower.includes("cyfrow") || lower.includes("wyklucz")) hints.push("social_digital_exclusion");
  if (lower.includes("gmin") || lower.includes("urzęd") || lower.includes("urząd") || lower.includes("sołectw")) {
    hints.push("public_orgs_communities");
  }
  return [...new Set(hints)];
}

export default function SolvePage() {
  const { auth, authLoaded, solveContext, setSolveContext, setMatchResults } = useSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [problemText, setProblemText] = useState(solveContext.problem_text);
  const [sector, setSector] = useState(solveContext.sector);
  const [beneficiaries, setBeneficiaries] = useState<string[]>(
    solveContext.beneficiary_groups,
  );
  const [orgTypeDraft, setOrgTypeDraft] = useState<OrgType | "" | null>(null);
  const [deploymentLocationDraft, setDeploymentLocationDraft] = useState<string | null>(
    null,
  );
  const [problemScale, setProblemScale] = useState(solveContext.problem_scale);
  const [preferredMaturity, setPreferredMaturity] = useState(
    solveContext.preferred_maturity,
  );

  const orgType: OrgType | "" =
    orgTypeDraft ??
    solveContext.organization_type ??
    (authLoaded && auth.authenticated ? auth.profile?.organization_type ?? "" : "");
  const setOrgType = (value: OrgType | "") => setOrgTypeDraft(value);

  const deploymentLocation =
    deploymentLocationDraft ??
    (solveContext.deployment_location ||
      (authLoaded && auth.authenticated ? auth.profile?.deployment_location ?? "" : ""));
  const setDeploymentLocation = (value: string) => setDeploymentLocationDraft(value);

  const [originFilter, setOriginFilter] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "deployment_level" | "name" | "updated_at">(
    "relevance",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<DiscoveryMatchResponse | null>(null);

  const liveGuidance = useMemo(
    () => getLiveGuidance(problemText, sector, beneficiaries, orgType),
    [beneficiaries, orgType, problemText, sector],
  );

  const suggestedBeneficiaries = useMemo(
    () => detectSuggestedBeneficiaries(problemText).filter((k) => !beneficiaries.includes(k)),
    [beneficiaries, problemText],
  );

  function toggleBeneficiary(key: string) {
    setBeneficiaries((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }

  async function runMatch(overrides?: {
    text?: string;
    sec?: string;
    ben?: string[];
    org?: OrgType | "";
    loc?: string;
    scale?: string;
    maturity?: string;
  }) {
    const nextCtx = {
      problem_text: overrides?.text ?? problemText,
      sector: overrides?.sec ?? sector,
      beneficiary_groups: overrides?.ben ?? beneficiaries,
      organization_type: overrides?.org ?? orgType,
      deployment_location: overrides?.loc ?? deploymentLocation,
      problem_scale: overrides?.scale ?? problemScale,
      preferred_maturity: overrides?.maturity ?? preferredMaturity,
    };

    setSolveContext(nextCtx);
    setLoading(true);
    setError("");

    try {
      const data = await matchProblem({
        problem_text: nextCtx.problem_text,
        sector: nextCtx.sector,
        beneficiary_groups: nextCtx.beneficiary_groups,
        organization_type: nextCtx.organization_type,
        deployment_location: nextCtx.deployment_location,
        problem_scale: nextCtx.problem_scale,
        preferred_maturity: nextCtx.preferred_maturity,
      });
      setResponse(data);
      setMatchResults(data.results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się połączyć z usługą dopasowania.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runMatch();
  }

  function fillExample() {
    setProblemText(EXAMPLE_PROBLEM);
    setSector("administracja");
    setBeneficiaries(["seniors_60_plus"]);
    setOrgType("public_institution");
    setDeploymentLocation("Podkarpackie");
    setProblemScale("1500 seniorów w gminie");
    setPreferredMaturity("");
    void runMatch({
      text: EXAMPLE_PROBLEM,
      sec: "administracja",
      ben: ["seniors_60_plus"],
      org: "public_institution",
      loc: "Podkarpackie",
      scale: "1500 seniorów w gminie",
      maturity: "",
    });
  }

  function clearRefinement(rerun = false) {
    setSector("");
    setBeneficiaries([]);
    setOrgType("");
    setDeploymentLocation("");
    setProblemScale("");
    setPreferredMaturity("");
    setOriginFilter("");
    if (rerun) {
      void runMatch({
        sec: "",
        ben: [],
        org: "",
        loc: "",
        scale: "",
        maturity: "",
      });
    }
  }

  const displayedResults = useMemo(() => {
    if (!response) return [];
    let list: MatchItem[] = [...response.results];
    const locQuery = originFilter.trim().toLowerCase();
    if (locQuery) {
      list = list.filter((item) =>
        item.innovation.origin_location.toLowerCase().includes(locQuery),
      );
    }
    if (sortBy === "deployment_level") {
      list.sort(
        (a, b) =>
          (DEPLOYMENT_RANK[b.innovation.deployment_level] ?? 0) -
          (DEPLOYMENT_RANK[a.innovation.deployment_level] ?? 0),
      );
    } else if (sortBy === "name") {
      list.sort((a, b) => a.innovation.title_pl.localeCompare(b.innovation.title_pl, "pl"));
    } else if (sortBy === "updated_at") {
      list.sort((a, b) =>
        b.innovation.last_verified_at.localeCompare(a.innovation.last_verified_at),
      );
    }
    return list;
  }, [originFilter, response, sortBy]);

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="max-w-3xl text-sm text-[var(--color-text-muted)]">
          {auth.authenticated
            ? "Opisz problem własnymi słowami. Kontekst organizacji z Twojego konta automatycznie zasili dopasowanie i kolejne plany."
            : "Opisz problem własnymi słowami i doprecyzuj kontekst. Pola uzupełnione tutaj automatycznie zasilą ankietę wdrożeniową po rejestracji."}
        </p>

        {authLoaded && !auth.authenticated ? (
          <Banner tone="info" appearance="tinted">
            Wyszukiwanie problemu i rozbicie dopasowania 40/20/20/20 są otwarte bez konta.{" "}
            <Link href="/login?next=/solve" className="font-semibold underline">
              Zaloguj się
            </Link>
            , aby zapisywać porównania i odblokować spersonalizowane plany w 5 fazach.
          </Banner>
        ) : null}
      </div>

      <CompareTray />

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        {/* Step 1: Problem Description */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="problem-desc" className="text-sm font-bold text-[var(--color-text)]">
              Krok 1: Na czym polega problem, kogo dotyczy, gdzie występuje i jaki rezultat chcesz osiągnąć?
            </label>
            <button
              type="button"
              onClick={fillExample}
              className="cursor-pointer text-xs font-semibold text-[var(--color-accent-text)] underline"
            >
              Użyj przykładu gminy
            </button>
          </div>
          <textarea
            ref={textareaRef}
            id="problem-desc"
            rows={3}
            value={problemText}
            onChange={(e) => setProblemText(e.target.value)}
            placeholder={EXAMPLE_PROBLEM}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)]"
          />
          <p className="text-xs font-medium text-[var(--color-text-muted)]" aria-live="polite">
            {liveGuidance.message}
          </p>
        </div>

        {/* Step 2: Smart Refinement */}
        <fieldset className="space-y-4 border-t border-[var(--color-border-subtle)] pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-sm font-bold text-[var(--color-text)]">
              Krok 2: Inteligentne doprecyzowanie (opcjonalnie zwiększa trafność i zasila ankietę)
            </legend>
            {sector || beneficiaries.length > 0 || orgType || deploymentLocation || problemScale || preferredMaturity ? (
              <button
                type="button"
                onClick={() => clearRefinement(false)}
                className="cursor-pointer text-xs font-semibold text-[var(--color-text-muted)] underline"
              >
                Wyczyść doprecyzowanie
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="solve-sector" className="mb-1 block text-xs font-semibold">
                Branża lub sektor
              </label>
              <select
                id="solve-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                <option value="">Dowolna branża</option>
                {Object.entries(SECTOR_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="solve-org-type" className="mb-1 block text-xs font-semibold">
                Typ organizacji
              </label>
              <select
                id="solve-org-type"
                value={orgType}
                onChange={(e) => setOrgType(e.target.value as OrgType | "")}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                <option value="">Dowolny typ</option>
                {Object.entries(ORG_TYPE_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="solve-location" className="mb-1 block text-xs font-semibold">
                Lokalizacja planowanego wdrożenia
              </label>
              <input
                id="solve-location"
                value={deploymentLocation}
                onChange={(e) => setDeploymentLocation(e.target.value)}
                placeholder="np. Gmina Trzebownisko, Podkarpackie"
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="solve-scale" className="mb-1 block text-xs font-semibold">
                Skala problemu (np. liczba osób)
              </label>
              <input
                id="solve-scale"
                value={problemScale}
                onChange={(e) => setProblemScale(e.target.value)}
                placeholder="np. 1500 seniorów w gminie"
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="solve-maturity" className="mb-1 block text-xs font-semibold">
                Preferowany poziom dojrzałości
              </label>
              <select
                id="solve-maturity"
                value={preferredMaturity}
                onChange={(e) => setPreferredMaturity(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
              >
                <option value="">Dowolny poziom</option>
                {Object.entries(DEPLOYMENT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold">Grupa beneficjentów</span>
              {suggestedBeneficiaries.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-[var(--color-text-muted)]">Sugerowane z opisu:</span>
                  {suggestedBeneficiaries.slice(0, 3).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleBeneficiary(key)}
                      className="cursor-pointer rounded-full border border-[var(--color-accent)] bg-[var(--color-info-bg)] px-2.5 py-0.5 font-semibold text-[var(--color-info-text)]"
                    >
                      + {BENEFICIARY_LABELS[key] ?? key}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(BENEFICIARY_LABELS).map(([key, label]) => {
                const checked = beneficiaries.includes(key);
                return (
                  <label
                    key={key}
                    className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                      checked
                        ? "border-[var(--color-accent)] bg-[var(--color-info-bg)] font-semibold text-[var(--color-info-text)]"
                        : "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBeneficiary(key)}
                      className="accent-[var(--color-accent)]"
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="submit"
            disabled={loading || !liveGuidance.sufficient}
            className="min-h-11 cursor-pointer rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
          >
            {loading ? "Dopasowywanie…" : "Znajdź pasujące innowacje"}
          </button>

          {response ? (
            <p className="text-xs font-medium text-[var(--color-text-muted)]" aria-live="polite">
              {response.guidance_message}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="text-sm font-semibold text-[var(--color-error-text)]">
            {error}
          </p>
        ) : null}
      </form>

      {/* Step 3: Ranked 40/20/20/20 Results */}
      {response ? (
        <section aria-labelledby="solve-results-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-1">
              <h2 id="solve-results-heading" className="text-xl font-bold text-[var(--color-text)]">
                Dopasowane innowacje ({displayedResults.length})
              </h2>
              <p className="text-xs text-[var(--color-text-muted)]">
                Łączny procent oznacza podobieństwo do potrzeb użytkownika (problem 40%, branża 20%, beneficjenci 20%, typ organizacji 20%), a nie prawdopodobieństwo udanego wdrożenia.
              </p>
            </div>

            {response.results.length > 0 ? (
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="solve-origin-filter" className="mb-1 block text-xs font-semibold">
                    Filtr lokalizacji pochodzenia
                  </label>
                  <input
                    id="solve-origin-filter"
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    placeholder="np. Podkarpackie"
                    className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="solve-sort" className="mb-1 block text-xs font-semibold">
                    Sortowanie
                  </label>
                  <select
                    id="solve-sort"
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(
                        e.target.value as "relevance" | "deployment_level" | "name" | "updated_at",
                      )
                    }
                    className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
                  >
                    <option value="relevance">Trafność (dopasowanie)</option>
                    <option value="deployment_level">Poziom wdrożenia</option>
                    <option value="name">Nazwa A–Z</option>
                    <option value="updated_at">Data aktualizacji</option>
                  </select>
                </div>
              </div>
            ) : null}
          </div>

          {response.low_confidence || displayedResults.length === 0 ? (
            <div className="space-y-3 rounded-xl border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-5">
              <p className="text-sm font-semibold text-[var(--color-warn-text)]">
                {response.low_confidence
                  ? response.low_confidence_reason
                  : "Filtr lokalizacji pochodzenia wykluczył wszystkie dopasowania."}
              </p>
              <div className="flex flex-wrap gap-4 text-xs">
                <button
                  type="button"
                  onClick={() => clearRefinement(true)}
                  className="cursor-pointer font-semibold text-[var(--color-accent-text)] underline"
                >
                  Usuń dodatkowe filtry i szukaj ponownie
                </button>
                <button
                  type="button"
                  onClick={() => textareaRef.current?.focus()}
                  className="cursor-pointer font-semibold text-[var(--color-accent-text)] underline"
                >
                  Zmień opis problemu
                </button>
              </div>
              <NotifyMeBox
                problemText={problemText}
                filtersSnapshot={{
                  sector,
                  beneficiaries,
                  orgType,
                  deploymentLocation,
                  preferredMaturity,
                  originFilter,
                }}
              />
            </div>
          ) : null}

          {displayedResults.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {displayedResults.map((item) => (
                <InnovationCardCompact
                  key={item.innovation.slug}
                  innovation={item.innovation}
                  match={item}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
