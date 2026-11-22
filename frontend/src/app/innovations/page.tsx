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
  Banner,
  BrandSearchIdeaIcon,
  Button,
  ButtonGroup,
  Checkbox,
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  CompareIcon,
  CsvIcon,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterIcon,
  GridViewIcon,
  IconButton,
  ListViewIcon,
  LoadingState,
  MultiSelect,
  PdfIcon,
  SearchIcon,
  SearchInput,
  SimpleTable,
  SparkleIcon,
  StatusIndicator,
  Switch,
  TextArea,
  TextInput,
  type DropdownOption,
  type SimpleTableColumn,
  type StatusTone,
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
  getProvenanceMeta,
  ORG_TYPE_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type OrgType,
  type PrimaryArea,
  type VerificationStatus,
} from "@/lib/radar-labels";

const EMPTY_SLUG_SET = new Set<string>();

function buildDropdownOptions(
  labels: Record<string, string>,
  emptyLabel?: string,
): DropdownOption[] {
  const mapped = Object.entries(labels).map(([value, label]) => ({
    value,
    label,
  }));
  return emptyLabel !== undefined
    ? [{ value: "", label: emptyLabel }, ...mapped]
    : mapped;
}

const AREA_OPTIONS = buildDropdownOptions(PRIMARY_AREA_LABELS, "Wszystkie");
const SECTOR_OPTIONS = buildDropdownOptions(SECTOR_LABELS, "Wszystkie");
const BENEFICIARY_OPTIONS = buildDropdownOptions(BENEFICIARY_LABELS);
const DEPLOYMENT_OPTIONS = buildDropdownOptions(DEPLOYMENT_LABELS, "Wszystkie");
const CHARACTER_OPTIONS = buildDropdownOptions(CHARACTER_LABELS, "Dowolny");
const SOURCE_ORG_OPTIONS = buildDropdownOptions(ORG_TYPE_LABELS, "Dowolny");
const ADOPTER_ORG_OPTIONS = buildDropdownOptions(ORG_TYPE_LABELS, "Nie określono");
const PREFERRED_MATURITY_OPTIONS = buildDropdownOptions(
  DEPLOYMENT_LABELS,
  "Dowolny poziom",
);
const TRL_OPTIONS: DropdownOption[] = [
  { value: "", label: "Dowolny" },
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => ({
    value: String(level),
    label: `TRL ≥ ${level}`,
  })),
];
const BASE_SORT_OPTIONS: DropdownOption[] = [
  { value: "potential", label: "Potencjał wdrożenia" },
  { value: "updated_at", label: "Data aktualizacji" },
  { value: "deployment_level", label: "Poziom wdrożenia" },
  { value: "name", label: "Nazwa A–Z" },
];

const AREA_BADGE_TONE: Record<PrimaryArea, "info" | "lime" | "neutral"> = {
  technological: "info",
  educational: "lime",
  administrative: "neutral",
};

const VERIFICATION_TONE: Record<VerificationStatus, StatusTone> = {
  verified: "success",
  pending_review: "warning",
  stale: "warning",
  conflict: "error",
};

type SearchRequest =
  | { kind: "catalog"; query: string }
  | { kind: "problem"; context: SolvePrefillContext };

function MatchExplanation({ match }: { match: MatchItem }) {
  const breakdown: Array<[string, number]> = [
    ["Problem · waga 40%", match.problem_score],
    ["Branża · waga 20%", match.sector_score],
    ["Beneficjenci · waga 20%", match.beneficiary_score],
    ["Typ organizacji · waga 20%", match.organization_fit_score],
  ];

  return (
    <details className="group rounded-xl border border-[var(--color-info-border)]/50 bg-[var(--color-info-bg)] p-3 text-xs text-[var(--color-info-text)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 items-center gap-2">
          <Badge tone="info" variant="solid" size="compact">
            {match.overall_score}%
          </Badge>
          <span className="truncate">Dlaczego to dopasowanie?</span>
        </span>
        <ChevronDownIcon
          size={15}
          className="shrink-0 text-[var(--color-info-text)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-2.5 space-y-3 border-t border-[var(--color-info-border)]/30 pt-2.5">
        <p className="leading-relaxed">{match.primary_reason}</p>
        <dl className="space-y-2">
          {breakdown.map(([label, score]) => (
            <div key={label} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">{label}</dt>
                <dd className="font-mono font-bold tabular-nums">{score}%</dd>
              </div>
              <div
                aria-hidden="true"
                className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
        {match.reasons.length > 0 ? (
          <ul className="list-disc space-y-1 pl-4 text-[var(--color-text-muted)]">
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : null}
      </div>
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
      minWidth: 260,
      render: (item) => {
        const hasPlan = plannedSlugs.has(item.slug);
        const match = matchesBySlug[item.slug];
        return (
          <div className="space-y-1.5 font-normal">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/innovations/${item.slug}`}
                className="font-bold text-[var(--color-text)] transition-colors hover:text-[var(--color-accent-text)] hover:underline"
              >
                {item.title_pl}
              </Link>
              {hasPlan ? (
                <Badge tone="success" size="compact">
                  Plan wdrożenia
                </Badge>
              ) : null}
              {match ? (
                <Badge tone="info" variant="solid" size="compact">
                  {match.overall_score}%
                </Badge>
              ) : null}
            </div>
            <p className="line-clamp-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
              {item.short_summary_pl}
            </p>
          </div>
        );
      },
    },
    ...(discovery ? [{
      id: "match", label: "Dopasowanie", minWidth: 250,
      render: (item: InnovationSummary) => matchesBySlug[item.slug] ? <MatchExplanation match={matchesBySlug[item.slug]} /> : null,
    }] : []),
    {
      id: "taxonomy",
      label: "Obszar i charakter",
      minWidth: 200,
      render: (item) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={AREA_BADGE_TONE[item.primary_area]} size="compact">
            {PRIMARY_AREA_LABELS[item.primary_area]}
          </Badge>
          {item.innovation_character.slice(0, 2).map((c) => (
            <Badge key={c} tone="neutral" variant="outline" size="compact">
              {CHARACTER_LABELS[c]}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "origin",
      label: "Branża i pochodzenie",
      minWidth: 190,
      render: (item) => (
        <div className="space-y-0.5 text-xs">
          <div className="font-semibold text-[var(--color-text)]">
            {item.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ") || "—"}
          </div>
          <div className="text-[var(--color-text-muted)]">{item.origin_location}</div>
        </div>
      ),
    },
    {
      id: "readiness",
      label: "Gotowość / TRL",
      minWidth: 195,
      render: (item) => {
        const deploymentProv = getProvenanceMeta(
          item.classification_provenance,
          "deployment_level",
        );
        const trlProv = getProvenanceMeta(
          item.classification_provenance,
          "trl",
          item.trl !== null,
        );
        return (
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-[var(--color-text)]">
              {DEPLOYMENT_LABELS[item.deployment_level]}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {deploymentProv.label}
            </div>
            <div>
              {item.trl !== null ? (
                <Badge tone={trlProv.tone} size="compact">
                  TRL {item.trl}/9 · {trlProv.shortLabel}
                </Badge>
              ) : (
                <span className="text-[var(--color-text-muted)]">TRL nie określono</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "potential",
      label: "Potencjał",
      minWidth: 170,
      render: (item) => (
        <PotentialMeter score={item.scores?.application_potential} label="Potencjał" />
      ),
    },
    {
      id: "status",
      label: "Weryfikacja",
      minWidth: 175,
      render: (item) => (
        <div className="space-y-1 text-xs">
          <StatusIndicator tone={VERIFICATION_TONE[item.verification_status]}>
            {VERIFICATION_LABELS[item.verification_status]}
          </StatusIndicator>
          <div className="font-mono text-[11px] tabular-nums text-[var(--color-text-muted)]">
            {item.last_verified_at}
          </div>
        </div>
      ),
    },
    {
      id: "actions",
      label: "Akcje",
      minWidth: 210,
      render: (item) => {
        const pinned = compareSlugs.includes(item.slug);
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/innovations/${item.slug}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--color-accent)] px-3.5 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              Szczegóły
            </Link>
            <Button
              type="button"
              variant={pinned ? "filled" : "outline"}
              tone={pinned ? "lime" : "neutral"}
              leadingIcon={
                pinned ? (
                  <CheckIcon size={14} weight="bold" />
                ) : (
                  <CompareIcon size={14} />
                )
              }
              onClick={() => toggleCompare(item.slug)}
              aria-pressed={pinned}
              className="text-xs"
            >
              {pinned ? "W porównaniu" : "Porównaj"}
            </Button>
          </div>
        );
      },
    },
  ];

  const advancedFilterCount = Number(Boolean(character)) + Number(Boolean(trlMin)) +
    Number(Boolean(originLocation)) + Number(Boolean(orgType)) + Number(verifiedOnly);
  const sortOptions = discovery
    ? [{ value: "relevance", label: "Trafność dopasowania" }, ...BASE_SORT_OPTIONS]
    : BASE_SORT_OPTIONS;

  const filterPanelContent = (
    <section aria-label="Filtry innowacji" className="space-y-4 border-t border-[var(--color-border-subtle)] pt-5">
      <div className="grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2 @min-[1000px]:grid-cols-4">
        <Dropdown
          id="cat-area"
          label="Obszar innowacji"
          options={AREA_OPTIONS}
          value={primaryArea}
          onValueChange={setPrimaryArea}
          className="min-w-0"
        />
        <Dropdown
          id="cat-sector"
          label="Branża"
          options={SECTOR_OPTIONS}
          value={sector}
          onValueChange={setSector}
          className="min-w-0"
        />
        <MultiSelect
          id="cat-beneficiaries"
          label="Beneficjenci"
          options={BENEFICIARY_OPTIONS}
          value={beneficiaries}
          onValueChange={setBeneficiaries}
          placeholder="Dowolni"
          searchable
          className="min-w-0"
        />
        <Dropdown
          id="cat-lvl"
          label="Etap wdrożenia"
          options={DEPLOYMENT_OPTIONS}
          value={deploymentLevel}
          onValueChange={setDeploymentLevel}
          className="min-w-0"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          leadingIcon={<FilterIcon size={16} />}
          trailingIcon={
            <ChevronDownIcon
              size={15}
              className={`transition-transform ${advancedFiltersOpen ? "rotate-180" : ""}`}
            />
          }
          aria-expanded={advancedFiltersOpen}
          aria-controls="innovation-advanced-filters"
          onClick={() => setAdvancedFiltersOpen((open) => !open)}
        >
          <span className="inline-flex items-center gap-2">
            <span>{advancedFiltersOpen ? "Mniej filtrów" : "Więcej filtrów"}</span>
            {advancedFilterCount > 0 ? (
              <Badge tone="info" size="compact">
                {advancedFilterCount}
              </Badge>
            ) : null}
          </span>
        </Button>

        {activeChips.length > 0 ? (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            Wyczyść filtry
          </Button>
        ) : null}
      </div>

      <div
        id="innovation-advanced-filters"
        hidden={!advancedFiltersOpen}
        className="space-y-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4"
      >
        <div className="grid grid-cols-1 gap-4 @min-[560px]:grid-cols-2 @min-[1000px]:grid-cols-4">
          <Dropdown
            id="cat-character"
            label="Charakter rozwiązania"
            options={CHARACTER_OPTIONS}
            value={character}
            onValueChange={setCharacter}
            className="min-w-0"
          />
          <Dropdown
            id="cat-trl"
            label="Minimalny TRL (jeśli dotyczy)"
            options={TRL_OPTIONS}
            value={trlMin}
            onValueChange={setTrlMin}
            className="min-w-0"
          />
          <TextInput
            id="cat-location"
            label="Pochodzenie innowacji"
            value={originLocation}
            onChange={(event) => setOriginLocation(event.target.value)}
            placeholder="Np. Podkarpackie, Gdynia"
            className="min-w-0"
          />
          <Dropdown
            id="cat-org"
            label="Typ organizacji źródłowej"
            options={SOURCE_ORG_OPTIONS}
            value={orgType}
            onValueChange={setOrgType}
            className="min-w-0"
          />
        </div>

        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]">
          <Checkbox
            checked={verifiedOnly}
            onChange={(event) => setVerifiedOnly(event.target.checked)}
          />
          <span>Tylko potwierdzone źródła</span>
        </label>
      </div>

      {activeChips.length > 0 ? (
        <div aria-label="Aktywne filtry" className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={chip.clear}
              aria-label={`Usuń filtr: ${chip.label}`}
              className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-3.5 text-xs font-semibold text-[var(--color-info-text)] transition-colors hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <span className="min-w-0 break-words">{chip.label}</span>
              <CloseIcon size={13} weight="bold" className="shrink-0" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="@container space-y-6">
      <form
        onSubmit={submitSearch}
        role="search"
        aria-label="Szukaj innowacji"
        className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs sm:p-6 print:hidden"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] sm:flex">
              <BrandSearchIdeaIcon size={30} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
                Czego szukasz?
              </h2>
              <p id="innovation-query-help" className="text-sm text-[var(--color-text-muted)]">
                Wpisz nazwę lub frazę. Możesz też opisać problem i dopasować rozwiązania do swojej organizacji.
              </p>
            </div>
          </div>

          <Switch
            accent="lime"
            label="Opisz problem dokładniej i dopasuj rozwiązania"
            checked={problemMode}
            aria-controls={problemMode ? "problem-context" : undefined}
            onChange={(event) => {
              setProblemMode(event.target.checked);
              if (!event.target.checked) {
                setMatchRequest(null);
                setCatalogQuery("");
                setSort("potential");
              }
            }}
            className="sm:shrink-0"
          />
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
          {problemMode ? (
            <TextArea
              id="innovation-query"
              label="Opis problemu"
              rows={3}
              minRows={3}
              maxRows={6}
              autoGrow
              resizable={false}
              value={q}
              aria-describedby="innovation-query-help innovation-query-guidance"
              placeholder="Np. Nasza gmina chce ułatwić seniorom korzystanie z usług cyfrowych."
              onChange={(event) => setQ(event.target.value)}
              className="min-w-0 flex-1"
            />
          ) : (
            <SearchInput
              id="innovation-query"
              label="Wpisz nazwę lub frazę"
              hideLabel
              value={q}
              aria-describedby="innovation-query-help innovation-query-guidance"
              placeholder="Nazwa innowacji, temat lub słowo kluczowe…"
              onValueChange={setQ}
              className="min-w-0 flex-1"
            />
          )}

          <Button
            type="submit"
            disabled={loading || (problemMode && !enoughProblemText)}
            leadingIcon={
              problemMode ? (
                <SparkleIcon size={16} weight="bold" />
              ) : (
                <SearchIcon size={16} weight="bold" />
              )
            }
            className="sm:shrink-0"
          >
            {loading
              ? "Wyszukiwanie…"
              : problemMode
                ? "Dopasuj rozwiązania"
                : "Szukaj innowacji"}
          </Button>
        </div>

        <p id="innovation-query-guidance" className="text-xs text-[var(--color-text-muted)]" aria-live="polite">
          {problemMode
            ? enoughProblemText
              ? "Dodaj branżę i beneficjentów w filtrach oraz kontekst poniżej, aby zwiększyć trafność dopasowania."
              : "Opisz problem w co najmniej kilku słowach, np. kogo dotyczy i jaki efekt chcesz osiągnąć."
            : "Bez wpisanej frazy zobaczysz wszystkie innowacje. Filtry działają również na dopasowaniach problemu."}
        </p>

        {problemMode ? (
          <fieldset
            id="problem-context"
            className="space-y-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-sm font-bold text-[var(--color-text)]">
                Kontekst wdrożenia
              </legend>
              <Badge tone="lime" size="compact">
                Opcjonalne · zapisuje się do planu
              </Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Dropdown
                id="search-adopter"
                label="Typ Twojej organizacji"
                options={ADOPTER_ORG_OPTIONS}
                value={adopterOrgType}
                onValueChange={(value) => setAdopterOrgDraft(value as OrgType | "")}
                className="min-w-0"
              />
              <TextInput
                id="search-deployment-location"
                label="Lokalizacja planowanego wdrożenia"
                value={deploymentLocation}
                onChange={(event) => setLocationDraft(event.target.value)}
                placeholder="Np. Rzeszów, Podkarpackie"
                className="min-w-0"
              />
              <TextInput
                id="search-scale"
                label="Skala problemu"
                value={problemScale}
                onChange={(event) => setProblemScale(event.target.value)}
                placeholder="Np. 1500 seniorów w gminie"
                className="min-w-0"
              />
              <Dropdown
                id="search-maturity"
                label="Minimalna dojrzałość rozwiązania"
                options={PREFERRED_MATURITY_OPTIONS}
                value={preferredMaturity}
                onValueChange={setPreferredMaturity}
                className="min-w-0"
              />
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              Kontekst zapisze się na potrzeby planu wdrożenia. Lokalizacja wdrożenia jest osobna od filtra pochodzenia innowacji.
            </p>
          </fieldset>
        ) : null}

        {filterPanelContent}
      </form>

      <CompareTray />

      {contextChanged ? (
        <Banner
          tone="warning"
          appearance="tinted"
          announcement="polite"
          title="Wyniki wymagają przeliczenia"
        >
          Zmieniono opis lub kontekst. Kliknij „Dopasuj rozwiązania”, aby przeliczyć wynik. Widoczne procenty dotyczą poprzedniego zapytania.
        </Banner>
      ) : null}

      {discovery ? (
        <section
          aria-label="Informacja o dopasowaniu"
          className="space-y-3 rounded-2xl border border-[var(--color-info-border)]/50 bg-[var(--color-info-bg)] p-4 text-xs text-[var(--color-info-text)]"
        >
          <p aria-live="polite" className="text-sm font-semibold">
            {discovery.guidance_message}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="info" size="compact">Problem 40%</Badge>
            <Badge tone="info" size="compact">Branża 20%</Badge>
            <Badge tone="info" size="compact">Beneficjenci 20%</Badge>
            <Badge tone="info" size="compact">Typ organizacji 20%</Badge>
            <span className="ml-1 text-[var(--color-text-muted)]">
              Wynik opisuje podobieństwo do potrzeb, a nie prawdopodobieństwo udanego wdrożenia.
            </span>
          </div>
          {discovery.low_confidence ? (
            <Banner tone="warning" appearance="tinted" announcement="polite">
              {discovery.low_confidence_reason}
            </Banner>
          ) : null}
          {discovery.low_confidence && displayedItems.length > 0 ? (
            <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3.5">
              <NotifyMeBox
                key={JSON.stringify(request)}
                problemText={request.kind === "problem" ? request.context.problem_text : catalogQuery}
                filtersSnapshot={request.kind === "problem" ? { ...request.context } : {}}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-label="Wyniki wyszukiwania" aria-busy={loading} className="min-w-0 space-y-5">
        {/* Result count, sorting, view and export actions. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <p
              aria-live="polite"
              className="text-sm font-extrabold tracking-tight text-[var(--color-text)]"
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

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--color-text-muted)]">
                Sortuj:
              </span>
              <Dropdown
                id="cat-sort"
                label="Sortuj wyniki"
                hideLabel
                options={sortOptions}
                value={sort}
                onValueChange={setSort}
                className="min-w-44"
              />
            </div>

            <ButtonGroup label="Tryb widoku wyników">
              <IconButton
                variant={viewMode === "grid" ? "filled" : "outline"}
                aria-label="Siatka kart"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
              >
                <GridViewIcon size={18} />
              </IconButton>
              <IconButton
                variant={viewMode === "table" ? "filled" : "outline"}
                aria-label="Widok tabeli"
                aria-pressed={viewMode === "table"}
                onClick={() => setViewMode("table")}
              >
                <ListViewIcon size={18} />
              </IconButton>
            </ButtonGroup>

            <Button
              variant="outline"
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
            headerColumn
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
