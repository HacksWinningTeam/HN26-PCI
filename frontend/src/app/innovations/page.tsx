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
  CloseIcon,
  CsvIcon,
  EmptyState,
  ErrorState,
  FilterIcon,
  GridViewIcon,
  IconButton,
  ListViewIcon,
  LoadingState,
  PdfIcon,
  SearchIcon,
  SimpleTable,
  type SimpleTableColumn,
} from "@/components/ui";
import {
  fetchImplementationPlans,
  fetchInnovations,
  fetchSavedInnovations,
  type InnovationSummary,
} from "@/lib/radar-api";
import { downloadCsvFile, formatInnovationsCatalogCsv } from "@/lib/radar-export";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  ORG_TYPE_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/radar-labels";

const EMPTY_SLUG_SET = new Set<string>();

function FilterAccordion({
  title,
  defaultOpen = false,
  badgeCount = 0,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badgeCount?: number;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group border-b border-[var(--color-border-subtle)] py-3 last:border-b-0"
    >
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-2 text-xs font-bold text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <span>{title}</span>
          {badgeCount > 0 ? (
            <Badge tone="info" size="compact">
              {badgeCount}
            </Badge>
          ) : null}
        </span>
        <ChevronDownIcon
          size={15}
          className="shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="pt-2.5">{children}</div>
    </details>
  );
}

function InnovationsCatalogInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const { auth, authLoaded, compareSlugs, toggleCompare } = useSession();

  const [queryOverride, setQueryOverride] = useState<{
    base: string;
    value: string;
  } | null>(null);
  const q =
    queryOverride && queryOverride.base === initialQuery
      ? queryOverride.value
      : initialQuery;
  const setQ = (next: string) => setQueryOverride({ base: initialQuery, value: next });

  const [primaryArea, setPrimaryArea] = useState("");
  const [character, setCharacter] = useState("");
  const [sector, setSector] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [originLocation, setOriginLocation] = useState("");
  const [deploymentLevel, setDeploymentLevel] = useState("");
  const [trlMin, setTrlMin] = useState("");
  const [orgType, setOrgType] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sort, setSort] = useState("potential");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [items, setItems] = useState<InnovationSummary[]>([]);
  const [savedSlugsState, setSavedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [plannedSlugsState, setPlannedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!authLoaded || !auth.authenticated) {
      return;
    }
    let active = true;
    void Promise.all([
      fetchSavedInnovations().catch(() => []),
      fetchImplementationPlans().catch(() => []),
    ]).then(([saved, plans]) => {
      if (!active) return;
      setSavedSlugsState(new Set(saved.map((entry) => entry.innovation.slug)));
      setPlannedSlugsState(new Set(plans.map((plan) => plan.innovation.slug)));
    });
    return () => {
      active = false;
    };
  }, [auth.authenticated, authLoaded]);

  const savedSlugs = auth.authenticated ? savedSlugsState : EMPTY_SLUG_SET;
  const plannedSlugs = auth.authenticated ? plannedSlugsState : EMPTY_SLUG_SET;

  useEffect(() => {
    let active = true;
    const apiSort = sort === "potential" ? "updated_at" : sort;
    void fetchInnovations({
      q: q || undefined,
      primary_area: primaryArea || undefined,
      character: character || undefined,
      sector: sector || undefined,
      beneficiary: beneficiary || undefined,
      origin_location: originLocation || undefined,
      deployment_level: deploymentLevel || undefined,
      trl_min: trlMin || undefined,
      organization_type: orgType || undefined,
      verified_only: verifiedOnly ? "true" : undefined,
      sort: apiSort,
    })
      .then((data) => {
        if (!active) return;
        setItems(data);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Nie udało się pobrać katalogu.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    beneficiary,
    character,
    deploymentLevel,
    orgType,
    originLocation,
    primaryArea,
    q,
    retryCount,
    sector,
    sort,
    trlMin,
    verifiedOnly,
  ]);

  const displayedItems = useMemo(() => {
    if (sort !== "potential") return items;
    return [...items].sort(
      (a, b) =>
        (b.scores?.application_potential ?? 0) -
        (a.scores?.application_potential ?? 0),
    );
  }, [items, sort]);

  function clearAll() {
    setQ("");
    setPrimaryArea("");
    setCharacter("");
    setSector("");
    setBeneficiary("");
    setOriginLocation("");
    setDeploymentLevel("");
    setTrlMin("");
    setOrgType("");
    setVerifiedOnly(false);
  }

  const activeChips: Array<{ label: string; clear: () => void }> = [];
  if (q) activeChips.push({ label: `Szukaj: ${q}`, clear: () => setQ("") });
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
  if (beneficiary) {
    activeChips.push({
      label: `Beneficjent: ${BENEFICIARY_LABELS[beneficiary] ?? beneficiary}`,
      clear: () => setBeneficiary(""),
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
              className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-accent)] px-2.5 text-xs font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
            >
              Szczegóły
            </Link>
            <button
              type="button"
              onClick={() => toggleCompare(item.slug)}
              aria-pressed={pinned}
              className={[
                "inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-2.5 text-xs font-semibold",
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

  const filterSidebarContent = (
    <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--color-text)]">
          <FilterIcon size={17} />
          <span>Filtry</span>
        </div>
        {activeChips.length > 0 ? (
          <Badge tone="info" size="compact">
            {activeChips.length}
          </Badge>
        ) : null}
      </div>

      <FilterAccordion title="Obszar innowacji" defaultOpen badgeCount={primaryArea ? 1 : 0}>
        <div className="space-y-1.5" role="radiogroup" aria-label="Główny obszar innowacji">
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-[var(--color-surface-raised)]">
            <input
              type="radio"
              name="catalog-primary-area"
              checked={primaryArea === ""}
              onChange={() => setPrimaryArea("")}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>Wszystkie obszary</span>
          </label>
          {Object.entries(PRIMARY_AREA_LABELS).map(([k, v]) => (
            <label
              key={k}
              className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-[var(--color-surface-raised)]"
            >
              <input
                type="radio"
                name="catalog-primary-area"
                checked={primaryArea === k}
                onChange={() => setPrimaryArea(k)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>{v}</span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      <FilterAccordion title="Charakter rozwiązania" defaultOpen badgeCount={character ? 1 : 0}>
        <div className="space-y-1.5" role="radiogroup" aria-label="Charakter rozwiązania">
          <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-[var(--color-surface-raised)]">
            <input
              type="radio"
              name="catalog-character"
              checked={character === ""}
              onChange={() => setCharacter("")}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>Dowolny charakter</span>
          </label>
          {Object.entries(CHARACTER_LABELS).map(([k, v]) => (
            <label
              key={k}
              className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1 text-xs font-medium hover:bg-[var(--color-surface-raised)]"
            >
              <input
                type="radio"
                name="catalog-character"
                checked={character === k}
                onChange={() => setCharacter(k)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>{v}</span>
            </label>
          ))}
        </div>
      </FilterAccordion>

      <FilterAccordion
        title="Etap wdrożenia i TRL"
        defaultOpen
        badgeCount={(deploymentLevel ? 1 : 0) + (trlMin ? 1 : 0)}
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="cat-lvl" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Poziom wdrożenia
            </label>
            <select
              id="cat-lvl"
              value={deploymentLevel}
              onChange={(e) => setDeploymentLevel(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(DEPLOYMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cat-trl" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Poziom TRL (jeśli dotyczy)
            </label>
            <select
              id="cat-trl"
              value={trlMin}
              onChange={(e) => setTrlMin(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            >
              <option value="">Dowolny</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <option key={level} value={String(level)}>
                  TRL &ge; {level}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterAccordion>

      <FilterAccordion
        title="Branża i beneficjenci"
        badgeCount={(sector ? 1 : 0) + (beneficiary ? 1 : 0)}
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="cat-sector" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Branża
            </label>
            <select
              id="cat-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(SECTOR_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-ben" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Grupa beneficjentów
            </label>
            <select
              id="cat-ben"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(BENEFICIARY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FilterAccordion>

      <FilterAccordion
        title="Lokalizacja i wiarygodność"
        badgeCount={(originLocation ? 1 : 0) + (orgType ? 1 : 0) + (verifiedOnly ? 1 : 0)}
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="cat-location" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Lokalizacja pochodzenia
            </label>
            <input
              id="cat-location"
              value={originLocation}
              onChange={(e) => setOriginLocation(e.target.value)}
              placeholder="np. Podkarpackie, Gdynia"
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            />
          </div>

          <div>
            <label htmlFor="cat-org" className="mb-1 block text-[11px] font-semibold text-[var(--color-text-muted)]">
              Typ organizacji źródłowej
            </label>
            <select
              id="cat-org"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-medium text-[var(--color-text)]">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span>Tylko potwierdzone źródła</span>
          </label>
        </div>
      </FilterAccordion>

      {activeChips.length > 0 ? (
        <div className="border-t border-[var(--color-border-subtle)] pt-3">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-xs font-semibold text-[var(--color-accent-text)] transition-colors hover:border-[var(--color-accent)]"
          >
            <CloseIcon size={14} />
            <span>Wyczyść filtry</span>
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Search & Description Row */}
      <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <p className="max-w-xl text-sm leading-relaxed text-[var(--color-text-muted)]">
          {auth.authenticated
            ? "Przeglądaj, filtruj i porównuj sprawdzone rozwiązania. Gwiazdka na karcie zapisuje innowację bezpośrednio w Moich wdrożeniach."
            : "Przeglądaj, filtruj i porównuj sprawdzone rozwiązania ze źródeł publicznych."}
        </p>

        <form
          onSubmit={(e) => e.preventDefault()}
          role="search"
          className="flex w-full max-w-md items-center gap-2"
        >
          <label htmlFor="cat-search" className="sr-only">
            Wyszukaj w katalogu po nazwie, opisie, problemie, organizacji lub tagach
          </label>
          <div className="relative flex-1">
            <SearchIcon
              size={17}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--color-text-muted)]"
            />
            <input
              id="cat-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Wyszukaj w katalogu…"
              className="min-h-11 w-full rounded-full border border-[var(--color-border)] bg-[var(--color-canvas)] pr-4 pl-10 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>
          {q ? (
            <IconButton
              variant="outline"
              shape="pill"
              aria-label="Wyczyść wyszukiwanie"
              onClick={() => setQ("")}
            >
              <CloseIcon size={16} />
            </IconButton>
          ) : null}
        </form>
      </div>

      <CompareTray />

      {/* Main 2-column Layout: Left Filter Sidebar + Right Results */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[276px_minmax(0,1fr)]">
        {/* Desktop Filter Sidebar */}
        <aside aria-label="Filtry katalogu" className="hidden lg:block lg:sticky lg:top-4 print:hidden">
          {filterSidebarContent}
        </aside>

        <div className="min-w-0 space-y-5">
          {/* Toolbar: Results Count, Mobile Filter Button, Sort, View Switch, Exports */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="compact"
                leadingIcon={<FilterIcon size={16} />}
                className="lg:hidden"
                aria-expanded={mobileFiltersOpen}
                onClick={() => setMobileFiltersOpen((prev) => !prev)}
              >
                {activeChips.length > 0 ? `Filtry (${activeChips.length})` : "Filtry"}
              </Button>

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
                  className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-text)]"
                >
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
                disabled={displayedItems.length === 0}
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
                disabled={displayedItems.length === 0}
                onClick={() => window.print()}
              >
                PDF
              </Button>
            </div>
          </div>

          {/* Mobile Expandable Filters */}
          {mobileFiltersOpen ? (
            <div className="lg:hidden print:hidden">{filterSidebarContent}</div>
          ) : null}

          {/* Active Chips */}
          {activeChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              {activeChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-3 text-xs font-semibold text-[var(--color-info-text)] hover:opacity-85"
                >
                  <span>{chip.label}</span>
                  <span aria-hidden="true">×</span>
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className="cursor-pointer px-2 text-xs font-semibold text-[var(--color-accent-text)] underline"
              >
                Wyczyść wszystkie
              </button>
            </div>
          ) : null}

          {/* Content States */}
          {loading ? (
            <LoadingState
              label="Ładowanie katalogu innowacji…"
              description="Pobieramy zweryfikowane rekordy i wskaźniki gotowości."
            />
          ) : error ? (
            <ErrorState
              message={error}
              onRetry={() => {
                setLoading(true);
                setRetryCount((c) => c + 1);
              }}
            />
          ) : displayedItems.length === 0 ? (
            <EmptyState
              title="Brak wyników dla wybranych kryteriów"
              description="Usuń lub zmień część filtrów (np. wymagany TRL lub lokalizację) albo zostaw e-mail, aby otrzymać powiadomienie o nowych projektach."
              actions={
                <Button variant="outline" onClick={clearAll}>
                  Wyczyść filtry
                </Button>
              }
            >
              <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4 text-left">
                <NotifyMeBox
                  problemText={q}
                  filtersSnapshot={{
                    primaryArea,
                    character,
                    sector,
                    beneficiary,
                    originLocation,
                    deploymentLevel,
                    trlMin,
                    orgType,
                    verifiedOnly,
                  }}
                />
              </div>
            </EmptyState>
          ) : viewMode === "table" ? (
            <SimpleTable
              name="Katalog innowacji"
              rows={displayedItems}
              columns={tableColumns}
              getRowId={(item) => item.slug}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {displayedItems.map((item) => (
                <InnovationCardCompact
                  key={item.slug}
                  innovation={item}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InnovationsCatalogPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          label="Ładowanie katalogu innowacji…"
          description="Przygotowujemy filtry i listę rozwiązań."
        />
      }
    >
      <InnovationsCatalogInner />
    </Suspense>
  );
}
