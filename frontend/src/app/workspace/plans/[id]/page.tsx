"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { LoadingState } from "@/components/ui";
import {
  fetchImplementationPlan,
  updateImplementationPlanIssues,
  updateImplementationStep,
  type ImplementationPlan,
} from "@/lib/radar-api";
import { downloadCsvFile, formatImplementationPlanCsv } from "@/lib/radar-export";
import {
  PLAN_VARIANT_LABELS,
  STEP_STATUS_LABELS,
  type StepStatus,
} from "@/lib/radar-labels";

function PlanWorkspaceDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get("print") === "1";
  const planId = Number(params.id);
  const { auth, authLoaded } = useSession();

  const [plan, setPlan] = useState<ImplementationPlan | null>(null);
  const [issuesDraft, setIssuesDraft] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoaded || !auth.authenticated || !Number.isFinite(planId)) return;
    let active = true;
    void fetchImplementationPlan(planId)
      .then((data) => {
        if (!active) return;
        setPlan(data);
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
  }, [auth.authenticated, authLoaded, planId, shouldAutoPrint]);

  async function handleStepChange(stepId: number, status: StepStatus) {
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
      setStatusMessage("Zapisano status etapu.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu kroku.");
    }
  }

  async function handleSaveStepNote(stepId: number) {
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
      setStatusMessage("Zapisano notatkę.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu notatki.");
    }
  }

  async function handleSaveIssues(e: React.FormEvent) {
    e.preventDefault();
    if (!plan) return;
    try {
      const updated = await updateImplementationPlanIssues(plan.id, issuesDraft);
      setPlan((prev) =>
        prev ? { ...prev, user_reported_issues: updated.user_reported_issues } : prev,
      );
      setStatusMessage("Zapisano zgłoszone problemy i braki.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu uwag.");
    }
  }

  function handleDownloadCsv() {
    if (!plan) return;
    downloadCsvFile(
      `plan-${plan.innovation.slug}.csv`,
      formatImplementationPlanCsv(plan),
    );
  }

  if (!authLoaded || !auth.authenticated || loading) {
    return (
      <LoadingState
        label="Ładowanie planu wdrożenia…"
        description="Pobieramy pięciofazową checklistę oraz dane kontaktowe."
      />
    );
  }

  if (!plan) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm font-semibold text-[var(--color-error-text)]">
          {error || "Nie znaleziono planu."}
        </p>
        <Link href="/workspace" className="text-sm font-semibold text-[var(--color-accent-text)] underline">
          ← Wróć do Moich wdrożeń
        </Link>
      </div>
    );
  }

  const contact = plan.innovation.contact_info;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/workspace" className="text-sm font-semibold text-[var(--color-accent-text)] underline">
          ← Powrót do Moich wdrożeń
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/innovations/${plan.innovation.slug}`}
            className="inline-flex min-h-10 items-center rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold"
          >
            Wróć do źródeł i karty
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="min-h-10 cursor-pointer rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold"
          >
            Eksportuj PDF
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="min-h-10 cursor-pointer rounded-lg border border-[var(--color-border)] px-3 text-xs font-semibold"
          >
            Eksportuj CSV
          </button>
        </div>
      </div>

      {/* Plan Header */}
      <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <span className="inline-block rounded border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-info-text)]">
          {PLAN_VARIANT_LABELS[plan.variant]}
        </span>
        <h2 className="text-2xl font-bold">{plan.innovation.title_pl}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{plan.variant_rationale}</p>

        <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border-subtle)] pt-4 text-xs sm:grid-cols-3">
          <div>
            <strong>Kontakt do wdrożenia:</strong>
            <div>{contact?.unit_name || plan.innovation.organization_name}</div>
            <div>{contact?.contact_person}</div>
            <div>{contact?.email} · {contact?.phone}</div>
          </div>
          <div>
            <strong>Wymagane zasoby i ryzyka:</strong>
            <div>Zasoby: {plan.requirements.join("; ") || "—"}</div>
            <div>Ryzyka: {plan.risks.join("; ") || "—"}</div>
          </div>
          <div>
            <strong>Mierniki sukcesu:</strong>
            <ul className="list-disc pl-4">
              {plan.success_metrics.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {statusMessage ? (
        <p role="status" className="text-xs font-semibold text-[var(--color-success-text)] print:hidden">
          {statusMessage}
        </p>
      ) : null}

      {/* Five Phases Checklist */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Plan w pięciu fazach</h2>
        <ol className="space-y-4">
          {plan.steps.map((step) => (
            <li
              key={step.id}
              className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-[var(--color-text-muted)]">
                    FAZA {step.phase_number}/5
                  </span>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                </div>

                <div>
                  <label htmlFor={`status-${step.id}`} className="sr-only">
                    Status fazy {step.phase_number}
                  </label>
                  <select
                    id={`status-${step.id}`}
                    value={step.status}
                    onChange={(e) =>
                      void handleStepChange(step.id, e.target.value as StepStatus)
                    }
                    className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-xs font-bold"
                  >
                    {Object.entries(STEP_STATUS_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text)]">
                {step.actions.map((act, idx) => (
                  <li key={idx}>{act}</li>
                ))}
              </ul>
              <p className="text-xs font-semibold text-[var(--color-accent-text)]">
                Rezultat fazy: {step.deliverable}
              </p>

              {step.notes ? (
                <p className="hidden text-xs text-[var(--color-text-muted)] print:block">
                  <strong>Notatka:</strong> {step.notes}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-subtle)] pt-3 print:hidden">
                <input
                  value={noteDrafts[step.id] ?? ""}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({
                      ...prev,
                      [step.id]: e.target.value,
                    }))
                  }
                  placeholder="Krótka notatka z realizacji tej fazy…"
                  className="min-h-10 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveStepNote(step.id)}
                  className="min-h-10 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-xs font-semibold"
                >
                  Zapisz notatkę
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Reported Issues / Gaps */}
      <form
        onSubmit={handleSaveIssues}
        className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 print:hidden"
      >
        <label htmlFor="plan-issues" className="block text-sm font-bold">
          Zgłoszone braki lub problemy w trakcie wdrożenia (widoczne dla PCI)
        </label>
        <textarea
          id="plan-issues"
          rows={2}
          value={issuesDraft}
          onChange={(e) => setIssuesDraft(e.target.value)}
          placeholder="np. Brak informacji o kosztach licencji po 12 miesiącach…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm"
        />
        <button
          type="submit"
          className="min-h-10 cursor-pointer rounded-lg bg-[var(--color-accent)] px-4 text-xs font-bold text-[var(--color-on-accent)]"
        >
          Zapisz zgłoszone braki
        </button>
      </form>
    </div>
  );
}

export default function PlanWorkspaceDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-text-muted)]">Ładowanie planu…</p>}>
      <PlanWorkspaceDetailInner />
    </Suspense>
  );
}
