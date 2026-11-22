"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  ArrowRightIcon,
  Badge,
  Banner,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandBookmarkIcon,
  BrandLimeBurstIcon,
  BrandScalesIcon,
  Button,
  CheckCircleIcon,
  CloseIcon,
  CsvIcon,
  Dropdown,
  EmptyState,
  ErrorState,
  IconButton,
  LoadingState,
  PdfIcon,
  StatusIndicator,
  type StatusTone,
} from "@/components/ui";
import {
  buildSlotOptions,
  computeKeyDifferences,
  computeScoreRanges,
  shortInnovationTitle,
  updateCompareSlot,
  type ScoreKey,
} from "@/lib/compare-helpers";
import { scoreToFiveScale } from "@/lib/innovation-metrics";
import {
  fetchInnovationDetail,
  fetchInnovations,
  saveComparison,
  type InnovationDetail,
  type InnovationSummary,
  type MatchItem,
} from "@/lib/radar-api";
import { downloadCsvFile, formatComparisonCsv } from "@/lib/radar-export";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  getProvenanceMeta,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type PrimaryArea,
  type VerificationStatus,
} from "@/lib/radar-labels";

const AREA_BADGE_TONE: Record<PrimaryArea, StatusTone> = {
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

interface MatrixRow {
  id: string;
  label: string;
  renderCell: (detail: InnovationDetail) => ReactNode;
}

function ScoreCell({
  value,
  min,
  max,
}: {
  value: number | undefined;
  min: number;
  max: number;
}) {
  const { fiveScaleLabel, percent } = scoreToFiveScale(value);
  if (percent === null) {
    return <span className="text-xs text-[var(--color-text-muted)]">Brak danych</span>;
  }

  const isLeader = percent === max && max > 0 && min < max;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-sm font-bold tabular-nums text-[var(--color-text)]">
        {fiveScaleLabel} / 5{" "}
        <span className="text-xs font-normal text-[var(--color-text-muted)]">
          ({percent}%)
        </span>
      </span>
      {isLeader ? (
        <Badge
          tone="lime"
          size="compact"
          leadingIcon={<CheckCircleIcon size={12} weight="bold" />}
        >
          Najwyższy
        </Badge>
      ) : null}
    </div>
  );
}

function MatchCell({ match }: { match: MatchItem | undefined }) {
  if (!match) {
    return (
      <Link
        href="/innovations?mode=problem"
        className="text-xs font-semibold text-[var(--color-accent-text)] underline hover:opacity-85"
      >
        Opisz problem, aby obliczyć dopasowanie →
      </Link>
    );
  }

  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info" variant="solid" size="compact">
          {match.overall_score}%
        </Badge>
        <span className="text-[var(--color-text)]">{match.primary_reason}</span>
      </div>
      <p className="font-mono text-[11px] text-[var(--color-text-muted)]">
        Problem 40%: {match.problem_score}% · Branża 20%: {match.sector_score}% ·
        Beneficjenci 20%: {match.beneficiary_score}% · Typ org. 20%:{" "}
        {match.organization_fit_score}%
      </p>
    </div>
  );
}

export default function ComparePage() {
  const {
    auth,
    compareSlugs,
    setCompareSlugs,
    clearCompare,
    matchBySlug,
    solveContext,
  } = useSession();

  const [summariesRetry, setSummariesRetry] = useState(0);
  const [summariesState, setSummariesState] = useState<{
    retry: number;
    items: InnovationSummary[];
    error: string;
  }>({ retry: -1, items: [], error: "" });

  const slugsKey = compareSlugs.join("|");
  const [detailsRetry, setDetailsRetry] = useState(0);
  const [detailsState, setDetailsState] = useState<{
    key: string;
    retry: number;
    items: InnovationDetail[];
    failedSlugs: string[];
  }>({ key: "", retry: 0, items: [], failedSlugs: [] });

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetchInnovations()
      .then((items) => {
        if (!cancelled) {
          setSummariesState({ retry: summariesRetry, items, error: "" });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSummariesState({
            retry: summariesRetry,
            items: [],
            error:
              err instanceof Error
                ? err.message
                : "Nie udało się pobrać katalogu innowacji.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [summariesRetry]);

  useEffect(() => {
    if (compareSlugs.length === 0) return;
    let cancelled = false;
    void Promise.all(
      compareSlugs.map(async (slug) => {
        try {
          const detail = await fetchInnovationDetail(slug);
          return { slug, detail, ok: true as const };
        } catch {
          return { slug, detail: null, ok: false as const };
        }
      }),
    ).then((loaded) => {
      if (cancelled) return;
      setDetailsState({
        key: slugsKey,
        retry: detailsRetry,
        items: loaded
          .map((entry) => entry.detail)
          .filter((item): item is InnovationDetail => Boolean(item)),
        failedSlugs: loaded
          .filter((entry) => !entry.ok)
          .map((entry) => entry.slug),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [compareSlugs, slugsKey, detailsRetry]);

  const summariesLoading = summariesState.retry !== summariesRetry;
  const allSummaries = summariesState.items;
  const summariesError = summariesState.error;

  const detailsLoading =
    compareSlugs.length > 0 &&
    (detailsState.key !== slugsKey || detailsState.retry !== detailsRetry);
  const details = useMemo(
    () => (compareSlugs.length === 0 ? [] : detailsState.items),
    [compareSlugs.length, detailsState.items],
  );
  const failedSlugs = useMemo(
    () => (compareSlugs.length === 0 ? [] : detailsState.failedSlugs),
    [compareSlugs.length, detailsState.failedSlugs],
  );

  function handleSlotChange(idx: number, slug: string) {
    setSavedMessage("");
    setSaveError("");
    setCompareSlugs(updateCompareSlot(compareSlugs, idx, slug));
  }

  function handleLoadSample() {
    if (allSummaries.length < 2) return;
    setSavedMessage("");
    setSaveError("");
    setCompareSlugs(allSummaries.slice(0, 2).map((item) => item.slug));
  }

  function handleClearAll() {
    setSavedMessage("");
    setSaveError("");
    clearCompare();
  }

  async function handleSaveComparison() {
    if (!auth.authenticated || details.length < 2 || saving) return;
    setSaving(true);
    setSaveError("");
    setSavedMessage("");
    try {
      const title = details
        .map((d) => shortInnovationTitle(d.title_pl))
        .join(" vs ");
      await saveComparison({
        title,
        innovation_slugs: details.map((d) => d.slug),
        query_context: { ...solveContext },
      });
      setSavedMessage("Porównanie zapisano na koncie w zakładce Moje wdrożenia.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Nie udało się zapisać porównania.",
      );
    } finally {
      setSaving(false);
    }
  }

  const scoreRanges = useMemo(() => computeScoreRanges(details), [details]);

  const keyDifferences = useMemo(
    () =>
      computeKeyDifferences(details, matchBySlug, {
        areaLabels: PRIMARY_AREA_LABELS,
        deploymentLabels: DEPLOYMENT_LABELS,
        verificationLabels: VERIFICATION_LABELS,
      }),
    [details, matchBySlug],
  );

  const matrixRows = useMemo<MatrixRow[]>(() => {
    if (details.length < 2) return [];

    const scoreRow = (id: ScoreKey, label: string): MatrixRow => ({
      id,
      label,
      renderCell: (d) => (
        <ScoreCell
          value={d.scores?.[id]}
          min={scoreRanges[id].min}
          max={scoreRanges[id].max}
        />
      ),
    });

    return [
      {
        id: "problem",
        label: "Rozwiązywany problem",
        renderCell: (d) => (
          <p className="leading-relaxed text-[var(--color-text)]">{d.problem_pl}</p>
        ),
      },
      {
        id: "area-character",
        label: "Obszar i charakter",
        renderCell: (d) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={AREA_BADGE_TONE[d.primary_area]} size="compact">
              {PRIMARY_AREA_LABELS[d.primary_area]}
            </Badge>
            {d.innovation_character.map((charKey) => (
              <Badge key={charKey} tone="neutral" variant="outline" size="compact">
                {CHARACTER_LABELS[charKey]}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: "sectors",
        label: "Branża",
        renderCell: (d) =>
          d.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ") || "—",
      },
      {
        id: "beneficiaries",
        label: "Beneficjenci",
        renderCell: (d) =>
          d.beneficiary_groups.map((b) => BENEFICIARY_LABELS[b] ?? b).join(", ") ||
          "—",
      },
      {
        id: "deployment",
        label: "Poziom wdrożenia",
        renderCell: (d) => {
          const prov = getProvenanceMeta(d.classification_provenance, "deployment_level");
          return (
            <div className="space-y-1">
              <Badge tone="neutral" variant="soft" size="compact">
                {DEPLOYMENT_LABELS[d.deployment_level]}
              </Badge>
              <div className="text-[11px] font-medium text-[var(--color-text-muted)]">
                {prov.label}
              </div>
            </div>
          );
        },
      },
      {
        id: "trl",
        label: "TRL",
        renderCell: (d) => {
          const trlProv = getProvenanceMeta(
            d.classification_provenance,
            "trl",
            d.trl !== null,
          );
          return (
            <div className="space-y-1">
              <span className="block font-mono font-semibold tabular-nums text-[var(--color-text)]">
                {d.trl !== null ? `TRL ${d.trl}/9` : "Nie określono"}
              </span>
              <Badge tone={trlProv.tone} size="compact">
                {trlProv.label}
              </Badge>
            </div>
          );
        },
      },
      {
        id: "match",
        label: "Zgodność z potrzebą użytkownika",
        renderCell: (d) => <MatchCell match={matchBySlug[d.slug]} />,
      },
      scoreRow("innovativeness", "Innowacyjność"),
      scoreRow("application_potential", "Potencjał zastosowania"),
      scoreRow("transferability", "Możliwość transferu"),
      scoreRow("credibility", "Wiarygodność"),
      {
        id: "sources",
        label: "Jakość źródeł",
        renderCell: (d) => (
          <div className="space-y-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <StatusIndicator tone={VERIFICATION_TONE[d.verification_status]}>
                {VERIFICATION_LABELS[d.verification_status]}
              </StatusIndicator>
              <span className="font-semibold text-[var(--color-text)]">
                {d.sources.length} źródeł
              </span>
            </div>
            <p className="leading-relaxed text-[var(--color-text-muted)]">
              Rejestry: {d.sources.map((s) => s.registry).join(", ") || "brak"} ·{" "}
              {d.verification_method}
            </p>
          </div>
        ),
      },
      {
        id: "strengths-risks",
        label: "Mocne strony i ryzyka",
        renderCell: (d) => (
          <div className="space-y-1.5 text-xs leading-relaxed">
            <p className="text-[var(--color-text)]">
              <strong>Mocne strony:</strong> {d.strengths.join("; ") || "—"}
            </p>
            <p className="text-[var(--color-text-muted)]">
              <strong className="text-[var(--color-text)]">Ryzyka:</strong>{" "}
              {d.risks.join("; ") || "—"}
            </p>
          </div>
        ),
      },
      {
        id: "missing-info",
        label: "Braki informacyjne",
        renderCell: (d) => (
          <span className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            {d.missing_info.join("; ") || "Brak"}
          </span>
        ),
      },
      {
        id: "next-step",
        label: "Sugerowany następny krok",
        renderCell: (d) => (
          <span className="text-xs font-semibold leading-relaxed text-[var(--color-accent-text)]">
            {d.suggested_next_step}
          </span>
        ),
      },
      {
        id: "actions",
        label: "Działanie",
        renderCell: (d) => (
          <Link
            href={`/innovations/${d.slug}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            <span>Szczegóły i plan</span>
            <ArrowRightIcon size={14} weight="bold" />
          </Link>
        ),
      },
    ];
  }, [details, matchBySlug, scoreRanges]);

  const selectedFirstSummary = useMemo(
    () => allSummaries.find((item) => item.slug === compareSlugs[0]),
    [allSummaries, compareSlugs],
  );

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="compare-hero-heading"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6"
      >
        <BrandBlobSoftBlueIcon
          size={170}
          className="pointer-events-none absolute -top-14 -right-12 opacity-50"
        />
        <BrandBlobLimeIcon
          size={130}
          className="pointer-events-none absolute right-24 -bottom-14 hidden opacity-40 sm:block"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] shadow-xs sm:h-16 sm:w-16">
              <BrandLimeBurstIcon
                size={22}
                className="pointer-events-none absolute -top-2.5 -left-2.5 -rotate-45"
              />
              <BrandScalesIcon size={38} className="sm:h-10 sm:w-10" />
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info" size="compact">
                  {compareSlugs.length}/3 wybrane
                </Badge>
                <span className="text-xs text-[var(--color-text-muted)]">
                  {auth.authenticated
                    ? "Zapis w Moich wdrożeniach"
                    : "Publiczne porównanie i eksport"}
                </span>
              </div>
              <h2
                id="compare-hero-heading"
                className="text-xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-2xl"
              >
                Zestawienie wybranych innowacji
              </h2>
              <p className="text-sm text-[var(--color-text-muted)]">
                {auth.authenticated
                  ? "Porównaj 2–3 rozwiązania obok siebie, wyeksportuj wyniki albo zapisz je na koncie."
                  : "Porównaj 2–3 rozwiązania obok siebie i pobierz zestawienie. Zapis na koncie wymaga zalogowania."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:shrink-0 print:hidden">
            <Button
              type="button"
              variant="outline"
              leadingIcon={<CsvIcon size={16} />}
              onClick={() =>
                downloadCsvFile(
                  "porownanie-innowacji.csv",
                  formatComparisonCsv(details, matchBySlug),
                )
              }
              disabled={details.length < 2}
            >
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              leadingIcon={<PdfIcon size={16} />}
              onClick={() => window.print()}
              disabled={details.length < 2}
            >
              PDF
            </Button>
            {auth.authenticated ? (
              <Button
                type="button"
                variant="filled"
                loading={saving}
                leadingIcon={<BrandBookmarkIcon size={18} />}
                onClick={() => void handleSaveComparison()}
                disabled={details.length < 2}
              >
                {saving ? "Zapisywanie…" : "Zapisz porównanie"}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 mt-5 space-y-3 border-t border-[var(--color-border-subtle)] pt-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              Wybierz od 2 do 3 rozwiązań do zestawienia
            </span>
            {compareSlugs.length > 0 ? (
              <Button
                type="button"
                variant="ghost"
                size="compact"
                onClick={handleClearAll}
              >
                Wyczyść wybór
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[0, 1, 2].map((idx) => (
              <Dropdown
                key={idx}
                id={`compare-slot-${idx}`}
                label={`Innowacja ${idx + 1}`}
                options={buildSlotOptions(allSummaries, compareSlugs, idx)}
                value={compareSlugs[idx] ?? ""}
                onValueChange={(nextSlug) => handleSlotChange(idx, nextSlug)}
                placeholder="— Wybierz innowację —"
                searchable
                disabled={summariesLoading || Boolean(summariesError)}
              />
            ))}
          </div>
        </div>
      </section>

      {savedMessage ? (
        <Banner
          tone="success"
          appearance="tinted"
          announcement="polite"
          onDismiss={() => setSavedMessage("")}
          actions={[
            <Link
              key="workspace"
              href="/workspace"
              className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-current px-3 py-1.5 text-xs font-bold hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <span>Moje wdrożenia</span>
              <ArrowRightIcon size={14} weight="bold" />
            </Link>,
          ]}
        >
          {savedMessage}
        </Banner>
      ) : null}

      {saveError ? (
        <Banner
          tone="error"
          appearance="tinted"
          announcement="assertive"
          onDismiss={() => setSaveError("")}
        >
          {saveError}
        </Banner>
      ) : null}

      {failedSlugs.length > 0 ? (
        <Banner
          tone="warning"
          appearance="tinted"
          announcement="polite"
          actions={[
            <Button
              key="retry-details"
              size="compact"
              variant="outline"
              onClick={() => setDetailsRetry((count) => count + 1)}
            >
              Ponów
            </Button>,
          ]}
        >
          Nie udało się wczytać części rekordów: {failedSlugs.join(", ")}.
        </Banner>
      ) : null}

      {summariesError ? (
        <ErrorState
          title="Nie udało się pobrać katalogu innowacji"
          message={summariesError}
          onRetry={() => setSummariesRetry((count) => count + 1)}
        />
      ) : summariesLoading || detailsLoading ? (
        <LoadingState
          label="Ładowanie porównania…"
          description="Pobieramy szczegóły, oceny i źródła wybranych innowacji."
          rows={3}
        />
      ) : details.length < 2 ? (
        <EmptyState
          icon={<BrandScalesIcon size={28} />}
          title={
            compareSlugs.length === 1
              ? "Dodaj jeszcze jedną innowację"
              : "Wybierz co najmniej dwie innowacje"
          }
          description={
            compareSlugs.length === 1 && selectedFirstSummary
              ? `Wybrano: „${selectedFirstSummary.title_pl}”. Dodaj kolejną innowację z listy powyżej lub z katalogu.`
              : "Wybierz innowacje z list powyżej lub przypnij je bezpośrednio w katalogu „Szukaj innowacji”."
          }
          actions={
            <>
              {allSummaries.length >= 2 ? (
                <Button type="button" variant="filled" onClick={handleLoadSample}>
                  Załaduj przykład (2 innowacje)
                </Button>
              ) : null}
              <Link
                href="/innovations"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <span>Katalog innowacji</span>
                <ArrowRightIcon size={15} weight="bold" />
              </Link>
            </>
          }
        />
      ) : (
        <div className="space-y-5">
          {keyDifferences.length > 0 ? (
            <Banner
              tone="info"
              appearance="subtle"
              title="Kluczowe różnice między wybranymi rozwiązaniami"
            >
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs sm:text-sm">
                {keyDifferences.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </Banner>
          ) : null}

          <div
            role="region"
            aria-label="Tabela porównawcza innowacji"
            tabIndex={0}
            className="overflow-x-auto rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] print:overflow-visible print:border-0 print:shadow-none"
          >
            <table className="w-full min-w-[700px] border-collapse text-left text-xs sm:text-sm">
              <caption className="sr-only">
                Porównanie wybranych innowacji
              </caption>
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-canvas)]">
                  <th
                    scope="col"
                    className="w-52 p-4 align-bottom text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)] md:sticky md:left-0 md:z-20 md:bg-[var(--color-canvas)] md:shadow-[1px_0_0_var(--color-border-subtle)]"
                  >
                    Kryterium
                  </th>
                  {details.map((d, index) => (
                    <th key={d.slug} scope="col" className="min-w-[220px] p-4 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <Badge tone={AREA_BADGE_TONE[d.primary_area]} size="compact">
                          {PRIMARY_AREA_LABELS[d.primary_area]}
                        </Badge>
                        <IconButton
                          type="button"
                          size="compact"
                          variant="ghost"
                          className="print:hidden"
                          aria-label={`Usuń „${d.title_pl}” z porównania`}
                          onClick={() => handleSlotChange(index, "")}
                        >
                          <CloseIcon size={15} />
                        </IconButton>
                      </div>
                      <div className="mt-2 space-y-1">
                        <Link
                          href={`/innovations/${d.slug}`}
                          className="inline-block text-base font-extrabold tracking-tight text-[var(--color-accent-text)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                        >
                          {d.title_pl}
                        </Link>
                        <p className="text-xs font-normal text-[var(--color-text-muted)]">
                          {d.organization_name}
                          {d.origin_location ? ` · ${d.origin_location}` : ""}
                        </p>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                {matrixRows.map((row, rowIdx) => (
                  <tr
                    key={row.id}
                    className={
                      rowIdx % 2 === 1
                        ? "bg-[var(--color-canvas)]/50"
                        : "bg-[var(--color-surface)]"
                    }
                  >
                    <th
                      scope="row"
                      className="bg-[var(--color-surface)] p-4 align-top font-semibold text-[var(--color-text)] md:sticky md:left-0 md:z-10 md:shadow-[1px_0_0_var(--color-border-subtle)]"
                    >
                      {row.label}
                    </th>
                    {details.map((d) => (
                      <td key={d.slug} className="p-4 align-top">
                        {row.renderCell(d)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
