"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Badge, IconButton, LoadingState, StarSlashedIcon } from "@/components/ui";
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-[var(--color-text)]">
              {auth.profile?.organization_name || auth.user?.full_name || auth.user?.email}
            </p>
            {auth.profile?.organization_type ? (
              <Badge tone="neutral" size="compact">
                {ORG_TYPE_LABELS[auth.profile.organization_type] ?? auth.profile.organization_type}
              </Badge>
            ) : null}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {[
              auth.profile?.role_title,
              auth.profile?.deployment_location,
              auth.user?.email,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/solve"
            className="inline-flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
          >
            Dopasuj kolejne rozwiązanie
          </Link>
          <Link
            href="/innovations"
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
          >
            Przeglądaj katalog
          </Link>
        </div>
      </div>

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
            <Link href="/solve" className="font-semibold text-[var(--color-accent-text)] underline">
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
