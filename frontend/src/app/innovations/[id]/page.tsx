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
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandChecklistIcon,
  BrandLimeBurstIcon,
  BuildingsIcon,
  Button,
  ChartBarIcon,
  CheckIcon,
  ClockIcon,
  CompareIcon,
  CsvIcon,
  DefinitionList,
  Dropdown,
  EmptyState,
  ErrorState,
  GaugeIcon,
  IconButton,
  LoadingState,
  NumberInput,
  PdfIcon,
  Popover,
  ShareIcon,
  Sheet,
  StarIcon,
  StarSlashedIcon,
  TargetIcon,
  TextArea,
  TextInput,
} from "@/components/ui";
import {
  parseUsersCountInput,
  resolvePlanVariantPreview,
} from "@/lib/implementation-plan";
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
  getOsloDisplay,
  getProvenanceMeta,
  ORG_TYPE_LABELS,
  OSLO_CRITERION_LABELS,
  OSLO_CRITERION_TONE,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
  type EvidenceKind,
  type OrgType,
  type PlanVariant,
  type PrimaryArea,
} from "@/lib/radar-labels";

const PLAN_VARIANT_TONE: Record<PlanVariant, "info" | "lime" | "success"> = {
  validation: "info",
  pilot: "lime",
  transfer_deployment: "success",
};

const ORG_TYPE_OPTIONS = Object.entries(ORG_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

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
  const [usersCountDraft, setUsersCountDraft] = useState("250");
  const [usersCountError, setUsersCountError] = useState("");
  const [currentApproach, setCurrentApproach] = useState("");
  const [availableResources, setAvailableResources] = useState("");
  const [teamCompetencies, setTeamCompetencies] = useState("");
  const [targetTimeline, setTargetTimeline] = useState("");
  const [keyConstraints, setKeyConstraints] = useState("");
  const [submittingPlan, setSubmittingPlan] = useState(false);
  const [planError, setPlanError] = useState("");

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
        setUsersCountDraft(
          String(
            parseScaleCount(
              solveContext.problem_scale,
              p?.potential_users_count || 250,
            ),
          ),
        );
        setUsersCountError("");
        setPlanError("");
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
    setPlanError("");
    setUsersCountError("");
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
    const parsedUsersCount = parseUsersCountInput(usersCountDraft);
    if (parsedUsersCount === null) {
      setUsersCountError("Podaj dodatnią liczbę odbiorców (np. 250).");
      return;
    }
    setUsersCountError("");
    setSubmittingPlan(true);
    setPlanError("");
    try {
      await updateProfile({
        organization_type: orgType,
        organization_name: orgName.trim(),
        role_title: roleTitle.trim(),
        deployment_location: deploymentLocation.trim(),
        potential_users_count: parsedUsersCount,
        current_approach: currentApproach.trim(),
        available_resources: availableResources.trim(),
        team_competencies: teamCompetencies.trim(),
        target_timeline: targetTimeline.trim(),
        key_constraints: keyConstraints.trim(),
      });
      await saveInnovation(detail.slug);
      const plan = await createImplementationPlan({
        innovation_slug: detail.slug,
        comparison_slugs: compareSlugs.length ? compareSlugs : [detail.slug],
      });
      await refreshAuth();
      router.push(`/workspace/plans/${plan.id}`);
    } catch (err) {
      setPlanError(
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
  const variantPreview = resolvePlanVariantPreview(
    detail.deployment_level,
    detail.trl,
  );
  const deploymentProv = getProvenanceMeta(
    detail.classification_provenance,
    "deployment_level",
  );
  const trlProv = getProvenanceMeta(
    detail.classification_provenance,
    "trl",
    detail.trl !== null,
  );
  const osloDisplay = getOsloDisplay(
    detail.oslo_compliant,
    detail.oslo_assessment,
    detail.classification_provenance,
  );

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
                <Badge tone={osloDisplay.tone} size="compact">
                  {osloDisplay.badgeLabel}
                </Badge>
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
              <Badge tone={deploymentProv.tone}>
                {DEPLOYMENT_LABELS[detail.deployment_level]} · {deploymentProv.shortLabel}
              </Badge>
              <Badge tone={trlProv.tone}>
                {detail.trl !== null
                  ? `TRL ${detail.trl}/9 · ${trlProv.shortLabel}`
                  : "TRL nie określono"}
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
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
              <span>{deploymentProv.label}</span>
              <span aria-hidden="true">·</span>
              <span>
                {detail.trl !== null
                  ? `TRL ${detail.trl}/9 (${trlProv.label})`
                  : "TRL nie określono (brak w źródle)"}
              </span>
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

            <div className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Ocena zgodności z Oslo Manual 2018
                </h3>
                <Badge tone={osloDisplay.tone} size="compact">
                  {osloDisplay.badgeLabel}
                </Badge>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                Metoda: <strong className="text-[var(--color-text)]">{osloDisplay.methodLabel}</strong>
              </p>
              <div className="space-y-2.5 border-t border-[var(--color-border-subtle)] pt-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      1. Nowość lub istotne ulepszenie
                    </span>
                    <Badge tone={OSLO_CRITERION_TONE[osloDisplay.noveltyStatus]} size="compact">
                      {OSLO_CRITERION_LABELS[osloDisplay.noveltyStatus]}
                    </Badge>
                  </div>
                  <p className="leading-relaxed text-[var(--color-text-muted)]">
                    {osloDisplay.noveltyReason}
                  </p>
                  {osloDisplay.noveltyExcerpt ? (
                    <blockquote className="border-l-2 border-[var(--color-border)] pl-2.5 text-[11px] italic text-[var(--color-text-muted)]">
                      „{osloDisplay.noveltyExcerpt}”
                    </blockquote>
                  ) : null}
                </div>
                <div className="space-y-1 border-t border-[var(--color-border-subtle)] pt-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[var(--color-text)]">
                      2. Udostępnienie użytkownikom lub wdrożenie
                    </span>
                    <Badge
                      tone={OSLO_CRITERION_TONE[osloDisplay.availabilityStatus]}
                      size="compact"
                    >
                      {OSLO_CRITERION_LABELS[osloDisplay.availabilityStatus]}
                    </Badge>
                  </div>
                  <p className="leading-relaxed text-[var(--color-text-muted)]">
                    {osloDisplay.availabilityReason}
                  </p>
                </div>
              </div>
              {osloDisplay.limitations.length > 0 ? (
                <p className="border-t border-[var(--color-border-subtle)] pt-2.5 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                  Ograniczenie: {osloDisplay.limitations.join(" ")}
                </p>
              ) : null}
            </div>
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
        onClose={() => {
          if (submittingPlan) return;
          setPlanError("");
          setUsersCountError("");
          setDeploySheetOpen(false);
        }}
        title="Zaplanuj wdrożenie"
        busy={submittingPlan}
        closeOnBackdrop={!submittingPlan}
        detents={["medium", "large"]}
        initialDetent="large"
      >
        <div className="space-y-4">
          {/* Praktoteka Hero Context Card */}
          <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4">
            <BrandBlobSoftBlueIcon
              size={125}
              className="pointer-events-none absolute -top-10 -right-8 opacity-55"
            />
            <BrandBlobLimeIcon
              size={95}
              className="pointer-events-none absolute right-14 -bottom-10 hidden opacity-35 sm:block"
            />

            <div className="relative z-10 flex items-start gap-3.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-xs">
                <BrandLimeBurstIcon
                  size={16}
                  className="pointer-events-none absolute -top-2 -left-2 -rotate-45"
                />
                <BrandChecklistIcon size={28} />
              </div>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={PLAN_VARIANT_TONE[variantPreview.variant]}
                    size="compact"
                  >
                    {PLAN_VARIANT_LABELS[variantPreview.variant]} · 5 faz
                  </Badge>
                  <Badge tone="neutral" size="compact">
                    {DEPLOYMENT_LABELS[detail.deployment_level]}
                    {detail.trl !== null ? ` · TRL ${detail.trl}/9` : ""}
                  </Badge>
                  {prefilledFromSearch ? (
                    <Badge tone="info" variant="outline" size="compact">
                      Uzupełniono z wyszukiwarki
                    </Badge>
                  ) : null}
                </div>

                <h3 className="text-sm font-extrabold leading-snug tracking-tight text-[var(--color-text)]">
                  {detail.title_pl}
                </h3>
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                  {variantPreview.rationale}
                </p>
              </div>
            </div>

            {detail.suggested_next_step ? (
              <div className="relative z-10 mt-3 flex items-start gap-2 border-t border-[var(--color-border-subtle)] pt-2.5 text-xs">
                <TargetIcon
                  size={15}
                  className="mt-0.5 shrink-0 text-[var(--color-accent-text)]"
                />
                <p className="leading-relaxed text-[var(--color-text-muted)]">
                  <span className="font-bold text-[var(--color-text)]">
                    Sugerowany krok:
                  </span>{" "}
                  {detail.suggested_next_step}
                </p>
              </div>
            ) : null}
          </div>

          {existingPlan ? (
            <Banner
              tone="info"
              appearance="tinted"
              title={`Masz już aktywny ${PLAN_VARIANT_LABELS[existingPlan.variant].toLowerCase()}`}
              actions={[
                <Link
                  key="open-plan"
                  href={`/workspace/plans/${existingPlan.id}`}
                  onClick={() => setDeploySheetOpen(false)}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-3.5 py-2 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  <span>Otwórz aktywny plan</span>
                  <ArrowRightIcon size={14} weight="bold" />
                </Link>,
              ]}
            >
              Możesz wrócić do aktualnej checklisty albo wygenerować nowy plan poniżej.
            </Banner>
          ) : null}

          {fullDetail?.contact_info && Object.keys(fullDetail.contact_info).length > 0 ? (
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3.5 py-2.5 text-xs text-[var(--color-success-text)]">
              <div className="flex min-w-0 items-start gap-2.5">
                <BuildingsIcon size={16} className="mt-0.5 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">
                      {fullDetail.contact_info.unit_name || detail.organization_name}
                    </span>
                    <Badge tone="success" size="compact">
                      Kontakt wdrożeniowy
                    </Badge>
                  </div>
                  {fullDetail.contact_info.contact_person ? (
                    <p>{fullDetail.contact_info.contact_person}</p>
                  ) : null}
                  {fullDetail.contact_info.email || fullDetail.contact_info.phone ? (
                    <p className="font-mono text-[11px]">
                      {[fullDetail.contact_info.email, fullDetail.contact_info.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <form
            id="org-questionnaire-form"
            onSubmit={handleGeneratePlan}
            className="space-y-4"
          >
            {/* Section 1: Organization & Coordinator */}
            <fieldset className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4">
              <legend className="sr-only">Organizacja i osoba koordynująca</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] font-mono text-xs font-extrabold text-[var(--color-on-accent)]">
                    1
                  </span>
                  <h4 className="text-xs font-extrabold tracking-tight text-[var(--color-text)] sm:text-sm">
                    Organizacja i koordynator
                  </h4>
                </div>
                <span className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                  Podstawa profilu wdrożeniowego
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Dropdown
                  id="q-org-type"
                  label="Typ organizacji"
                  options={ORG_TYPE_OPTIONS}
                  value={orgType}
                  disabled={submittingPlan}
                  onValueChange={(value) => setOrgType(value as OrgType)}
                />
                <TextInput
                  id="q-org-name"
                  label="Nazwa organizacji"
                  required
                  disabled={submittingPlan}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="np. Gmina Trzebownisko"
                />
                <TextInput
                  id="q-role"
                  label="Twoja rola"
                  required
                  disabled={submittingPlan}
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="np. Sołtys / Dyrektor / Kierownik IT"
                />
                <TextInput
                  id="q-loc"
                  label="Lokalizacja wdrożenia"
                  required
                  disabled={submittingPlan}
                  value={deploymentLocation}
                  onChange={(e) => setDeploymentLocation(e.target.value)}
                  placeholder="np. Trzebownisko, Podkarpackie"
                />
              </div>
            </fieldset>

            {/* Section 2: Scale & Timeline */}
            <fieldset className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4">
              <legend className="sr-only">Skala odbiorców i zakładany termin</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-lime)] font-mono text-xs font-extrabold text-[var(--color-on-accent-lime)]">
                    2
                  </span>
                  <h4 className="text-xs font-extrabold tracking-tight text-[var(--color-text)] sm:text-sm">
                    Skala odbiorców i harmonogram
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <NumberInput
                  id="q-users"
                  label="Liczba odbiorców"
                  min={1}
                  step={1}
                  required
                  disabled={submittingPlan}
                  value={usersCountDraft}
                  error={usersCountError}
                  hint="Szacowana liczba użytkowników końcowych"
                  onChange={(e) => {
                    setUsersCountDraft(e.target.value);
                    if (usersCountError) setUsersCountError("");
                  }}
                />
                <TextInput
                  id="q-timeline"
                  label="Zakładany termin"
                  disabled={submittingPlan}
                  value={targetTimeline}
                  onChange={(e) => setTargetTimeline(e.target.value)}
                  placeholder="np. Q1 2027 lub za 3 miesiące"
                  hint="Opcjonalnie — trafia do planu kontaktu"
                />
              </div>
            </fieldset>

            {/* Section 3: Context, Resources & Constraints */}
            <fieldset className="space-y-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4">
              <legend className="sr-only">Kontekst wdrożeniowy i zasoby</legend>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] font-mono text-xs font-extrabold text-[var(--color-text)]">
                    3
                  </span>
                  <h4 className="text-xs font-extrabold tracking-tight text-[var(--color-text)] sm:text-sm">
                    Zasoby, zespół i ograniczenia
                  </h4>
                </div>
                <Badge tone="neutral" size="compact">
                  Opcjonalne · personalizuje fazy 1–3
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextArea
                  id="q-current"
                  label="Obecny sposób działania"
                  rows={2}
                  minRows={2}
                  maxRows={4}
                  autoGrow
                  resizable={false}
                  disabled={submittingPlan}
                  value={currentApproach}
                  onChange={(e) => setCurrentApproach(e.target.value)}
                  placeholder="np. Zgłoszenia telefoniczne i ręczny rejestr"
                />
                <TextArea
                  id="q-resources"
                  label="Dostępne zasoby"
                  rows={2}
                  minRows={2}
                  maxRows={4}
                  autoGrow
                  resizable={false}
                  disabled={submittingPlan}
                  value={availableResources}
                  onChange={(e) => setAvailableResources(e.target.value)}
                  placeholder="np. Budżet pilotażowy, 2 osoby IT, sala"
                />
                <TextArea
                  id="q-comp"
                  label="Kompetencje zespołu"
                  rows={2}
                  minRows={2}
                  maxRows={4}
                  autoGrow
                  resizable={false}
                  disabled={submittingPlan}
                  value={teamCompetencies}
                  onChange={(e) => setTeamCompetencies(e.target.value)}
                  placeholder="np. Koordynacja projektów, brak programisty"
                />
                <TextArea
                  id="q-constraints"
                  label="Najważniejsze ograniczenia"
                  rows={2}
                  minRows={2}
                  maxRows={4}
                  autoGrow
                  resizable={false}
                  disabled={submittingPlan}
                  value={keyConstraints}
                  onChange={(e) => setKeyConstraints(e.target.value)}
                  placeholder="np. Wymogi RODO, termin rozliczenia dotacji"
                />
              </div>
            </fieldset>

            {planError ? (
              <Banner tone="error" appearance="tinted" announcement="assertive">
                {planError}
              </Banner>
            ) : null}

            <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3.5 sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:px-6">
              <Button
                variant="outline"
                disabled={submittingPlan}
                onClick={() => {
                  setPlanError("");
                  setUsersCountError("");
                  setDeploySheetOpen(false);
                }}
              >
                Anuluj
              </Button>
              <Button
                type="submit"
                loading={submittingPlan}
                trailingIcon={<ArrowRightIcon size={16} weight="bold" />}
              >
                {submittingPlan ? "Generowanie planu…" : "Wygeneruj plan w 5 fazach"}
              </Button>
            </div>
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
