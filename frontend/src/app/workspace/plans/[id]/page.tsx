"use client";

import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
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
  BrandVerifiedSealIcon,
  BuildingsIcon,
  Button,
  ChartBarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CompareIcon,
  CsvIcon,
  DefinitionList,
  ErrorState,
  EyeIcon,
  IconButton,
  LoadingState,
  PdfIcon,
  ProgressBar,
  SpinnerIcon,
  StatusIndicator,
  TargetIcon,
  TextArea,
  TextInput,
  WarningIcon,
  type StatusTone,
} from "@/components/ui";
import {
  computePlanProgress,
  extractOrganizationContextItems,
  formatPlanDate,
} from "@/lib/implementation-plan";
import { setNavBarOverride } from "@/lib/navbar-override";
import {
  fetchImplementationPlan,
  updateImplementationPlanIssues,
  updateImplementationStep,
  type ImplementationPlan,
} from "@/lib/radar-api";
import { downloadCsvFile, formatImplementationPlanCsv } from "@/lib/radar-export";
import {
  DEPLOYMENT_LABELS,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
  STEP_STATUS_LABELS,
  VERIFICATION_LABELS,
  type PlanVariant,
  type StepStatus,
  type VerificationStatus,
} from "@/lib/radar-labels";

const PLAN_VARIANT_TONE: Record<PlanVariant, "info" | "lime" | "success"> = {
  validation: "info",
  pilot: "lime",
  transfer_deployment: "success",
};

const VERIFICATION_TONE: Record<VerificationStatus, StatusTone> = {
  verified: "success",
  pending_review: "warning",
  stale: "warning",
  conflict: "error",
};

const STEP_STATUS_TONE: Record<StepStatus, StatusTone> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
};

const STEP_STATUS_OPTIONS: ReadonlyArray<{ value: StepStatus; label: string }> = [
  { value: "not_started", label: STEP_STATUS_LABELS.not_started },
  { value: "in_progress", label: STEP_STATUS_LABELS.in_progress },
  { value: "completed", label: STEP_STATUS_LABELS.completed },
];

function PlanWorkspaceDetailInner() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "1";
  const planId = Number(params.id);
  const { auth, authLoaded } = useSession();

  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [issuesDraft, setIssuesDraft] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [savingStep, setSavingStep] = useState<{
    stepId: number;
    status: StepStatus;
  } | null>(null);
  const [savingNoteStepId, setSavingNoteStepId] = useState<number | null>(null);
  const [savingIssues, setSavingIssues] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoaded || !auth.authenticated || !Number.isFinite(planId)) return;
    let active = true;
    void fetchImplementationPlan(planId)
      .then((data) => {
        if (!active) return;
        setPlan(data);
        setError("");
        setIssuesDraft(data.user_reported_issues || "");
        const drafts: Record<number, string> = {};
        for (const s of data.steps) drafts[s.id] = s.notes || "";
        setNoteDrafts(drafts);
        if (shouldAutoPrint) {
          window.setTimeout(() => window.print(), 250);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Nie udało się pobrać planu.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.authenticated, authLoaded, planId, retryCount, shouldAutoPrint]);

  useEffect(() => {
    if (!plan) {
      setNavBarOverride(null);
      return;
    }

    const innovationSlug = plan.innovation.slug;
    const csvFilename = `plan-${innovationSlug}.csv`;

    setNavBarOverride({
      pathname,
      title: plan.innovation.title_pl,
      truncateTitle: true,
      hideSearch: true,
      actions: (
        <div className="flex items-center gap-2">
          <Link
            href={`/innovations/${innovationSlug}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            <EyeIcon size={16} />
            <span>Karta i źródła</span>
          </Link>
          <Button
            variant="outline"
            size="default"
            leadingIcon={<PdfIcon size={16} />}
            onClick={() => window.print()}
          >
            Eksportuj PDF
          </Button>
          <Button
            variant="outline"
            size="default"
            leadingIcon={<CsvIcon size={16} />}
            onClick={() =>
              downloadCsvFile(csvFilename, formatImplementationPlanCsv(plan))
            }
          >
            Eksportuj CSV
          </Button>
        </div>
      ),
      mobileActions: (
        <>
          <IconButton
            variant="outline"
            aria-label="Eksportuj PDF"
            onClick={() => window.print()}
          >
            <PdfIcon size={18} />
          </IconButton>
          <IconButton
            variant="outline"
            aria-label="Eksportuj CSV"
            onClick={() =>
              downloadCsvFile(csvFilename, formatImplementationPlanCsv(plan))
            }
          >
            <CsvIcon size={18} />
          </IconButton>
        </>
      ),
    });

    return () => {
      setNavBarOverride(null);
    };
  }, [pathname, plan]);

  async function handleStepChange(stepId: number, status: StepStatus) {
    setSavingStep({ stepId, status });
    setError("");
    try {
      const updated = await updateImplementationStep(stepId, {
        status,
        notes: noteDrafts[stepId] ?? "",
      });
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) => (s.id === stepId ? updated : s)),
            }
          : prev,
      );
      setStatusMessage(
        `Zmieniono status fazy ${updated.phase_number} na „${STEP_STATUS_LABELS[updated.status]}”.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu statusu etapu.");
    } finally {
      setSavingStep(null);
    }
  }

  async function handleSaveStepNote(stepId: number) {
    setSavingNoteStepId(stepId);
    setError("");
    try {
      const updated = await updateImplementationStep(stepId, {
        notes: noteDrafts[stepId] ?? "",
      });
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              steps: prev.steps.map((s) => (s.id === stepId ? updated : s)),
            }
          : prev,
      );
      setStatusMessage(`Zapisano notatkę dla fazy ${updated.phase_number}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu notatki.");
    } finally {
      setSavingNoteStepId(null);
    }
  }

  async function handleSaveIssues(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    setSavingIssues(true);
    setError("");
    try {
      const updated = await updateImplementationPlanIssues(plan.id, issuesDraft);
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              user_reported_issues: updated.user_reported_issues,
              updated_at: updated.updated_at,
            }
          : prev,
      );
      setStatusMessage("Zapisano zgłoszone braki i uwagi dla zespołu PCI.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu zgłoszonych uwag.");
    } finally {
      setSavingIssues(false);
    }
  }

  function handleRetryLoad() {
    setLoading(true);
    setError("");
    setRetryCount((prev) => prev + 1);
  }

  if (!authLoaded || !auth.authenticated || loading) {
    return (
      <LoadingState
        label="Ładowanie planu wdrożenia…"
        description="Pobieramy pięciofazową checklistę, kontekst organizacji oraz dane kontaktowe."
      />
    );
  }

  if (!plan) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Nie udało się otworzyć planu wdrożenia"
          message={error || "Wskazany plan nie istnieje lub należy do innego konta."}
          onRetry={Number.isFinite(planId) ? handleRetryLoad : undefined}
          secondaryAction={
            <Link
              href="/workspace"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
            >
              <ArrowLeftIcon size={14} />
              <span>Wróć do Moich wdrożeń</span>
            </Link>
          }
        />
      </div>
    );
  }

  const contact = plan.innovation.contact_info;
  const progress = computePlanProgress(plan.steps);
  const contextItems = extractOrganizationContextItems(plan.organization_snapshot);
  const contactDetails = [contact?.email, contact?.phone].filter(Boolean);
  const isIssuesDirty = issuesDraft !== (plan.user_reported_issues || "");

  return (
    <div className="space-y-6">
      {/* Hero Summary Card */}
      <section
        aria-labelledby="plan-hero-heading"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6"
      >
        <BrandBlobSoftBlueIcon
          size={190}
          className="pointer-events-none absolute -top-16 -right-14 opacity-50 print:hidden"
        />
        <BrandBlobLimeIcon
          size={140}
          className="pointer-events-none absolute right-24 -bottom-16 hidden opacity-40 sm:block print:hidden"
        />

        <div className="relative z-10 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] shadow-xs sm:h-16 sm:w-16">
              <BrandLimeBurstIcon
                size={22}
                className="pointer-events-none absolute -top-2.5 -left-2.5 -rotate-45 print:hidden"
              />
              <BrandChecklistIcon size={38} className="sm:h-11 sm:w-11" />
            </div>

            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={PLAN_VARIANT_TONE[plan.variant]} size="compact">
                  {PLAN_VARIANT_LABELS[plan.variant]}
                </Badge>
                <Badge tone="neutral" size="compact">
                  {PRIMARY_AREA_LABELS[plan.innovation.primary_area]}
                </Badge>
                <Badge tone="neutral" variant="outline" size="compact">
                  {DEPLOYMENT_LABELS[plan.innovation.deployment_level]}
                  {plan.innovation.trl !== null
                    ? ` · TRL ${plan.innovation.trl}/9`
                    : " · TRL nie dotyczy"}
                </Badge>
                <Badge
                  tone={VERIFICATION_TONE[plan.innovation.verification_status]}
                  size="compact"
                >
                  {VERIFICATION_LABELS[plan.innovation.verification_status]}
                </Badge>
              </div>

              <h2
                id="plan-hero-heading"
                className="text-xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-2xl"
              >
                {plan.innovation.title_pl}
              </h2>

              <p className="max-w-3xl text-sm leading-relaxed text-[var(--color-text-muted)]">
                {plan.variant_rationale}
              </p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--color-text-muted)]">
                <span>
                  Utworzono:{" "}
                  <strong className="font-mono font-semibold text-[var(--color-text)]">
                    {formatPlanDate(plan.created_at)}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Aktualizacja:{" "}
                  <strong className="font-mono font-semibold text-[var(--color-text)]">
                    {formatPlanDate(plan.updated_at)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Progress overview + quick jump across all 5 phases */}
          <div className="space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                {progress.allCompleted ? (
                  <CheckCircleIcon
                    size={16}
                    weight="bold"
                    className="shrink-0 text-[var(--color-success-text)]"
                  />
                ) : (
                  <ClockIcon
                    size={16}
                    weight="bold"
                    className="shrink-0 text-[var(--color-accent-text)]"
                  />
                )}
                <span className="font-semibold text-[var(--color-text)]">
                  {progress.nextStep
                    ? `Najbliższy etap: Faza ${progress.nextStep.phase_number} — ${progress.nextStep.title}`
                    : "Wszystkie pięć faz planu zostało ukończonych"}
                </span>
              </div>

              <span className="font-mono text-xs font-extrabold tabular-nums text-[var(--color-text)]">
                {progress.completed}/{progress.total} faz ukończonych ·{" "}
                <span className="text-[var(--color-accent-text)]">{progress.percent}%</span>
              </span>
            </div>

            <ProgressBar
              value={progress.completed}
              max={Math.max(1, progress.total)}
              label="Postęp realizacji planu"
              showPercent={false}
              accent="lime"
            />

            <nav
              aria-label="Skróty do faz planu"
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5 print:hidden"
            >
              {plan.steps.map((step) => {
                const isDone = step.status === "completed";
                const isActive = step.status === "in_progress";
                return (
                  <a
                    key={step.id}
                    href={`#phase-${step.phase_number}`}
                    className={[
                      "group flex min-h-11 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                      isDone
                        ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)]"
                        : isActive
                          ? "border-[var(--color-info-border)] bg-[var(--color-info-bg)]"
                          : "border-[var(--color-border-subtle)] bg-[var(--color-canvas)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-raised)]",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold",
                        isDone
                          ? "bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)]"
                          : isActive
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)]",
                      ].join(" ")}
                    >
                      {isDone ? <CheckIcon size={12} weight="bold" /> : step.phase_number}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold text-[var(--color-text)] group-hover:text-[var(--color-accent-text)]">
                        {step.title}
                      </span>
                      <span className="block text-[11px] text-[var(--color-text-muted)]">
                        {STEP_STATUS_LABELS[step.status]}
                      </span>
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>
      </section>

      {/* Live Feedback Banners */}
      {error ? (
        <Banner
          tone="error"
          appearance="tinted"
          announcement="assertive"
          title="Nie udało się zapisać zmiany"
          onDismiss={() => setError("")}
          className="print:hidden"
        >
          {error}
        </Banner>
      ) : null}

      {statusMessage ? (
        <Banner
          tone="success"
          appearance="tinted"
          announcement="polite"
          onDismiss={() => setStatusMessage("")}
          className="print:hidden"
        >
          {statusMessage}
        </Banner>
      ) : null}

      {/* Main Two-Column Workspace */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left: Five-Phase Checklist & Issue Reporting */}
        <div className="space-y-6 lg:col-span-8">
          <section aria-labelledby="plan-phases-heading" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <BrandChecklistIcon size={26} />
                <h2
                  id="plan-phases-heading"
                  className="text-xl font-extrabold tracking-tight text-[var(--color-text)]"
                >
                  Plan w pięciu fazach
                </h2>
                <Badge tone="info" size="compact">
                  {progress.completed}/{progress.total} ukończonych
                </Badge>
              </div>
            </div>

            <ol className="space-y-4">
              {plan.steps.map((step) => {
                const isSavingStatus = savingStep?.stepId === step.id;
                const isSavingNote = savingNoteStepId === step.id;
                const noteDraft = noteDrafts[step.id] ?? "";
                const isNoteDirty = noteDraft !== (step.notes || "");
                const isCompleted = step.status === "completed";
                const isInProgress = step.status === "in_progress";

                return (
                  <li
                    key={step.id}
                    id={`phase-${step.phase_number}`}
                    className={[
                      "scroll-mt-24 space-y-4 rounded-2xl border bg-[var(--color-surface)] p-5 shadow-xs transition-colors sm:p-6",
                      isCompleted
                        ? "border-[var(--color-accent-lime-border)]"
                        : isInProgress
                          ? "border-[var(--color-info-border)]"
                          : "border-[var(--color-border-subtle)]",
                    ].join(" ")}
                  >
                    {/* Step Header + Tactile Status Control */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold tracking-wide text-[var(--color-text-muted)]">
                            FAZA {step.phase_number}/{progress.total}
                          </span>
                          <StatusIndicator tone={STEP_STATUS_TONE[step.status]}>
                            {STEP_STATUS_LABELS[step.status]}
                          </StatusIndicator>
                        </div>
                        <h3 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
                          {step.title}
                        </h3>
                      </div>

                      <div
                        role="group"
                        aria-label={`Zmień status fazy ${step.phase_number}: ${step.title}`}
                        className="inline-flex flex-wrap gap-1 self-start rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] p-1 print:hidden"
                      >
                        {STEP_STATUS_OPTIONS.map((option) => {
                          const selected = step.status === option.value;
                          const activeClasses =
                            option.value === "completed"
                              ? "bg-[var(--color-accent-lime)] text-[var(--color-on-accent-lime)] shadow-xs"
                              : option.value === "in_progress"
                                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-xs"
                                : "bg-[var(--color-surface)] text-[var(--color-text)] shadow-xs";

                          return (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={selected}
                              disabled={isSavingStatus}
                              onClick={() => {
                                if (!selected) {
                                  void handleStepChange(step.id, option.value);
                                }
                              }}
                              className={[
                                "inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-60",
                                selected
                                  ? activeClasses
                                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
                              ].join(" ")}
                            >
                              {isSavingStatus && savingStep?.status === option.value ? (
                                <SpinnerIcon size={13} />
                              ) : option.value === "completed" ? (
                                <CheckCircleIcon size={14} weight={selected ? "bold" : "regular"} />
                              ) : option.value === "in_progress" ? (
                                <ClockIcon size={14} weight={selected ? "bold" : "regular"} />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="inline-block h-2 w-2 rounded-full border border-current"
                                />
                              )}
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Concrete Phase Actions */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold tracking-wider uppercase text-[var(--color-text-muted)]">
                        Działania do wykonania
                      </p>
                      <ul className="space-y-2">
                        {step.actions.map((action, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--color-text)]"
                          >
                            {isCompleted ? (
                              <CheckCircleIcon
                                size={16}
                                weight="bold"
                                className="mt-0.5 shrink-0 text-[var(--color-success-text)]"
                              />
                            ) : (
                              <span
                                aria-hidden="true"
                                className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] font-mono text-[11px] font-bold text-[var(--color-accent-text)]"
                              >
                                {idx + 1}
                              </span>
                            )}
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Phase Deliverable */}
                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-3.5 py-2.5 text-xs leading-relaxed text-[var(--color-info-text)]">
                      <TargetIcon size={16} weight="bold" className="mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold">Rezultat fazy: </span>
                        <span>{step.deliverable}</span>
                      </div>
                    </div>

                    {/* Printed note */}
                    {step.notes ? (
                      <p className="hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-xs text-[var(--color-text)] print:block">
                        <strong>Notatka z realizacji:</strong> {step.notes}
                      </p>
                    ) : null}

                    {/* Interactive Step Note */}
                    <div className="flex flex-col gap-2.5 border-t border-[var(--color-border-subtle)] pt-4 sm:flex-row sm:items-end print:hidden">
                      <TextInput
                        id={`note-${step.id}`}
                        label={`Notatka z realizacji fazy ${step.phase_number}`}
                        value={noteDraft}
                        onChange={(e) =>
                          setNoteDrafts((prev) => ({
                            ...prev,
                            [step.id]: e.target.value,
                          }))
                        }
                        placeholder="np. Umówiono rozmowę na czwartek, ustalono zakres pilotażu…"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant={isNoteDirty ? "filled" : "outline"}
                        loading={isSavingNote}
                        disabled={!isNoteDirty && !isSavingNote}
                        onClick={() => void handleSaveStepNote(step.id)}
                        className="shrink-0"
                      >
                        {isNoteDirty
                          ? "Zapisz notatkę"
                          : step.notes
                            ? "Notatka zapisana"
                            : "Zapisz notatkę"}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* Reported Issues / Gaps for PCI */}
          <section
            aria-labelledby="plan-issues-heading"
            className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6 print:hidden"
          >
            <form onSubmit={handleSaveIssues} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <WarningIcon
                    size={18}
                    weight="bold"
                    className="shrink-0 text-[var(--color-warn-badge)]"
                  />
                  <h2
                    id="plan-issues-heading"
                    className="text-base font-extrabold tracking-tight text-[var(--color-text)]"
                  >
                    Zgłoszone braki lub problemy w trakcie wdrożenia
                  </h2>
                </div>
                <Badge tone="neutral" size="compact">
                  Widoczne dla PCI
                </Badge>
              </div>

              <TextArea
                id="plan-issues"
                label="Opis braków, ryzyk lub rozbieżności"
                hint="Jeśli w trakcie kontaktu lub przygotowań zauważysz nieaktualny numer, brakujące koszty licencji albo bariery formalne — opisz je tutaj."
                rows={3}
                autoGrow
                maxRows={8}
                value={issuesDraft}
                onChange={(e) => setIssuesDraft(e.target.value)}
                placeholder="np. Brak informacji o kosztach utrzymania po 12 miesiącach lub nieaktualny adres e-mail jednostki…"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--color-text-muted)]">
                  {isIssuesDirty
                    ? "Masz niezapisane zmiany w zgłoszeniu."
                    : plan.user_reported_issues
                      ? "Zgłoszenie zostało zapisane i jest widoczne w panelu PCI."
                      : "Opcjonalne zgłoszenie wspierające weryfikację danych w Radarze."}
                </span>
                <Button
                  type="submit"
                  loading={savingIssues}
                  disabled={!isIssuesDirty && !savingIssues}
                >
                  {isIssuesDirty ? "Zapisz zgłoszenie" : "Zapisano"}
                </Button>
              </div>
            </form>
          </section>
        </div>

        {/* Right Rail: Contact, Organization Snapshot, Requirements & Metrics */}
        <aside className="space-y-5 lg:col-span-4">
          {/* Verified Implementation Contact */}
          <section
            aria-labelledby="plan-contact-heading"
            className="space-y-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BrandVerifiedSealIcon size={28} />
                <h2
                  id="plan-contact-heading"
                  className="text-base font-extrabold tracking-tight text-[var(--color-text)]"
                >
                  Kontakt wdrożeniowy
                </h2>
              </div>
              <Badge tone="success" size="compact">
                Poziom 3
              </Badge>
            </div>

            <div className="space-y-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-3.5 text-sm">
              <div className="flex items-start gap-2 font-bold text-[var(--color-text)]">
                <BuildingsIcon
                  size={16}
                  className="mt-0.5 shrink-0 text-[var(--color-accent-text)]"
                />
                <span>{contact?.unit_name || plan.innovation.organization_name}</span>
              </div>

              {contact?.contact_person ? (
                <p className="text-xs font-semibold text-[var(--color-text)]">
                  Osoba kontaktowa: {contact.contact_person}
                </p>
              ) : null}

              {contactDetails.length > 0 ? (
                <div className="space-y-1 border-t border-[var(--color-border-subtle)] pt-2 text-xs">
                  {contact?.email ? (
                    <div>
                      <a
                        href={`mailto:${contact.email}`}
                        className="break-all font-mono font-semibold text-[var(--color-accent-text)] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        {contact.email}
                      </a>
                    </div>
                  ) : null}
                  {contact?.phone ? (
                    <div>
                      <a
                        href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                        className="font-mono font-semibold text-[var(--color-text)] underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Szczegółowe kanały kontaktu znajdują się w karcie źródeł innowacji.
                </p>
              )}
            </div>

            <Link
              href={`/innovations/${plan.innovation.slug}`}
              className="inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] print:hidden"
            >
              <span>Otwórz pełną kartę i źródła</span>
              <ArrowRightIcon size={14} weight="bold" />
            </Link>
          </section>

          {/* Adopter Organization Context Snapshot */}
          <section
            aria-labelledby="plan-context-heading"
            className="space-y-3.5 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="plan-context-heading"
                className="text-base font-extrabold tracking-tight text-[var(--color-text)]"
              >
                Kontekst Twojej organizacji
              </h2>
              <Badge tone="neutral" size="compact">
                Z ankiety
              </Badge>
            </div>

            {contextItems.length > 0 ? (
              <DefinitionList
                variant="plain"
                items={contextItems.map((entry) => ({
                  id: entry.id,
                  label: entry.label,
                  value: entry.value,
                  layout: "stacked",
                }))}
              />
            ) : (
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                Plan został wygenerowany na podstawie domyślnego profilu konta. Możesz doprecyzować parametry organizacji przy kolejnym dopasowaniu.
              </p>
            )}

            {plan.comparison_slugs.length > 1 ? (
              <div className="border-t border-[var(--color-border-subtle)] pt-3 print:hidden">
                <Link
                  href="/compare"
                  className="inline-flex min-h-10 items-center gap-2 text-xs font-bold text-[var(--color-accent-text)] underline"
                >
                  <CompareIcon size={15} />
                  <span>Porównywane opcje ({plan.comparison_slugs.length})</span>
                </Link>
              </div>
            ) : null}
          </section>

          {/* Requirements, Risks & Success Metrics */}
          <section
            aria-labelledby="plan-params-heading"
            className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs"
          >
            <div className="flex items-center gap-2">
              <ChartBarIcon
                size={18}
                weight="bold"
                className="shrink-0 text-[var(--color-accent-text)]"
              />
              <h2
                id="plan-params-heading"
                className="text-base font-extrabold tracking-tight text-[var(--color-text)]"
              >
                Zasoby, ryzyka i mierniki
              </h2>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Wymagane zasoby
              </h3>
              {plan.requirements.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-text)]">
                  {plan.requirements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Zgodnie z dokumentacją źródłową innowacji.
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Ryzyka do zaadresowania
              </h3>
              {plan.risks.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-text)]">
                  {plan.risks.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Brak zadeklarowanych ryzyk krytycznych.
                </p>
              )}
            </div>

            <div className="space-y-1.5 border-t border-[var(--color-border-subtle)] pt-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
                Mierniki sukcesu
              </h3>
              {plan.success_metrics.length > 0 ? (
                <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-text)]">
                  {plan.success_metrics.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">
                  Do doprecyzowania w fazie 5 na podstawie efektów pilotażu.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function PlanWorkspaceDetailPage() {
  return (
    <Suspense
      fallback={
        <LoadingState
          label="Ładowanie planu wdrożenia…"
          description="Przygotowujemy pięciofazową checklistę wdrożenia."
        />
      }
    >
      <PlanWorkspaceDetailInner />
    </Suspense>
  );
}
