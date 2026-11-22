"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { CompareTray } from "@/components/CompareTray";
import { InnovationCardCompact } from "@/components/InnovationCardCompact";
import { PotentialMeter } from "@/components/InnovationVisuals";
import { NotifyMeBox } from "@/components/NotifyMeBox";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  Button,
  ButtonGroup,
  ChevronDownIcon,
  CsvIcon,
  EmptyState,
  ErrorState,
  FilterIcon,
  GridViewIcon,
  IconButton,
  ListViewIcon,
  LoadingState,
  PdfIcon,
  Popover,
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/ui";
import {
  fetchImplementationPlans,
  fetchInnovations,
  fetchSavedInnovations,
  matchProblem,
  type DiscoveryMatchResponse,
  type MatchItem,
  type InnovationSummary,
} from "@/lib/radar-api";
import { hasMatchContextChanged, selectInnovationResults } from "@/lib/innovation-search";
import type { SolvePrefillContext } from "@/components/SessionProvider";
import { downloadCsvFile, formatInnovationsCatalogCsv } from "@/lib/radar-export";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  ORG_TYPE_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type OrgType,
} from "@/lib/radar-labels";

const EMPTY_SLUG_SET = new Set<string>();

function FilterSelect({ id, label, value, onChange, options, emptyLabel = "Wszystkie" }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  emptyLabel?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold text-[var(--color-text-muted)]">{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]">
        <option value="">{emptyLabel}</option>
        {Object.entries(options).map(([key, option]) => <option key={key} value={key}>{option}</option>)}
      </select>
    </div>
  );
}

type SearchRequest =
  | { kind: "catalog"; query: string }
  | { kind: "problem"; context: SolvePrefillContext };

function MatchExplanation({ match }: { match: MatchItem }) {
  return (
    <details className="rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-xs text-[var(--color-info-text)]">
      <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
        {match.overall_score}% dopasowania — dlaczego?
      </summary>
      <p className="mb-3">{match.primary_reason}</p>
      <dl className="space-y-2">
        {[
          ["Problem · waga 40%", match.problem_score],
          ["Branża · waga 20%", match.sector_score],
          ["Beneficjenci · waga 20%", match.beneficiary_score],
          ["Typ organizacji · waga 20%", match.organization_fit_score],
        ].map(([label, score]) => (
          <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{score}%</dd></div>
        ))}
      </dl>
      {match.reasons.length > 0 ? <ul className="mt-3 list-disc space-y-1 pl-4">{match.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
    </details>
  );
}

function InnovationSearchInner({ initialQuery, initialProblemMode }: { initialQuery: string; initialProblemMode: boolean }) {
  const { auth, authLoaded, compareSlugs, toggleCompare, solveContext, setSolveContext, setMatchResults } = useSession();
  const [problemMode, setProblemMode] = useState(initialProblemMode);
  const queryBase = initialQuery || (initialProblemMode ? solveContext.problem_text : "");
  const [queryDraft, setQ] = useState<string | null>(null);
  const q = queryDraft ?? queryBase;
  const [catalogQuery, setCatalogQuery] = useState(initialProblemMode ? "" : initialQuery);
  const [primaryArea, setPrimaryArea] = useState("");
  const [character, setCharacter] = useState("");
  const [sectorDraft, setSector] = useState<string | null>(null);
  const sector = sectorDraft ?? (initialProblemMode ? solveContext.sector : "");
  const [beneficiariesDraft, setBeneficiaries] = useState<string[] | null>(null);
  const beneficiaries = useMemo(() => beneficiariesDraft ?? (initialProblemMode ? solveContext.beneficiary_groups : []), [beneficiariesDraft, initialProblemMode, solveContext.beneficiary_groups]);
  const [originLocation, setOriginLocation] = useState("");
  const [deploymentLevel, setDeploymentLevel] = useState("");
  const [trlMin, setTrlMin] = useState("");
  const [orgType, setOrgType] = useState("");
  const [adopterOrgDraft, setAdopterOrgDraft] = useState<OrgType | "" | null>(null);
  const adopterOrgType = adopterOrgDraft ?? (solveContext.organization_type || (auth.authenticated ? auth.profile?.organization_type : "") || "");
  const [locationDraft, setLocationDraft] = useState<string | null>(null);
  const deploymentLocation = locationDraft ?? (solveContext.deployment_location || (auth.authenticated ? auth.profile?.deployment_location : "") || "");
  const [scaleDraft, setProblemScale] = useState<string | null>(null);
  const problemScale = scaleDraft ?? (initialProblemMode ? solveContext.problem_scale : "");
  const [maturityDraft, setPreferredMaturity] = useState<string | null>(null);
  const preferredMaturity = maturityDraft ?? (initialProblemMode ? solveContext.preferred_maturity : "");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("potential");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [savedSlugsState, setSavedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [plannedSlugsState, setPlannedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [retryCount, setRetryCount] = useState(0);
  const [matchRequest, setMatchRequest] = useState<SearchRequest | null>(null);
  const catalogRequest = useMemo<SearchRequest>(() => ({ kind: "catalog", query: catalogQuery }), [catalogQuery]);
  const request = matchRequest ?? catalogRequest;
  const [result, setResult] = useState<{
    request: SearchRequest | null; retry: number; items: InnovationSummary[];
    discovery: DiscoveryMatchResponse | null; error: string;
  }>({ request: null, retry: 0, items: [], discovery: null, error: "" });
  const loading = result.request !== request || result.retry !== retryCount;
  const error = loading ? "" : result.error;
  const discovery = loading ? null : result.discovery;
  const matchesBySlug = useMemo(() => Object.fromEntries((discovery?.results ?? []).map((item) => [item.innovation.slug, item])), [discovery]);
  const enoughProblemText = q.trim().split(/\s+/).filter((word) => word.length >= 3).length >= 2;
  const currentContext: SolvePrefillContext = {
    problem_text: q.trim(), sector, beneficiary_groups: beneficiaries, organization_type: adopterOrgType,
    deployment_location: deploymentLocation, problem_scale: problemScale, preferred_maturity: preferredMaturity,
  };
  const contextChanged = request.kind === "problem" && hasMatchContextChanged(request.context, currentContext);

  useEffect(() => {
    if (!authLoaded || !auth.authenticated) return;
    let active = true;
    void Promise.all([fetchSavedInnovations().catch(() => []), fetchImplementationPlans().catch(() => [])])
      .then(([saved, plans]) => {
        if (!active) return;
        setSavedSlugsState(new Set(saved.map((entry) => entry.innovation.slug)));
        setPlannedSlugsState(new Set(plans.map((plan) => plan.innovation.slug)));
      });
    return () => { active = false; };
  }, [auth.authenticated, authLoaded]);
  const savedSlugs = auth.authenticated ? savedSlugsState : EMPTY_SLUG_SET;
  const plannedSlugs = auth.authenticated ? plannedSlugsState : EMPTY_SLUG_SET;

  useEffect(() => {
    let active = true;
    const operation = request.kind === "problem"
      ? matchProblem(request.context).then((data) => ({ items: data.results.map((item) => item.innovation), discovery: data }))
      : fetchInnovations({ q: request.query || undefined }).then((items) => ({ items, discovery: null }));
    void operation.then((data) => {
      if (!active) return;
      setResult({ ...data, request, retry: retryCount, error: "" });
      if (data.discovery) setMatchResults(data.discovery.results);
    }).catch((err) => {
      if (active) setResult({ request, retry: retryCount, items: [], discovery: null, error: err instanceof Error ? err.message : "Nie udało się wyszukać innowacji." });
    });
    return () => { active = false; };
  }, [request, retryCount, setMatchResults]);

  const displayedItems = useMemo(() => selectInnovationResults(result.items, {
    primaryArea, character, sector, beneficiaries, originLocation, deploymentLevel, trlMin,
    sourceOrgType: orgType, verifiedOnly,
  }, sort, matchesBySlug), [result.items, primaryArea, character, sector, beneficiaries, originLocation, deploymentLevel, trlMin, orgType, verifiedOnly, sort, matchesBySlug]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (problemMode) {
      if (!enoughProblemText) return;
      setSolveContext(currentContext);
      setMatchRequest({ kind: "problem", context: currentContext });
      setSort("relevance");
    } else {
      setMatchRequest(null);
      setCatalogQuery(q.trim());
      setRetryCount((count) => count + 1);
    }
  }

  function clearFilters() {
    setPrimaryArea("");
    setCharacter("");
    setSector("");
    setBeneficiaries([]);
    setOriginLocation("");
    setDeploymentLevel("");
    setTrlMin("");
    setOrgType("");
    setVerifiedOnly(false);
  }

  const activeChips: Array<{ label: string; clear: () => void }> = [];

  if (primaryArea) {
    activeChips.push({
      label: `Obszar: ${PRIMARY_AREA_LABELS[primaryArea as keyof typeof PRIMARY_AREA_LABELS] ?? primaryArea}`,
      clear: () => setPrimaryArea(""),
    });
  }
  if (character) {
    activeChips.push({
      label: `Charakter: ${CHARACTER_LABELS[character as keyof typeof CHARACTER_LABELS] ?? character}`,
      clear: () => setCharacter(""),
    });
  }
  if (sector) {
    activeChips.push({
      label: `Branża: ${SECTOR_LABELS[sector] ?? sector}`,
      clear: () => setSector(""),
    });
  }
  for (const beneficiary of beneficiaries) {
    activeChips.push({
      label: `Beneficjent: ${BENEFICIARY_LABELS[beneficiary] ?? beneficiary}`,
      clear: () => setBeneficiaries(beneficiaries.filter((key) => key !== beneficiary)),
    });
  }
  if (originLocation) {
    activeChips.push({
      label: `Pochodzenie: ${originLocation}`,
      clear: () => setOriginLocation(""),
    });
  }
  if (deploymentLevel) {
    activeChips.push({
      label: `Poziom: ${DEPLOYMENT_LABELS[deploymentLevel as keyof typeof DEPLOYMENT_LABELS] ?? deploymentLevel}`,
      clear: () => setDeploymentLevel(""),
    });
  }
  if (trlMin) activeChips.push({ label: `TRL ≥ ${trlMin}`, clear: () => setTrlMin("") });
  if (orgType) {
    activeChips.push({
      label: `Źródło: ${ORG_TYPE_LABELS[orgType as keyof typeof ORG_TYPE_LABELS] ?? orgType}`,
      clear: () => setOrgType(""),
    });
  }
  if (verifiedOnly) {
    activeChips.push({
      label: "Tylko potwierdzone źródła",
      clear: () => setVerifiedOnly(false),
    });
  }

  const tableColumns: SimpleTableColumn<InnovationSummary>[] = [
    {
      id: "title",
      label: "Innowacja",
      minWidth: 240,
      render: (item) => (
        <div className="space-y-1">
          <Link
            href={`/innovations/${item.slug}`}
            className="font-semibold text-[var(--color-accent-text)] hover:underline"
          >
            {item.title_pl}
          </Link>
          <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">
            {item.short_summary_pl}
          </p>
        </div>
      ),
    },
    ...(discovery ? [{
      id: "match", label: "Dopasowanie", minWidth: 240,
      render: (item: InnovationSummary) => matchesBySlug[item.slug] ? <MatchExplanation match={matchesBySlug[item.slug]} /> : null,
    }] : []),
    {
      id: "taxonomy",
      label: "Obszar i charakter",
      minWidth: 190,
      render: (item) => (
        <div className="space-y-1">
          <div className="font-semibold text-[var(--color-text)]">
            {PRIMARY_AREA_LABELS[item.primary_area]}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {item.innovation_character.map((c) => CHARACTER_LABELS[c]).join(", ")}
          </div>
        </div>
      ),
    },
    {
      id: "origin",
      label: "Branża i pochodzenie",
      minWidth: 180,
      render: (item) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-medium text-[var(--color-text)]">
            {item.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ")}
          </div>
          <div className="text-[var(--color-text-muted)]">{item.origin_location}</div>
        </div>
      ),
    },
    {
      id: "readiness",
      label: "Gotowość / TRL",
      minWidth: 150,
      render: (item) => (
        <div className="text-xs">
          <div className="font-semibold text-[var(--color-text)]">
            {DEPLOYMENT_LABELS[item.deployment_level]}
          </div>
          <div className="text-[var(--color-text-muted)]">
            {item.trl !== null ? `TRL ${item.trl}/9` : "TRL nie dotyczy"}
          </div>
        </div>
      ),
    },
    {
      id: "potential",
      label: "Potencjał",
      minWidth: 165,
      render: (item) => (
        <PotentialMeter score={item.scores?.application_potential} label="Potencjał" />
      ),
    },
    {
      id: "status",
      label: "Weryfikacja",
      minWidth: 140,
      render: (item) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold">{VERIFICATION_LABELS[item.verification_status]}</div>
          <div className="text-[var(--color-text-muted)]">{item.last_verified_at}</div>
        </div>
      ),
    },
    {
      id: "actions",
      label: "Akcje",
      minWidth: 170,
      render: (item) => {
        const pinned = compareSlugs.includes(item.slug);
        return (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={`/innovations/${item.slug}`}
              className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-2.5 text-xs font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
            >
              Szczegóły
            </Link>
            <button
              type="button"
              onClick={() => toggleCompare(item.slug)}
              aria-pressed={pinned}
              className={[
                "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-2.5 text-xs font-semibold",
                pinned
                  ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
              ].join(" ")}
            >
              {pinned ? "W porównaniu" : "Porównaj"}
            </button>
          </div>
        );
      },
    },
  ];

  const advancedFilterCount = Number(Boolean(character)) + Number(Boolean(trlMin)) +
    Number(Boolean(originLocation)) + Number(Boolean(orgType)) + Number(verifiedOnly);

  const filterPanelContent = (
    <section aria-label="Filtry innowacji" className="space-y-4 border-t border-[var(--color-border-subtle)] pt-5">
      <div className="grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2 @min-[1000px]:grid-cols-4">
        <FilterSelect id="cat-area" label="Obszar innowacji" value={primaryArea} onChange={setPrimaryArea} options={PRIMARY_AREA_LABELS} />
        <FilterSelect id="cat-sector" label="Branża" value={sector} onChange={setSector} options={SECTOR_LABELS} />
        <div className="min-w-0 space-y-1.5">
          <span id="cat-beneficiaries-label" className="block text-xs font-semibold text-[var(--color-text-muted)]">Beneficjenci</span>
          <Popover title="Grupy beneficjentów" mobileModal closeButton width={360}
            trigger={(props) => (
              <button {...props} aria-labelledby="cat-beneficiaries-label cat-beneficiaries-value"
                className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-left text-sm">
                <span id="cat-beneficiaries-value" className="min-w-0 truncate">{beneficiaries.length ? `Wybrano: ${beneficiaries.length}` : "Dowolni"}</span>
                <ChevronDownIcon size={16} className="shrink-0 text-[var(--color-text-muted)]" />
              </button>
            )}>
            {(close) => (
              <div className="space-y-3">
                <fieldset>
                  <legend className="mb-2 text-xs text-[var(--color-text-muted)]">Pasuje dowolna z wybranych grup</legend>
                  {Object.entries(BENEFICIARY_LABELS).map(([key, label]) => (
                    <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-sm hover:bg-[var(--color-surface-raised)]">
                      <input type="checkbox" checked={beneficiaries.includes(key)}
                        onChange={() => setBeneficiaries(beneficiaries.includes(key) ? beneficiaries.filter((value) => value !== key) : [...beneficiaries, key])}
                        className="h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
                      <span>{label}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                  <Button type="button" variant="ghost" onClick={() => setBeneficiaries([])} disabled={beneficiaries.length === 0}>Wyczyść wybór</Button>
                  <Button type="button" onClick={close}>Gotowe</Button>
                </div>
              </div>
            )}
          </Popover>
        </div>
        <FilterSelect id="cat-lvl" label="Etap wdrożenia" value={deploymentLevel} onChange={setDeploymentLevel} options={DEPLOYMENT_LABELS} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" leadingIcon={<FilterIcon size={16} />}
          aria-expanded={advancedFiltersOpen} aria-controls="innovation-advanced-filters"
          onClick={() => setAdvancedFiltersOpen((open) => !open)}>
          {advancedFiltersOpen ? "Mniej filtrów" : "Więcej filtrów"}
          {advancedFilterCount > 0 ? <Badge tone="info" size="compact">{advancedFilterCount}</Badge> : null}
          <ChevronDownIcon size={15} className={`shrink-0 transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`} />
        </Button>
        {activeChips.length > 0 ? <Button type="button" variant="ghost" onClick={clearFilters}>Wyczyść filtry</Button> : null}
      </div>

      <div id="innovation-advanced-filters" hidden={!advancedFiltersOpen}
        className="rounded-xl bg-[var(--color-canvas)] p-4">
        <div className="grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2 @min-[1000px]:grid-cols-4">
          <FilterSelect id="cat-character" label="Charakter rozwiązania" value={character} onChange={setCharacter} options={CHARACTER_LABELS} emptyLabel="Dowolny" />
          <FilterSelect id="cat-trl" label="Minimalny TRL (jeśli dotyczy)" value={trlMin} onChange={setTrlMin}
            options={Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => [String(level), `TRL ≥ ${level}`]))} emptyLabel="Dowolny" />
          <div className="min-w-0 space-y-1.5">
            <label htmlFor="cat-location" className="block text-xs font-semibold text-[var(--color-text-muted)]">Pochodzenie innowacji</label>
            <input id="cat-location" value={originLocation} onChange={(event) => setOriginLocation(event.target.value)} placeholder="Np. Podkarpackie, Gdynia"
              className="min-h-11 w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" />
          </div>
          <FilterSelect id="cat-org" label="Typ organizacji źródłowej" value={orgType} onChange={setOrgType} options={ORG_TYPE_LABELS} emptyLabel="Dowolny" />
        </div>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={verifiedOnly} onChange={(event) => setVerifiedOnly(event.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Tylko potwierdzone źródła
        </label>
      </div>

      {activeChips.length > 0 ? (
        <div aria-label="Aktywne filtry" className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button key={chip.label} type="button" onClick={chip.clear} aria-label={`Usuń filtr: ${chip.label}`}
              className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-3 text-xs font-semibold text-[var(--color-info-text)] hover:opacity-85">
              <span className="min-w-0 break-words">{chip.label}</span><span aria-hidden="true" className="shrink-0">×</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="@container space-y-6">
      <form onSubmit={submitSearch} role="search" aria-label="Szukaj innowacji" className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 sm:p-6 print:hidden">
        <div className="space-y-1">
          <label htmlFor="innovation-query" className="text-lg font-bold text-[var(--color-text)]">Czego szukasz?</label>
          <p id="innovation-query-help" className="text-sm text-[var(--color-text-muted)]">
            Wpisz nazwę lub frazę. Możesz też opisać problem i dopasować rozwiązania do swojej organizacji.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          <textarea id="innovation-query" rows={problemMode ? 3 : 1} value={q} onChange={(event) => setQ(event.target.value)}
            aria-describedby="innovation-query-help innovation-query-guidance"
            placeholder={problemMode ? "Np. Nasza gmina chce ułatwić seniorom korzystanie z usług cyfrowych." : "Nazwa innowacji, temat lub słowo kluczowe…"}
            className="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm text-[var(--color-text)]"
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !problemMode) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
          <Button type="submit" disabled={loading || (problemMode && !enoughProblemText)}>
            {loading ? "Wyszukiwanie…" : problemMode ? "Dopasuj rozwiązania" : "Szukaj innowacji"}
          </Button>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={problemMode} aria-controls={problemMode ? "problem-context" : undefined}
            onChange={(event) => {
              setProblemMode(event.target.checked);
              if (!event.target.checked) { setMatchRequest(null); setCatalogQuery(""); setSort("potential"); }
            }} className="h-4 w-4 accent-[var(--color-accent)]" />
          Opisz problem dokładniej i dopasuj rozwiązania
        </label>
        <p id="innovation-query-guidance" className="text-xs text-[var(--color-text-muted)]" aria-live="polite">
          {problemMode
            ? enoughProblemText ? "Dodaj branżę i beneficjentów w filtrach oraz kontekst poniżej, aby zwiększyć trafność dopasowania." : "Opisz problem w co najmniej kilku słowach, np. kogo dotyczy i jaki efekt chcesz osiągnąć."
            : "Bez wpisanej frazy zobaczysz wszystkie innowacje. Filtry działają również na dopasowaniach problemu."}
        </p>
        {problemMode ? (
          <fieldset id="problem-context" className="space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
            <legend className="px-1 text-sm font-semibold">Kontekst wdrożenia · opcjonalnie</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="search-adopter" className="mb-1 block text-xs font-semibold">Typ Twojej organizacji</label>
                <select id="search-adopter" value={adopterOrgType} onChange={(event) => setAdopterOrgDraft(event.target.value as OrgType | "")}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm">
                  <option value="">Nie określono</option>{Object.entries(ORG_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select></div>
              <div><label htmlFor="search-deployment-location" className="mb-1 block text-xs font-semibold">Lokalizacja planowanego wdrożenia</label>
                <input id="search-deployment-location" value={deploymentLocation} onChange={(event) => setLocationDraft(event.target.value)} placeholder="Np. Rzeszów, Podkarpackie"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" /></div>
              <div><label htmlFor="search-scale" className="mb-1 block text-xs font-semibold">Skala problemu</label>
                <input id="search-scale" value={problemScale} onChange={(event) => setProblemScale(event.target.value)} placeholder="Np. 1500 seniorów w gminie"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm" /></div>
              <div><label htmlFor="search-maturity" className="mb-1 block text-xs font-semibold">Minimalna dojrzałość rozwiązania</label>
                <select id="search-maturity" value={preferredMaturity} onChange={(event) => setPreferredMaturity(event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm">
                  <option value="">Dowolny poziom</option>{Object.entries(DEPLOYMENT_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select></div>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Kontekst zapisze się na potrzeby planu wdrożenia. Lokalizacja wdrożenia jest osobna od filtra pochodzenia innowacji.</p>
          </fieldset>
        ) : null}
        {filterPanelContent}
      </form>

      <CompareTray />
      {contextChanged ? <p role="status" className="rounded-xl border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-4 text-sm text-[var(--color-warn-text)]">Zmieniono opis lub kontekst. Kliknij „Dopasuj rozwiązania”, aby przeliczyć wynik. Widoczne procenty dotyczą poprzedniego zapytania.</p> : null}
      {discovery ? <section aria-label="Informacja o dopasowaniu" className="space-y-2 text-sm text-[var(--color-text-muted)]">
        <p aria-live="polite">{discovery.guidance_message}</p>
        <p className="text-xs">Dopasowanie: problem 40%, branża 20%, beneficjenci 20%, typ Twojej organizacji 20%. Wynik opisuje podobieństwo do potrzeb, a nie prawdopodobieństwo udanego wdrożenia.</p>
        {discovery.low_confidence ? <p role="status" className="font-semibold text-[var(--color-warn-text)]">{discovery.low_confidence_reason}</p> : null}
        {discovery.low_confidence && displayedItems.length > 0 ? <NotifyMeBox key={JSON.stringify(request)} problemText={request.kind === "problem" ? request.context.problem_text : catalogQuery} filtersSnapshot={request.kind === "problem" ? { ...request.context } : {}} /> : null}
      </section> : null}

      <section aria-label="Wyniki wyszukiwania" aria-busy={loading} className="min-w-0 space-y-5">
          {/* Result count, sorting, view and export actions. */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2.5">
              <p
                aria-live="polite"
                className="text-sm font-bold text-[var(--color-text)]"
              >
                {loading
                  ? "Wyszukiwanie innowacji…"
                  : `Znaleziono ${displayedItems.length} ${
                      displayedItems.length === 1
                        ? "innowację"
                        : displayedItems.length >= 2 && displayedItems.length <= 4
                          ? "innowacje"
                          : "innowacji"
                    }`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="cat-sort"
                  className="text-xs font-medium text-[var(--color-text-muted)]"
                >
                  Sortuj:
                </label>
                <select
                  id="cat-sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)]"
                >
                  {discovery ? <option value="relevance">Trafność dopasowania</option> : null}
                  <option value="potential">Potencjał wdrożenia</option>
                  <option value="updated_at">Data aktualizacji</option>
                  <option value="deployment_level">Poziom wdrożenia</option>
                  <option value="name">Nazwa A–Z</option>
                </select>
              </div>

              <ButtonGroup label="Tryb widoku wyników" size="compact">
                <IconButton
                  variant={viewMode === "grid" ? "filled" : "outline"}
                  aria-label="Siatka kart"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => setViewMode("grid")}
                >
                  <GridViewIcon size={17} />
                </IconButton>
                <IconButton
                  variant={viewMode === "table" ? "filled" : "outline"}
                  aria-label="Widok tabeli"
                  aria-pressed={viewMode === "table"}
                  onClick={() => setViewMode("table")}
                >
                  <ListViewIcon size={17} />
                </IconButton>
              </ButtonGroup>

              <Button
                variant="outline"
                size="compact"
                leadingIcon={<CsvIcon size={16} />}
                disabled={loading || Boolean(error) || displayedItems.length === 0}
                onClick={() =>
                  downloadCsvFile(
                    "katalog-innowacji.csv",
                    formatInnovationsCatalogCsv(displayedItems),
                  )
                }
              >
                CSV
              </Button>
              <Button
                variant="outline"
                size="compact"
                leadingIcon={<PdfIcon size={16} />}
                disabled={loading || Boolean(error) || displayedItems.length === 0}
                onClick={() => window.print()}
              >
                PDF
              </Button>
            </div>
          </div>

          {/* Content States */}
          {loading ? (
            <LoadingState
              label="Wyszukiwanie innowacji…"
              description="Pobieramy zweryfikowane rekordy i wskaźniki gotowości."
            />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setRetryCount((c) => c + 1);
              }}
            />
          ) : displayedItems.length === 0 ? (
            <EmptyState
              title="Brak wyników dla wybranych kryteriów"
              description="Usuń lub zmień część filtrów (np. wymagany TRL lub lokalizację) albo zostaw e-mail, aby otrzymać powiadomienie o nowych projektach."
              actions={
                <Button variant="outline" onClick={clearFilters}>
                  Wyczyść filtry
                </Button>
              }
            >
              <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4 text-left">
                <NotifyMeBox
                  key={JSON.stringify(request)}
                  problemText={request.kind === "problem" ? request.context.problem_text : catalogQuery}
                  filtersSnapshot={{
                    primaryArea,
                    character,
                    sector,
                    beneficiaries,
                    originLocation,
                    deploymentLevel,
                    trlMin,
                    orgType,
                    verifiedOnly,
                    ...(request.kind === "problem" ? request.context : {}),
                  }}
                />
              </div>
            </EmptyState>
          ) : viewMode === "table" ? (
            <SimpleTable
              name="Wyniki wyszukiwania innowacji"
              rows={displayedItems}
              columns={tableColumns}
              getRowId={(item) => item.slug}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 @min-[580px]:grid-cols-2 @min-[880px]:grid-cols-3">
              {displayedItems.map((item) => (
                <div key={item.slug} className="flex min-w-0 flex-col gap-2 [&>article]:flex-1">
                <InnovationCardCompact
                  innovation={item}
                  match={matchesBySlug[item.slug]}
                  isSaved={savedSlugs.has(item.slug)}
                  hasPlan={plannedSlugs.has(item.slug)}
                  onSaved={(slug) =>
                    setSavedSlugsState((prev) => new Set([...prev, slug]))
                  }
                  onRemoved={(slug) =>
                    setSavedSlugsState((prev) => {
                      const next = new Set(prev);
                      next.delete(slug);
                      return next;
                    })
                  }
                />
                {matchesBySlug[item.slug] ? <MatchExplanation match={matchesBySlug[item.slug]} /> : null}
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

function InnovationSearchRoute() {
  const params = useSearchParams();
  return <InnovationSearchInner key={params.toString()} initialQuery={params.get("q") ?? ""} initialProblemMode={params.get("mode") === "problem"} />;
}

export default function InnovationSearchPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          label="Wyszukiwanie innowacji…"
          description="Przygotowujemy filtry i listę rozwiązań."
        />
      }
    >
      <InnovationSearchRoute />
    </Suspense>
  );
}
