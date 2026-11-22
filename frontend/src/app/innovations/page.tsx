"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CompareTray } from "@/components/CompareTray";
import { InnovationCardCompact } from "@/components/InnovationCardCompact";
import { NotifyMeBox } from "@/components/NotifyMeBox";
import { useSession } from "@/components/SessionProvider";
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
  const [sort, setSort] = useState("updated_at");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const [items, setItems] = useState<InnovationSummary[]>([]);
  const [savedSlugsState, setSavedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [plannedSlugsState, setPlannedSlugsState] = useState<Set<string>>(EMPTY_SLUG_SET);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      sort,
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
    sector,
    sort,
    trlMin,
    verifiedOnly,
  ]);

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
  if (trlMin) activeChips.push({ label: `TRL >= ${trlMin}`, clear: () => setTrlMin("") });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {auth.authenticated
            ? "Przeglądaj zweryfikowane rozwiązania, porównuj karty i przechodź bezpośrednio do swoich planów."
            : "Przeglądaj publiczny katalog innowacji. Zaloguj się, aby zapisywać projekty i generować plany wdrożenia."}
        </p>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() =>
              downloadCsvFile("katalog-innowacji.csv", formatInnovationsCatalogCsv(items))
            }
            className="min-h-11 cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold disabled:opacity-50"
          >
            Eksportuj CSV
          </button>
          <button
            type="button"
            disabled={items.length === 0}
            onClick={() => window.print()}
            className="min-h-11 cursor-pointer rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold disabled:opacity-50"
          >
            Eksportuj PDF
          </button>
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            aria-pressed={viewMode === "grid"}
            className={`min-h-11 cursor-pointer rounded-md border px-3 text-xs font-semibold ${
              viewMode === "grid"
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            Siatka kart
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            aria-pressed={viewMode === "table"}
            className={`min-h-11 cursor-pointer rounded-md border px-3 text-xs font-semibold ${
              viewMode === "table"
                ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)]"
            }`}
          >
            Tabela
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <CompareTray />

      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 print:hidden">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="cat-search" className="mb-1 block text-xs font-semibold">
              Szukaj po nazwie, opisie, problemie, organizacji lub tagach
            </label>
            <input
              id="cat-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="np. seniorzy, Gdynia, UPRP, AR, kompozyty…"
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cat-location" className="mb-1 block text-xs font-semibold">
              Lokalizacja pochodzenia
            </label>
            <input
              id="cat-location"
              value={originLocation}
              onChange={(e) => setOriginLocation(e.target.value)}
              placeholder="np. Podkarpackie, Gdynia"
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            />
          </div>

          <div>
            <label htmlFor="cat-sort" className="mb-1 block text-xs font-semibold">
              Sortowanie
            </label>
            <select
              id="cat-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="updated_at">Data aktualizacji</option>
              <option value="deployment_level">Poziom wdrożenia</option>
              <option value="name">Nazwa A–Z</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="cat-area" className="mb-1 block text-xs font-semibold">
              Główny obszar
            </label>
            <select
              id="cat-area"
              value={primaryArea}
              onChange={(e) => setPrimaryArea(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(PRIMARY_AREA_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-char" className="mb-1 block text-xs font-semibold">
              Charakter innowacji
            </label>
            <select
              id="cat-char"
              value={character}
              onChange={(e) => setCharacter(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(CHARACTER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-sector" className="mb-1 block text-xs font-semibold">
              Branża
            </label>
            <select
              id="cat-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
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
            <label htmlFor="cat-ben" className="mb-1 block text-xs font-semibold">
              Grupa beneficjentów
            </label>
            <select
              id="cat-ben"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(BENEFICIARY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-lvl" className="mb-1 block text-xs font-semibold">
              Poziom wdrożenia
            </label>
            <select
              id="cat-lvl"
              value={deploymentLevel}
              onChange={(e) => setDeploymentLevel(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
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
            <label htmlFor="cat-trl" className="mb-1 block text-xs font-semibold">
              TRL (jeśli dotyczy)
            </label>
            <select
              id="cat-trl"
              value={trlMin}
              onChange={(e) => setTrlMin(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
            >
              <option value="">Dowolny</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                <option key={level} value={String(level)}>
                  TRL &ge; {level}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="cat-org" className="mb-1 block text-xs font-semibold">
              Typ organizacji źródłowej
            </label>
            <select
              id="cat-org"
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
            >
              <option value="">Wszystkie</option>
              {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span>Tylko potwierdzone źródła</span>
            </label>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--color-border-subtle)] pt-3 text-xs">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.clear}
                className="cursor-pointer rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-1 font-medium"
              >
                {chip.label} &times;
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="cursor-pointer font-semibold text-[var(--color-accent-text)] underline"
            >
              Usuń wszystkie filtry
            </button>
          </div>
        ) : null}
      </section>

      {error ? (
        <p role="alert" className="rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-4 text-sm font-semibold text-[var(--color-error-text)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">Ładowanie katalogu…</p>
      ) : items.length === 0 ? (
        <div className="space-y-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            Brak wyników dla wybranych kryteriów
          </h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Usuń lub zmień część filtrów (np. wymagany TRL lub lokalizację) albo zapisz powiadomienie e-mail, gdy pojawi się pasujące rozwiązanie.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={clearAll}
              className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-sm font-semibold"
            >
              Wyczyść filtry
            </button>
          </div>
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
      ) : viewMode === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                <th className="p-3 font-bold">Innowacja</th>
                <th className="p-3 font-bold">Obszar / Charakter</th>
                <th className="p-3 font-bold">Branża</th>
                <th className="p-3 font-bold">Beneficjenci</th>
                <th className="p-3 font-bold">Pochodzenie</th>
                <th className="p-3 font-bold">Poziom / TRL</th>
                <th className="p-3 font-bold">Status / Data</th>
                <th className="p-3 font-bold">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {items.map((item) => {
                const pinned = compareSlugs.includes(item.slug);
                return (
                  <tr key={item.slug}>
                    <td className="p-3">
                      <Link
                        href={`/innovations/${item.slug}`}
                        className="font-bold text-[var(--color-accent-text)] hover:underline"
                      >
                        {item.title_pl}
                      </Link>
                      <div className="text-[var(--color-text-muted)]">
                        {item.organization_name}
                      </div>
                    </td>
                    <td className="p-3">
                      {PRIMARY_AREA_LABELS[item.primary_area]} ·{" "}
                      {item.innovation_character.map((c) => CHARACTER_LABELS[c]).join(", ")}
                    </td>
                    <td className="p-3">
                      {item.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ")}
                    </td>
                    <td className="p-3">
                      {item.beneficiary_groups
                        .map((b) => BENEFICIARY_LABELS[b] ?? b)
                        .join(", ") || "—"}
                    </td>
                    <td className="p-3">{item.origin_location}</td>
                    <td className="p-3">
                      {DEPLOYMENT_LABELS[item.deployment_level]}
                      {item.trl !== null ? ` (TRL ${item.trl})` : ""}
                    </td>
                    <td className="p-3">
                      {VERIFICATION_LABELS[item.verification_status]} · {item.last_verified_at}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <Link
                          href={`/innovations/${item.slug}`}
                          className="rounded border border-[var(--color-border)] px-2.5 py-1 font-semibold hover:border-[var(--color-accent)]"
                        >
                          Szczegóły
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleCompare(item.slug)}
                          className="cursor-pointer rounded border border-[var(--color-border)] px-2.5 py-1 font-semibold"
                        >
                          {pinned ? "W porównaniu" : "Porównaj"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {items.map((item) => (
            <InnovationCardCompact
              key={item.slug}
              innovation={item}
              isSaved={savedSlugs.has(item.slug)}
              hasPlan={plannedSlugs.has(item.slug)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function InnovationsCatalogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-text-muted)]">Ładowanie katalogu…</p>}>
      <InnovationsCatalogInner />
    </Suspense>
  );
}
