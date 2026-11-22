"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useState } from "react";
import { InnovationCardCompact } from "@/components/InnovationCardCompact";
import { InnovationAreaVisual } from "@/components/InnovationVisuals";
import { useSession } from "@/components/SessionProvider";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Badge,
  Banner,
  Button,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  CompareIcon,
  CsvIcon,
  DefinitionList,
  EmptyState,
  ErrorState,
  GaugeIcon,
  IconButton,
  LoadingState,
  PdfIcon,
  Popover,
  ShareIcon,
  Sheet,
  StarIcon,
  StarSlashedIcon,
  TargetIcon,
} from "@/components/ui";
import { scoreToFiveScale } from "@/lib/innovation-metrics";
import { setNavBarOverride } from "@/lib/navbar-override";
import {
  createImplementationPlan,
  fetchImplementationPlans,
  fetchInnovationDetail,
  fetchInnovationFullDetail,
  fetchInnovations,
  fetchSavedInnovations,
  removeSavedInnovation,
  saveInnovation,
  updateProfile,
  type ImplementationPlan,
  type InnovationDetail,
  type InnovationRegisteredDetail,
  type InnovationSummary,
} from "@/lib/radar-api";
import { downloadCsvFile, formatInnovationCardCsv } from "@/lib/radar-export";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  EVIDENCE_KIND_LABELS,
  ORG_TYPE_LABELS,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type EvidenceKind,
  type OrgType,
  type PrimaryArea,
} from "@/lib/radar-labels";

const EVIDENCE_BADGE_TONE: Record<
  EvidenceKind,
  "success" | "info" | "neutral" | "warning" | "error"
> = {
  verified_fact: "success",
  source_declaration: "info",
  system_calculation: "neutral",
  ai_estimate: "warning",
  missing_info: "error",
};

type DetailTabId = "overview" | "effects" | "sources" | "similar";

const DETAIL_TABS: Array<{ id: DetailTabId; label: string }> = [
  { id: "overview", label: "Opis rozwiązania" },
  { id: "effects", label: "Efekty i wskaźniki" },
  { id: "sources", label: "Źródła i materiały" },
  { id: "similar", label: "Podobne rozwiązania" },
];

const AREA_BADGE_TONE: Record<PrimaryArea, "info" | "lime" | "neutral"> = {
  technological: "info",
  educational: "lime",
  administrative: "neutral",
};

function parseScaleCount(scale: string, fallback: number): number {
  const digits = scale.replace(/\s+/g, "").match(/\d+/);
  if (!digits) return fallback;
  const parsed = Number(digits[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function InnovationDetailInner() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const slug = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoDeploy = searchParams.get("deploy") === "1";
  const tabBaseId = useId();

  const { auth, refreshAuth, compareSlugs, toggleCompare, solveContext } =
    useSession();

  const [detail, setDetail] = useState<InnovationDetail | null>(null);
  const [fullDetail, setFullDetail] =
    useState<InnovationRegisteredDetail | null>(null);
  const [existingPlan, setExistingPlan] = useState<ImplementationPlan | null>(null);
  const [savedSlugs, setSavedSlugs] = useState<Set<string>>(() => new Set());
  const [plannedSlugs, setPlannedSlugs] = useState<Set<string>>(() => new Set());
  const [similarItems, setSimilarItems] = useState<InnovationSummary[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTabId>("overview");

  // Level-3 Questionnaire + Plan generation state (rendered inside Sheet)
  const [deploySheetOpen, setDeploySheetOpen] = useState(false);
  const [orgType, setOrgType] = useState<OrgType>("public_institution");
  const [orgName, setOrgName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [deploymentLocation, setDeploymentLocation] = useState("");
  const [usersCount, setUsersCount] = useState(250);
  const [currentApproach, setCurrentApproach] = useState("");
  const [availableResources, setAvailableResources] = useState("");
  const [teamCompetencies, setTeamCompetencies] = useState("");
  const [targetTimeline, setTargetTimeline] = useState("");
  const [keyConstraints, setKeyConstraints] = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchInnovationDetail(slug)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        setError("");
        void fetchInnovations({ primary_area: data.primary_area })
          .then((list) => {
            if (!active) return;
            const others = list.filter((item) => item.slug !== data.slug);
            const sameSector = others.filter((item) =>
              item.sectors.some((s) => data.sectors.includes(s)),
            );
            setSimilarItems((sameSector.length >= 2 ? sameSector : others).slice(0, 3));
          })
          .catch(() => {});
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Nie udało się pobrać karty innowacji.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    let active = true;
    if (!auth.authenticated) {
      return () => {
        active = false;
      };
    }
    void Promise.all([
      fetchInnovationFullDetail(slug),
      fetchImplementationPlans().catch(() => []),
      fetchSavedInnovations().catch(() => []),
    ])
      .then(([data, plans, saved]) => {
        if (!active) return;
        setFullDetail(data);
        const foundPlan = plans.find((p) => p.innovation.slug === slug) ?? null;
        setExistingPlan(foundPlan);
        setSavedSlugs(new Set(saved.map((s) => s.innovation.slug)));
        setPlannedSlugs(new Set(plans.map((p) => p.innovation.slug)));
        setIsSaved(saved.some((s) => s.innovation.slug === slug));

        const p = auth.profile;
        setOrgType(
          (solveContext.organization_type ||
            p?.organization_type ||
            "public_institution") as OrgType,
        );
        setOrgName(p?.organization_name || "");
        setRoleTitle(p?.role_title || "");
        setDeploymentLocation(
          solveContext.deployment_location || p?.deployment_location || "",
        );
        setUsersCount(
          parseScaleCount(solveContext.problem_scale, p?.potential_users_count || 250),
        );
        setCurrentApproach(p?.current_approach || "");
        setAvailableResources(p?.available_resources || "");
        setTeamCompetencies(p?.team_competencies || "");
        setTargetTimeline(p?.target_timeline || "");
        setKeyConstraints(p?.key_constraints || "");

        if (autoDeploy) {
          setDeploySheetOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [auth, autoDeploy, slug, solveContext]);

  function handleShare() {
    void navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function handleExportCsv() {
    if (!detail) return;
    downloadCsvFile(
      `${detail.slug}-karta.csv`,
      formatInnovationCardCsv(detail),
    );
  }

  function handleExportPdf() {
    window.print();
  }

  const handleToggleFavorite = useCallback(async () => {
    if (!detail) return;
    if (!auth.authenticated) {
      router.push(`/login?next=${encodeURIComponent(`/innovations/${slug}`)}`);
      return;
    }
    if (savingBookmark) return;
    setSavingBookmark(true);
    try {
      if (isSaved) {
        await removeSavedInnovation(detail.slug);
        setIsSaved(false);
      } else {
        await saveInnovation(detail.slug);
        setIsSaved(true);
      }
    } catch {
      // ignore transient toggle error
    } finally {
      setSavingBookmark(false);
    }
  }, [auth.authenticated, detail, isSaved, router, savingBookmark, slug]);

  const handleExploreDeployment = useCallback(() => {
    if (!auth.authenticated) {
      router.push(
        `/register?next=${encodeURIComponent(`/innovations/${slug}?deploy=1`)}`,
      );
      return;
    }
    setDeploySheetOpen(true);
  }, [auth.authenticated, router, slug]);

  const isPinnedForNav = detail ? compareSlugs.includes(detail.slug) : false;

  useEffect(() => {
    if (!detail) {
      setNavBarOverride(null);
      return;
    }

    const detailSlug = detail.slug;
    const favLabel = !auth.authenticated
      ? "Zaloguj się, aby dodać do ulubionych"
      : savingBookmark
        ? "Aktualizowanie…"
        : isSaved
          ? "Usuń z ulubionych"
          : "Dodaj do ulubionych";

    const favButtonClass = isSaved
      ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)] hover:border-[var(--color-error-border)] hover:bg-[var(--color-error-bg)] hover:text-[var(--color-error-border)]"
      : undefined;

    setNavBarOverride({
      pathname,
      title: detail.title_pl,
      truncateTitle: true,
      hideSearch: true,
      actions: (
        <div className="flex items-center gap-2">
          <Button
            tone="lime"
            leadingIcon={<CompareIcon size={17} />}
            onClick={() => toggleCompare(detailSlug)}
            aria-pressed={isPinnedForNav}
          >
            {isPinnedForNav ? "W porównaniu ✓" : "Porównaj"}
          </Button>
          <IconButton
            variant="outline"
            disabled={savingBookmark}
            aria-label={favLabel}
            aria-pressed={isSaved}
            className={favButtonClass}
            onClick={() => void handleToggleFavorite()}
          >
            {isSaved ? (
              <StarSlashedIcon size={18} />
            ) : (
              <StarIcon size={18} weight="regular" />
            )}
          </IconButton>
        </div>
      ),
      mobileActions: (
        <>
          <IconButton
            tone={isPinnedForNav ? "lime" : "neutral"}
            variant={isPinnedForNav ? "filled" : "outline"}
            aria-label={isPinnedForNav ? "Usuń z porównania" : "Porównaj"}
            aria-pressed={isPinnedForNav}
            onClick={() => toggleCompare(detailSlug)}
          >
            <CompareIcon size={18} />
          </IconButton>
          <IconButton
            variant="outline"
            disabled={savingBookmark}
            aria-label={favLabel}
            aria-pressed={isSaved}
            className={favButtonClass}
            onClick={() => void handleToggleFavorite()}
          >
            {isSaved ? (
              <StarSlashedIcon size={18} />
            ) : (
              <StarIcon size={18} weight="regular" />
            )}
          </IconButton>
        </>
      ),
    });

    return () => {
      setNavBarOverride(null);
    };
  }, [
    auth.authenticated,
    detail,
    handleToggleFavorite,
    isPinnedForNav,
    isSaved,
    pathname,
    savingBookmark,
    toggleCompare,
  ]);

  async function handleGeneratePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setSubmittingPlan(true);
    setError("");
    try {
      await updateProfile({
        organization_type: orgType,
        organization_name: orgName,
        role_title: roleTitle,
        deployment_location: deploymentLocation,
        potential_users_count: Number(usersCount) || 100,
        current_approach: currentApproach,
        available_resources: availableResources,
        team_competencies: teamCompetencies,
        target_timeline: targetTimeline,
        key_constraints: keyConstraints,
      });
      await saveInnovation(detail.slug);
      const plan = await createImplementationPlan({
        innovation_slug: detail.slug,
        comparison_slugs: compareSlugs.length ? compareSlugs : [detail.slug],
      });
      await refreshAuth();
      router.push(`/workspace/plans/${plan.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się wygenerować planu.",
      );
    } finally {
      setSubmittingPlan(false);
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const currentIndex = DETAIL_TABS.findIndex((t) => t.id === activeTab);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? DETAIL_TABS.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % DETAIL_TABS.length
            : (currentIndex - 1 + DETAIL_TABS.length) % DETAIL_TABS.length;
    const nextTab = DETAIL_TABS[nextIndex];
    setActiveTab(nextTab.id);
    const btn = document.getElementById(`${tabBaseId}-tab-${nextTab.id}`);
    btn?.focus();
  }

  if (loading) {
    return (
      <LoadingState
        label="Ładowanie karty innowacji…"
        description="Pobieramy opis, dowody, źródła oraz poziom gotowości."
      />
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <ErrorState message={error || "Nie znaleziono innowacji."} />
        <Link
          href="/innovations"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--color-accent-text)] underline"
        >
          <ArrowLeftIcon size={16} />
          <span>Powrót do katalogu</span>
        </Link>
      </div>
    );
  }

  const prefilledFromSearch = Boolean(
    solveContext.organization_type ||
      solveContext.deployment_location ||
      solveContext.problem_scale,
  );
  const potentialRating = scoreToFiveScale(detail.scores?.application_potential);

  return (
    <div className="space-y-6">
      {/* Hero Split Card */}
      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <InnovationAreaVisual
              primaryArea={detail.primary_area}
              size="hero"
              topLeft={
                <Badge
                  tone={
                    detail.verification_status === "verified"
                      ? "success"
                      : detail.verification_status === "conflict"
                        ? "error"
                        : "warning"
                  }
                  size="compact"
                >
                  {VERIFICATION_LABELS[detail.verification_status]}
                </Badge>
              }
              bottomLeft={
                detail.oslo_compliant ? (
                  <Badge tone="neutral" size="compact">
                    Zgodność z metodologią Oslo
                  </Badge>
                ) : null
              }
            />
          </div>

          <div className="space-y-4 lg:col-span-7">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone={AREA_BADGE_TONE[detail.primary_area]}>
                {PRIMARY_AREA_LABELS[detail.primary_area]}
              </Badge>
              {detail.innovation_character.map((c) => (
                <Badge key={c} tone="neutral" variant="outline">
                  {CHARACTER_LABELS[c]}
                </Badge>
              ))}
              <Badge tone="neutral">
                {DEPLOYMENT_LABELS[detail.deployment_level]}
                {detail.trl !== null ? ` · TRL ${detail.trl}/9` : " · TRL nie dotyczy"}
              </Badge>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-3xl">
                {detail.title_pl}
              </h2>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)] sm:text-base">
                {detail.short_summary_pl}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 border-y border-[var(--color-border-subtle)] py-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-[var(--color-text-muted)]">Autor / Organizacja</dt>
                <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
                  {detail.organization_name}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Pochodzenie</dt>
                <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
                  {detail.origin_location}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Pozyskano</dt>
                <dd className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--color-text)]">
                  {detail.fetched_at}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--color-text-muted)]">Weryfikacja</dt>
                <dd className="mt-0.5 font-mono font-semibold tabular-nums text-[var(--color-text)]">
                  {detail.last_verified_at}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2.5 pt-1 print:hidden">
              <Button
                trailingIcon={<ArrowRightIcon size={16} />}
                onClick={handleExploreDeployment}
              >
                Zaplanuj wdrożenie
              </Button>

              <Popover
                title="Udostępnij i eksportuj"
                width={240}
                closeButton
                trigger={(triggerProps) => (
                  <IconButton
                    {...triggerProps}
                    variant="outline"
                    aria-label="Udostępnij lub eksportuj"
                  >
                    {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
                  </IconButton>
                )}
              >
                {(close) => (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleShare();
                        close();
                      }}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {copied ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
                      <span>{copied ? "Skopiowano link" : "Udostępnij"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        close();
                      }}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      <CsvIcon size={16} />
                      <span>Eksport CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        window.setTimeout(() => handleExportPdf(), 50);
                      }}
                      className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      <PdfIcon size={16} />
                      <span>Eksport PDF</span>
                    </button>
                  </div>
                )}
              </Popover>

              {copied ? (
                <span
                  role="status"
                  className="text-xs font-semibold text-[var(--color-success-text)]"
                >
                  Skopiowano link
                </span>
              ) : null}

              {compareSlugs.length >= 2 ? (
                <Link
                  href="/compare"
                  className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-3.5 text-xs font-semibold text-[var(--color-info-text)] hover:opacity-90"
                >
                  Otwórz porównanie ({compareSlugs.length}) →
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* 4 KPI Strip */}
      <section
        aria-label="Kluczowe parametry innowacji"
        className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] text-[var(--color-text)]">
            <ChartBarIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              Potencjał wdrożenia
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[var(--color-text)]">
              {potentialRating.fiveScaleLabel} / 5{" "}
              {potentialRating.percent !== null ? (
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  ({potentialRating.percent}%)
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] text-[var(--color-text)]">
            <GaugeIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              Poziom gotowości
            </div>
            <div className="mt-0.5 truncate text-base font-bold text-[var(--color-text)]">
              {DEPLOYMENT_LABELS[detail.deployment_level]}
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              {detail.trl !== null ? `TRL ${detail.trl}/9` : "TRL nie dotyczy"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] text-[var(--color-text)]">
            <TargetIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              Zdolność transferu
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[var(--color-text)]">
              {detail.scores?.transferability ?? "—"}%
            </div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              Innowacyjność: {detail.scores?.innovativeness ?? "—"}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] text-[var(--color-text)]">
            <ClockIcon size={22} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[var(--color-text-muted)]">
              Wiarygodność źródeł
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-[var(--color-text)]">
              {detail.scores?.credibility ?? "—"}%
            </div>
            <div className="truncate text-[11px] text-[var(--color-text-muted)]">
              {VERIFICATION_LABELS[detail.verification_status]}
            </div>
          </div>
        </div>
      </section>

      {/* Tabbed Navigation Bar */}
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden print:hidden">
        <div
          role="tablist"
          aria-label="Sekcje karty innowacji"
          onKeyDown={handleTabKeyDown}
          className="flex w-max min-w-full flex-nowrap gap-1 border-b border-[var(--color-border-subtle)] sm:gap-2"
        >
          {DETAIL_TABS.map((t) => {
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`${tabBaseId}-tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${tabBaseId}-panel-${t.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={(event) => {
                  setActiveTab(t.id);
                  event.currentTarget.scrollIntoView({
                    behavior: "smooth",
                    inline: "nearest",
                    block: "nearest",
                  });
                }}
                className={[
                  "-mb-px min-h-11 shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                  selected
                    ? "border-[var(--color-accent)] font-bold text-[var(--color-text)]"
                    : "border-transparent font-medium text-[var(--color-text-muted)] hover:border-[var(--color-border)] hover:text-[var(--color-text)]",
                ].join(" ")}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Opis rozwiązania */}
      <section
        id={`${tabBaseId}-panel-overview`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-overview`}
        className={activeTab === "overview" ? "space-y-6" : "hidden space-y-6 print:block"}
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-6 lg:col-span-7">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                Rozwiązywany problem
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {detail.problem_pl}
              </p>
            </div>

            <div className="space-y-1.5 border-t border-[var(--color-border-subtle)] pt-4">
              <h3 className="text-base font-bold text-[var(--color-text)]">
                Opis rozwiązania
              </h3>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                {detail.solution_pl}
              </p>
            </div>

            {detail.strengths.length > 0 || detail.risks.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 border-t border-[var(--color-border-subtle)] pt-4 sm:grid-cols-2">
                {detail.strengths.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Mocne strony
                    </h4>
                    <ul className="list-disc space-y-1.5 pl-4 text-sm text-[var(--color-text)]">
                      {detail.strengths.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {detail.risks.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                      Ryzyka i warunki
                    </h4>
                    <ul className="list-disc space-y-1.5 pl-4 text-sm text-[var(--color-text)]">
                      {detail.risks.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-5">
            <DefinitionList
              items={[
                {
                  id: "beneficiaries",
                  label: "Grupy beneficjentów",
                  layout: "stacked",
                  value: (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {detail.beneficiary_groups.map((b) => (
                        <Badge key={b} tone="neutral" size="compact">
                          {BENEFICIARY_LABELS[b] ?? b}
                        </Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  id: "sectors",
                  label: "Branże",
                  layout: "stacked",
                  value: detail.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", "),
                },
                {
                  id: "org-types",
                  label: "Dla organizacji",
                  layout: "stacked",
                  value: detail.target_org_types
                    .map((o) => ORG_TYPE_LABELS[o] ?? o)
                    .join(", "),
                },
                {
                  id: "verification-method",
                  label: "Sposób weryfikacji",
                  layout: "stacked",
                  value: detail.verification_method,
                },
                ...(detail.required_resources.length > 0
                  ? [
                      {
                        id: "required-resources",
                        label: "Wymagane zasoby",
                        layout: "stacked" as const,
                        value: (
                          <ul className="list-disc space-y-1 pl-4 text-xs font-normal text-[var(--color-text)]">
                            {detail.required_resources.map((res, idx) => (
                              <li key={idx}>{res}</li>
                            ))}
                          </ul>
                        ),
                      },
                    ]
                  : []),
                ...(detail.partner_archetypes.length > 0
                  ? [
                      {
                        id: "partner-archetypes",
                        label: "Archetypy partnerów",
                        layout: "stacked" as const,
                        value: detail.partner_archetypes.join(", "),
                      },
                    ]
                  : []),
                ...(detail.tags.length > 0
                  ? [
                      {
                        id: "tags",
                        label: "Słowa kluczowe",
                        layout: "stacked" as const,
                        value: (
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {detail.tags.map((tag) => (
                              <Badge key={tag} tone="neutral" variant="outline" size="compact">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </section>

      {/* Tab 2: Efekty i wskaźniki */}
      <section
        id={`${tabBaseId}-panel-effects`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-effects`}
        className={activeTab === "effects" ? "space-y-5" : "hidden space-y-5 print:block"}
      >
        {detail.missing_info.map((m, idx) => (
          <Banner key={`miss-${idx}`} tone="warning" appearance="tinted" title="Brakująca informacja w źródłach">
            {m}
          </Banner>
        ))}
        {detail.conflicting_info.map((c, idx) => (
          <Banner key={`conf-${idx}`} tone="error" appearance="tinted" title="Rozbieżność między źródłami">
            {c}
          </Banner>
        ))}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            {detail.metrics.length > 0 ? (
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Mierniki efektów i sukcesu
                </h3>
                <ul className="list-disc space-y-1.5 pl-4 text-sm text-[var(--color-text-muted)]">
                  {detail.metrics.map((metric, idx) => (
                    <li key={idx}>{metric}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <DefinitionList
              items={[
                {
                  id: "score-app",
                  label: "Potencjał zastosowania",
                  value: `${detail.scores?.application_potential ?? "—"}%`,
                },
                {
                  id: "score-inn",
                  label: "Innowacyjność",
                  value: `${detail.scores?.innovativeness ?? "—"}%`,
                },
                {
                  id: "score-tr",
                  label: "Zdolność transferu",
                  value: `${detail.scores?.transferability ?? "—"}%`,
                },
                {
                  id: "score-cred",
                  label: "Wiarygodność źródeł",
                  value: `${detail.scores?.credibility ?? "—"}%`,
                  description: "Wskaźniki wyliczone automatycznie na podstawie opisów i dowodów.",
                },
              ]}
            />
          </div>

          <div className="space-y-3 lg:col-span-7">
            <h3 className="text-base font-bold text-[var(--color-text)]">
              Dowody i pochodzenie informacji
            </h3>
            {detail.evidences.length === 0 ? (
              <EmptyState
                title="Brak szczegółowych wpisów dowodowych"
                description="Sprawdź odnośniki w zakładce Źródła i materiały."
              />
            ) : (
              <ul className="space-y-3 text-sm">
                {detail.evidences.map((ev) => (
                  <li
                    key={ev.id}
                    className="space-y-1.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={EVIDENCE_BADGE_TONE[ev.kind]} size="compact">
                        {EVIDENCE_KIND_LABELS[ev.kind]}
                      </Badge>
                      {ev.source_registry ? (
                        <span className="font-medium text-[var(--color-text-muted)]">
                          {ev.source_registry}
                        </span>
                      ) : null}
                      {ev.confidence ? (
                        <span className="text-[var(--color-text-muted)]">
                          · Pewność: {ev.confidence}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-[var(--color-text)]">{ev.text_pl}</p>
                    {ev.limitation_note ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Ograniczenie: {ev.limitation_note}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Tab 4: Źródła i materiały */}
      <section
        id={`${tabBaseId}-panel-sources`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-sources`}
        className={activeTab === "sources" ? "space-y-4" : "hidden space-y-4 print:block"}
      >
        {detail.sources.length === 0 ? (
          <EmptyState
            title="Brak odnośników źródłowych"
            description="Ten rekord nie ma jeszcze podpiętych publicznych rejestrów."
          />
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {detail.sources.map((src) => (
              <li
                key={src.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <span className="text-sm font-bold text-[var(--color-text)]">
                      {src.label}
                    </span>
                    <Badge
                      tone={src.is_available ? "success" : "warning"}
                      size="compact"
                    >
                      {src.is_available ? "Źródło aktywne" : "Chwilowo niedostępne"}
                    </Badge>
                  </div>
                  <div className="text-[var(--color-text-muted)]">
                    {src.registry} · Pozyskano: {src.fetched_at} · Weryfikacja:{" "}
                    {src.last_verified_at}
                  </div>
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block break-all font-semibold text-[var(--color-accent-text)] underline"
                >
                  {src.url} ↗
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tab 5: Podobne rozwiązania */}
      <section
        id={`${tabBaseId}-panel-similar`}
        role="tabpanel"
        aria-labelledby={`${tabBaseId}-tab-similar`}
        className={activeTab === "similar" ? "space-y-4 print:hidden" : "hidden space-y-4 print:hidden"}
      >
        {similarItems.length === 0 ? (
          <EmptyState
            title="Brak innych rozwiązań w tym obszarze"
            description="Sprawdź pełny katalog, aby porównać innowacje z pokrewnych branż."
            actions={
              <Link
                href="/innovations"
                className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
              >
                Przejdź do katalogu
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {similarItems.map((item) => (
              <InnovationCardCompact
                key={item.slug}
                innovation={item}
                isSaved={savedSlugs.has(item.slug)}
                hasPlan={plannedSlugs.has(item.slug)}
                onSaved={(s) => setSavedSlugs((prev) => new Set([...prev, s]))}
                onRemoved={(s) =>
                  setSavedSlugs((prev) => {
                    const next = new Set(prev);
                    next.delete(s);
                    return next;
                  })
                }
              />
            ))}
          </div>
        )}
      </section>

      {/* Deployment Planning Sheet */}
      <Sheet
        open={deploySheetOpen}
        onClose={() => setDeploySheetOpen(false)}
        title="Zaplanuj wdrożenie"
        busy={submittingPlan}
        detents={["medium", "large"]}
        confirmAction={{
          label: submittingPlan ? "Generowanie planu…" : "Wygeneruj plan w 5 fazach",
          form: "org-questionnaire-form",
          loading: submittingPlan,
        }}
      >
        <div className="space-y-5">
          {existingPlan ? (
            <Banner
              tone="info"
              appearance="tinted"
              title={`Aktywny ${PLAN_VARIANT_LABELS[existingPlan.variant]}`}
              actions={[
                <Link
                  key="open-plan"
                  href={`/workspace/plans/${existingPlan.id}`}
                  onClick={() => setDeploySheetOpen(false)}
                  className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-accent)]"
                >
                  Otwórz istniejący plan →
                </Link>,
              ]}
            >
              Masz już wygenerowany plan dla tej innowacji. Możesz go otworzyć lub wygenerować nowy wariant poniżej.
            </Banner>
          ) : null}

          {fullDetail?.contact_info && Object.keys(fullDetail.contact_info).length > 0 ? (
            <Banner
              tone="success"
              appearance="tinted"
              title="Zweryfikowany kontakt wdrożeniowy"
            >
              <div className="space-y-0.5 text-xs">
                <div className="font-bold">{fullDetail.contact_info.unit_name}</div>
                {fullDetail.contact_info.contact_person ? (
                  <div>{fullDetail.contact_info.contact_person}</div>
                ) : null}
                <div className="font-mono">
                  {[fullDetail.contact_info.email, fullDetail.contact_info.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            </Banner>
          ) : null}

          {detail.suggested_next_step ? (
            <p className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
              <strong className="text-[var(--color-text)]">Sugerowany następny krok:</strong>{" "}
              {detail.suggested_next_step}
            </p>
          ) : null}

          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Ankieta organizacji — kontekst wdrożenia
            </h3>
            <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
              {prefilledFromSearch
                ? "Część pól uzupełniono z wyszukiwarki problemów. "
                : ""}
              Na podstawie gotowości innowacji i tego formularza system dobierze wariant planu (walidacja, pilotaż albo transfer i wdrożenie).
            </p>
          </div>

          <form
            id="org-questionnaire-form"
            onSubmit={handleGeneratePlan}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label htmlFor="q-org-type" className="mb-1 block text-xs font-semibold">
                  Typ organizacji
                </label>
                <select
                  id="q-org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as OrgType)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                >
                  {Object.entries(ORG_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="q-org-name" className="mb-1 block text-xs font-semibold">
                  Nazwa organizacji
                </label>
                <input
                  id="q-org-name"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="np. Gmina Trzebownisko"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-role" className="mb-1 block text-xs font-semibold">
                  Twoja rola
                </label>
                <input
                  id="q-role"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="np. Sołtys / Dyrektor / Kierownik IT"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-loc" className="mb-1 block text-xs font-semibold">
                  Lokalizacja wdrożenia
                </label>
                <input
                  id="q-loc"
                  required
                  value={deploymentLocation}
                  onChange={(e) => setDeploymentLocation(e.target.value)}
                  placeholder="np. Trzebownisko, Podkarpackie"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-users" className="mb-1 block text-xs font-semibold">
                  Liczba potencjalnych użytkowników
                </label>
                <input
                  id="q-users"
                  type="number"
                  min={1}
                  required
                  value={usersCount}
                  onChange={(e) => setUsersCount(Number(e.target.value))}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-timeline" className="mb-1 block text-xs font-semibold">
                  Zakładany termin
                </label>
                <input
                  id="q-timeline"
                  value={targetTimeline}
                  onChange={(e) => setTargetTimeline(e.target.value)}
                  placeholder="np. Q1 2027"
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-current" className="mb-1 block text-xs font-semibold">
                  Obecny sposób rozwiązania problemu
                </label>
                <input
                  id="q-current"
                  value={currentApproach}
                  onChange={(e) => setCurrentApproach(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-resources" className="mb-1 block text-xs font-semibold">
                  Dostępne zasoby
                </label>
                <input
                  id="q-resources"
                  value={availableResources}
                  onChange={(e) => setAvailableResources(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-comp" className="mb-1 block text-xs font-semibold">
                  Kompetencje zespołu
                </label>
                <input
                  id="q-comp"
                  value={teamCompetencies}
                  onChange={(e) => setTeamCompetencies(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="q-constraints" className="mb-1 block text-xs font-semibold">
                  Najważniejsze ograniczenia
                </label>
                <input
                  id="q-constraints"
                  value={keyConstraints}
                  onChange={(e) => setKeyConstraints(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                />
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm font-semibold text-[var(--color-error-text)]">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </Sheet>
    </div>
  );
}

export default function InnovationDetailPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          label="Ładowanie karty innowacji…"
          description="Przygotowujemy szczegóły rozwiązania."
        />
      }
    >
      <InnovationDetailInner />
    </Suspense>
  );
}
