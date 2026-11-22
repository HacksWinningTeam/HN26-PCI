"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import {
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
  GridViewIcon,
  IconButton,
  LoadingState,
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
import { ORG_TYPE_LABELS, PLAN_VARIANT_LABELS } from "@/lib/radar-labels";

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
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Wygenerowane plany ({plans.length})</h2>
        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-sm text-[var(--color-text-muted)]">
            Nie masz jeszcze planu. Wybierz innowację w{" "}
            <Link href="/innovations" className="font-semibold text-[var(--color-accent-text)] underline">
              katalogu
            </Link>{" "}
            lub opisz problem w{" "}
            <Link href="/innovations?mode=problem" className="font-semibold text-[var(--color-accent-text)] underline">
              wyszukiwarce problemów
            </Link>
            .
          </p>
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
                  className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="rounded border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-info-text)]">
                        {PLAN_VARIANT_LABELS[plan.variant]}
                      </span>
                      <h3 className="mt-1.5 text-lg font-bold">
                        <Link
                          href={`/workspace/plans/${plan.id}`}
                          className="text-[var(--color-accent-text)] hover:underline"
                        >
                          {plan.innovation.title_pl}
                        </Link>
                      </h3>
                    </div>
                    <div className="text-right font-mono text-sm font-bold">
                      {completed}/{plan.steps.length} faz ({pct}%)
                    </div>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]">
                    <div
                      className="h-full bg-[var(--color-success-badge)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <strong>Najbliższe zadanie:</strong>{" "}
                      {nextTask
                        ? `Faza ${nextTask.phase_number}: ${nextTask.title}`
                        : "Wszystkie fazy ukończone"}
                    </div>
                    <div>
                      <strong>Kontakt do planu:</strong>{" "}
                      {contact?.unit_name || plan.innovation.organization_name}
                      {contact?.email ? ` (${contact.email})` : ""}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1 text-xs">
                    <Link
                      href={`/workspace/plans/${plan.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-4 font-semibold text-[var(--color-on-accent)]"
                    >
                      Otwórz plan i checklistę →
                    </Link>
                    <Link
                      href={`/workspace/plans/${plan.id}?print=1`}
                      className="inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border)] px-3 font-semibold"
                    >
                      Pobierz PDF
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        downloadCsvFile(
                          `plan-${plan.innovation.slug}.csv`,
                          formatImplementationPlanCsv(plan),
                        )
                      }
                      className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-[var(--color-border)] px-3 font-semibold"
                    >
                      Pobierz CSV
                    </button>
                    <Link
                      href={`/innovations/${plan.innovation.slug}`}
                      className="inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border)] px-3 font-semibold"
                    >
                      Karta i źródła
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Innovations & Saved Comparisons */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Zapisane innowacje ({savedInnovations.length})</h2>
          {savedInnovations.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">Brak zapisanych innowacji.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {savedInnovations.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/innovations/${s.innovation.slug}`}
                      className="block truncate font-semibold text-[var(--color-accent-text)] hover:underline"
                    >
                      {s.innovation.title_pl}
                    </Link>
                    <div className="truncate text-xs text-[var(--color-text-muted)]">
                      {s.innovation.organization_name}
                    </div>
                  </div>
                  <IconButton
                    variant="ghost"
                    tone="destructive"
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

        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Zapisane porównania ({comparisons.length})</h2>
          {comparisons.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">Brak zapisanych porównań.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {comparisons.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3">
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {c.innovation_slugs.join(" vs ")}
                    </div>
                  </div>
                  <Link
                    href="/compare"
                    onClick={() => setCompareSlugs(c.innovation_slugs)}
                    className="shrink-0 text-xs font-semibold text-[var(--color-accent-text)] underline"
                  >
                    Otwórz →
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
