"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  ArrowRightIcon,
  Badge,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandBookmarkIcon,
  BrandChecklistIcon,
  BrandLimeBurstIcon,
  BrandScalesIcon,
  BrandUserIcon,
  BuildingsIcon,
  CheckCircleIcon,
  ClockIcon,
  CsvIcon,
  EyeIcon,
  GridViewIcon,
  IconButton,
  LoadingState,
  PdfIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarSlashedIcon,
  TargetIcon,
  UserIcon,
} from "@/components/ui";
import {
  fetchImplementationPlans,
  fetchSavedComparisons,
  fetchSavedInnovations,
  removeSavedInnovation,
  type ImplementationPlan,
  type SavedComparison,
  type SavedInnovation,
} from "@/lib/radar-api";
import { downloadCsvFile, formatImplementationPlanCsv } from "@/lib/radar-export";
import {
  ORG_TYPE_LABELS,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
  type PlanVariant,
} from "@/lib/radar-labels";

const PLAN_VARIANT_TONE: Record<PlanVariant, "info" | "lime" | "success"> = {
  validation: "info",
  pilot: "lime",
  transfer_deployment: "success",
};

export default function WorkspacePage() {
  const { auth, authLoaded, setCompareSlugs } = useSession();

  const [plans, setPlans] = useState<ImplementationPlan[]>([]);
  const [comparisons, setComparisons] = useState<SavedComparison[]>([]);
  const [savedInnovations, setSavedInnovations] = useState<SavedInnovation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoaded || !auth.authenticated) return;
    let active = true;
    void Promise.all([
      fetchImplementationPlans(),
      fetchSavedComparisons(),
      fetchSavedInnovations(),
    ])
      .then(([p, c, s]) => {
        if (!active) return;
        setPlans(p);
        setComparisons(c);
        setSavedInnovations(s);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.authenticated, authLoaded]);

  if (!authLoaded || !auth.authenticated || loading) {
    return (
      <LoadingState
        label="Ładowanie panelu wdrożeń…"
        description="Pobieramy zapisane plany, porównania i kontekst Twojej organizacji."
      />
    );
  }

  const primaryTitle =
    auth.profile?.organization_name || auth.user?.full_name || auth.user?.email || "";
  const totalSteps = plans.reduce((sum, plan) => sum + plan.steps.length, 0);
  const completedSteps = plans.reduce(
    (sum, plan) => sum + plan.steps.filter((step) => step.status === "completed").length,
    0,
  );
  const overallProgressPct =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : null;

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="workspace-profile-heading"
        className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6"
      >
        <BrandBlobSoftBlueIcon
          size={180}
          className="pointer-events-none absolute -top-14 -right-12 opacity-55"
        />
        <BrandBlobLimeIcon
          size={135}
          className="pointer-events-none absolute right-24 -bottom-14 hidden opacity-45 sm:block"
        />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] shadow-xs sm:h-16 sm:w-16">
              <BrandLimeBurstIcon
                size={22}
                className="pointer-events-none absolute -top-2.5 -left-2.5 -rotate-45"
              />
              <BrandUserIcon size={40} className="sm:h-11 sm:w-11" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {auth.profile?.organization_type ? (
                  <Badge
                    tone="info"
                    size="compact"
                    leadingIcon={<BuildingsIcon size={12} />}
                  >
                    {ORG_TYPE_LABELS[auth.profile.organization_type] ??
                      auth.profile.organization_type}
                  </Badge>
                ) : null}
                {auth.user?.is_pci_admin ? (
                  <Badge
                    tone="lime"
                    size="compact"
                    leadingIcon={<ShieldCheckIcon size={12} />}
                  >
                    Operator PCI
                  </Badge>
                ) : null}
                {auth.profile ? (
                  <Badge
                    tone={auth.profile.is_complete ? "success" : "neutral"}
                    size="compact"
                    leadingIcon={
                      auth.profile.is_complete ? <CheckCircleIcon size={12} /> : undefined
                    }
                  >
                    {auth.profile.is_complete
                      ? "Profil wdrożeniowy gotowy"
                      : "Profil uzupełnisz przy planie"}
                  </Badge>
                ) : null}
              </div>

              <h2
                id="workspace-profile-heading"
                className="truncate text-xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-2xl"
                title={primaryTitle}
              >
                {primaryTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--color-text-muted)]">
                {auth.profile?.organization_name && auth.user?.full_name ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--color-text)]">
                    <UserIcon size={14} className="shrink-0 text-[var(--color-accent-text)]" />
                    <span>{auth.user.full_name}</span>
                  </span>
                ) : null}
                {auth.profile?.role_title ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
                    />
                    <span>{auth.profile.role_title}</span>
                  </span>
                ) : null}
                {auth.profile?.deployment_location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <TargetIcon size={14} className="shrink-0 text-[var(--color-accent-text)]" />
                    <span>{auth.profile.deployment_location}</span>
                  </span>
                ) : null}
                {auth.user?.email ? (
                  <span className="truncate font-mono text-[11px]">{auth.user.email}</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
            <Link
              href="/innovations?mode=problem"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <SearchIcon size={16} weight="bold" />
              <span>Dopasuj kolejne rozwiązanie</span>
            </Link>
            <Link
              href="/innovations"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <GridViewIcon size={16} />
              <span>Przeglądaj katalog</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-5 grid grid-cols-1 gap-3 border-t border-[var(--color-border-subtle)] pt-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <BrandChecklistIcon size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Aktywne plany
              </p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                {plans.length}{" "}
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  {overallProgressPct !== null
                    ? `· ${completedSteps}/${totalSteps} faz (${overallProgressPct}%)`
                    : "· brak aktywnych"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <BrandBookmarkIcon size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Zapisane innowacje
              </p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                {savedInnovations.length}{" "}
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  {savedInnovations.length > 0 ? "· w ulubionych" : "· dodaj z katalogu"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center">
              <BrandScalesIcon size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                Zapisane porównania
              </p>
              <p className="text-sm font-bold tabular-nums text-[var(--color-text)]">
                {comparisons.length}{" "}
                <span className="text-xs font-normal text-[var(--color-text-muted)]">
                  {comparisons.length > 0 ? "· gotowe zestawienia" : "· porównaj min. 2"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans & Nearest Tasks */}
      <section aria-labelledby="workspace-plans-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BrandChecklistIcon size={26} />
            <h2
              id="workspace-plans-heading"
              className="text-xl font-extrabold tracking-tight text-[var(--color-text)]"
            >
              Wygenerowane plany
            </h2>
            <Badge tone="info" size="compact">
              {plans.length}
            </Badge>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)]">
                <BrandChecklistIcon size={30} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[var(--color-text)]">
                  Nie masz jeszcze planu wdrożenia
                </h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Wybierz innowację z katalogu lub opisz swój problem, aby wygenerować 5-fazową checklistę.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/innovations?mode=problem"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <SearchIcon size={15} weight="bold" />
                <span>Wyszukiwarka problemów</span>
              </Link>
              <Link
                href="/innovations"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                <GridViewIcon size={15} />
                <span>Katalog</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              const completed = plan.steps.filter((s) => s.status === "completed").length;
              const pct = Math.round((completed / Math.max(1, plan.steps.length)) * 100);
              const nextTask = plan.steps.find((s) => s.status !== "completed");
              const contact = plan.innovation.contact_info;

              return (
                <article
                  key={plan.id}
                  className="space-y-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={PLAN_VARIANT_TONE[plan.variant]} size="compact">
                          {PLAN_VARIANT_LABELS[plan.variant]}
                        </Badge>
                        <Badge tone="neutral" size="compact">
                          {PRIMARY_AREA_LABELS[plan.innovation.primary_area]}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
                        <Link
                          href={`/workspace/plans/${plan.id}`}
                          className="transition-colors hover:text-[var(--color-accent-text)]"
                        >
                          {plan.innovation.title_pl}
                        </Link>
                      </h3>
                    </div>

                    <div className="shrink-0 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2 text-right">
                      <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                        Postęp realizacji
                      </p>
                      <p className="font-mono text-sm font-extrabold tabular-nums text-[var(--color-text)]">
                        {completed}/{plan.steps.length} faz{" "}
                        <span className="text-[var(--color-accent-text)]">({pct}%)</span>
                      </p>
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-5 gap-1.5"
                    role="img"
                    aria-label={`Postęp planu: ${completed} z ${plan.steps.length} faz (${pct}%)`}
                  >
                    {plan.steps.map((step) => {
                      const stepStyle =
                        step.status === "completed"
                          ? "border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime)]"
                          : step.status === "in_progress"
                            ? "border-[var(--color-info-border)] bg-[var(--color-accent)]"
                            : "border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]";
                      return (
                        <span
                          key={step.id}
                          title={`Faza ${step.phase_number}: ${step.title}`}
                          aria-hidden="true"
                          className={`h-2.5 rounded-sm border transition-colors ${stepStyle}`}
                        />
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5">
                      {nextTask ? (
                        <ClockIcon
                          size={15}
                          className="mt-0.5 shrink-0 text-[var(--color-accent-text)]"
                        />
                      ) : (
                        <CheckCircleIcon
                          size={15}
                          className="mt-0.5 shrink-0 text-[var(--color-success-text)]"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Najbliższe zadanie
                        </p>
                        <p className="mt-0.5 font-semibold text-[var(--color-text)]">
                          {nextTask
                            ? `Faza ${nextTask.phase_number}: ${nextTask.title}`
                            : "Wszystkie fazy ukończone"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-3.5 py-2.5">
                      <BuildingsIcon
                        size={15}
                        className="mt-0.5 shrink-0 text-[var(--color-accent-text)]"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[var(--color-text-muted)]">
                          Kontakt do planu
                        </p>
                        <p className="mt-0.5 truncate font-semibold text-[var(--color-text)]">
                          {contact?.unit_name || plan.innovation.organization_name}
                          {contact?.email ? (
                            <span className="ml-1 font-normal text-[var(--color-text-muted)]">
                              · {contact.email}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[var(--color-border-subtle)] pt-4 text-xs">
                    <Link
                      href={`/workspace/plans/${plan.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      <span>Otwórz plan i checklistę</span>
                      <ArrowRightIcon size={15} weight="bold" />
                    </Link>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/workspace/plans/${plan.id}?print=1`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        <PdfIcon size={15} />
                        <span>Pobierz PDF</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() =>
                          downloadCsvFile(
                            `plan-${plan.innovation.slug}.csv`,
                            formatImplementationPlanCsv(plan),
                          )
                        }
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        <CsvIcon size={15} />
                        <span>Pobierz CSV</span>
                      </button>
                      <Link
                        href={`/innovations/${plan.innovation.slug}`}
                        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        <EyeIcon size={15} />
                        <span>Karta i źródła</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Innovations & Saved Comparisons */}
      <section
        aria-label="Zapisane materiały"
        className="grid grid-cols-1 items-start gap-5 md:grid-cols-2"
      >
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandBookmarkIcon size={24} />
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
                Zapisane innowacje
              </h2>
            </div>
            <Badge tone="info" size="compact">
              {savedInnovations.length}
            </Badge>
          </div>

          {savedInnovations.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-xs text-[var(--color-text-muted)]">
              <p>Nie dodałeś jeszcze żadnej innowacji do ulubionych.</p>
              <Link
                href="/innovations"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
              >
                <span>Przejdź do katalogu</span>
                <ArrowRightIcon size={14} weight="bold" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {savedInnovations.map((s) => (
                <li
                  key={s.id}
                  className="group relative flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-3.5 transition-colors hover:bg-[var(--color-surface-raised)]"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/innovations/${s.innovation.slug}`}
                      className="block truncate font-bold text-[var(--color-text)] transition-colors group-hover:text-[var(--color-accent-text)] after:absolute after:inset-0 after:z-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {s.innovation.title_pl}
                    </Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--color-text-muted)]">
                      <span className="truncate">{s.innovation.organization_name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{PRIMARY_AREA_LABELS[s.innovation.primary_area]}</span>
                    </div>
                  </div>
                  <IconButton
                    variant="ghost"
                    tone="destructive"
                    className="z-10 shrink-0"
                    aria-label={`Usuń z ulubionych: ${s.innovation.title_pl}`}
                    title="Usuń z ulubionych"
                    onClick={() => {
                      void removeSavedInnovation(s.innovation.slug).then(() => {
                        setSavedInnovations((prev) =>
                          prev.filter((item) => item.id !== s.id),
                        );
                      });
                    }}
                  >
                    <StarSlashedIcon size={18} />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <BrandScalesIcon size={24} />
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-text)]">
                Zapisane porównania
              </h2>
            </div>
            <Badge tone="lime" size="compact">
              {comparisons.length}
            </Badge>
          </div>

          {comparisons.length === 0 ? (
            <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-canvas)] p-4 text-xs text-[var(--color-text-muted)]">
              <p>Porównaj co najmniej dwie karty z katalogu, aby zapisać zestawienie.</p>
              <Link
                href="/compare"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
              >
                <span>Otwórz porównywarkę</span>
                <ArrowRightIcon size={14} weight="bold" />
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {comparisons.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-[var(--color-text)]">
                      {c.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                      {c.innovation_slugs.length} karty · {c.innovation_slugs.join(" vs ")}
                    </div>
                  </div>
                  <Link
                    href="/compare"
                    onClick={() => setCompareSlugs(c.innovation_slugs)}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-xs font-bold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                  >
                    <span>Otwórz</span>
                    <ArrowRightIcon size={14} weight="bold" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
