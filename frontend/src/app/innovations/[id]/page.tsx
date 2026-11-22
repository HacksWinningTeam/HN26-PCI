"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  createImplementationPlan,
  fetchImplementationPlans,
  fetchInnovationDetail,
  fetchInnovationFullDetail,
  fetchSavedInnovations,
  saveInnovation,
  updateProfile,
  type ImplementationPlan,
  type InnovationDetail,
  type InnovationRegisteredDetail,
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
  type OrgType,
} from "@/lib/radar-labels";

function parseScaleCount(scale: string, fallback: number): number {
  const digits = scale.replace(/\s+/g, "").match(/\d+/);
  if (!digits) return fallback;
  const parsed = Number(digits[0]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function InnovationDetailInner() {
  const params = useParams<{ id: string }>();
  const slug = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoDeploy = searchParams.get("deploy") === "1";
  const questionnaireRef = useRef<HTMLElement>(null);

  const { auth, refreshAuth, compareSlugs, toggleCompare, solveContext } =
    useSession();

  const [detail, setDetail] = useState<InnovationDetail | null>(null);
  const [fullDetail, setFullDetail] =
    useState<InnovationRegisteredDetail | null>(null);
  const [existingPlan, setExistingPlan] = useState<ImplementationPlan | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Level-3 Questionnaire + Plan generation state
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
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
        setIsSaved(saved.some((s) => s.innovation.slug === slug));

        const p = auth.profile;
        setOrgType(
          (solveContext.organization_type || p?.organization_type || "public_institution") as OrgType,
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
          setShowQuestionnaire(true);
          window.requestAnimationFrame(() => {
            questionnaireRef.current?.scrollIntoView({ behavior: "smooth" });
          });
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

  async function handleSaveBookmark() {
    if (!detail) return;
    if (!auth.authenticated) {
      router.push(`/login?next=${encodeURIComponent(`/innovations/${slug}`)}`);
      return;
    }
    setSavingBookmark(true);
    try {
      await saveInnovation(detail.slug);
      setIsSaved(true);
    } catch {
      // ignore duplicate or surface minimal error
    } finally {
      setSavingBookmark(false);
    }
  }

  function handleExploreDeployment() {
    if (!auth.authenticated) {
      router.push(
        `/register?next=${encodeURIComponent(`/innovations/${slug}?deploy=1`)}`,
      );
      return;
    }
    setShowQuestionnaire(true);
    window.requestAnimationFrame(() => {
      questionnaireRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

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

  if (loading) {
    return <p className="text-sm text-[var(--color-text-muted)]">Ładowanie karty…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p role="alert" className="text-sm font-semibold text-[var(--color-error-text)]">
          {error || "Nie znaleziono innowacji."}
        </p>
        <Link href="/innovations" className="text-sm font-semibold text-[var(--color-accent-text)] underline">
          ← Powrót do katalogu
        </Link>
      </div>
    );
  }

  const isPinned = compareSlugs.includes(detail.slug);
  const prefilledFromSearch = Boolean(
    solveContext.organization_type ||
      solveContext.deployment_location ||
      solveContext.problem_scale,
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/innovations" className="font-semibold text-[var(--color-accent-text)] underline">
          ← Wróć do katalogu
        </Link>
        <span className="text-xs text-[var(--color-text-muted)]">
          Pozyskano: {detail.fetched_at} · Aktualizacja / weryfikacja: {detail.last_verified_at}
        </span>
      </div>

      {/* Header & Core Info */}
      <section className="space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-2.5 py-0.5 font-semibold text-[var(--color-info-text)]">
            {PRIMARY_AREA_LABELS[detail.primary_area]}
          </span>
          {detail.innovation_character.map((c) => (
            <span
              key={c}
              className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2.5 py-0.5 font-medium"
            >
              {CHARACTER_LABELS[c]}
            </span>
          ))}
          <span className="rounded border border-[var(--color-border)] px-2.5 py-0.5 font-semibold">
            {DEPLOYMENT_LABELS[detail.deployment_level]}
            {detail.trl !== null ? ` · TRL ${detail.trl}/9` : " · TRL nie dotyczy"}
          </span>
          <span className="rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-2.5 py-0.5 font-semibold">
            {VERIFICATION_LABELS[detail.verification_status]}
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)] sm:text-3xl">
          {detail.title_pl}
        </h2>
        <p className="text-base text-[var(--color-text-muted)]">
          {detail.short_summary_pl}
        </p>

        <dl className="grid grid-cols-1 gap-4 border-t border-[var(--color-border-subtle)] pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Autor / Organizacja</dt>
            <dd className="font-semibold">{detail.organization_name}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Lokalizacja pochodzenia</dt>
            <dd className="font-semibold">{detail.origin_location}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Branża</dt>
            <dd className="font-semibold">
              {detail.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ")}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--color-text-muted)]">Sposób weryfikacji</dt>
            <dd className="font-semibold">{detail.verification_method}</dd>
          </div>
        </dl>
      </section>

      {/* Problem & Solution & Beneficiaries */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Problem i sposób działania</h2>
          <p className="text-sm">
            <strong>Rozwiązywany problem:</strong>{" "}
            <span className="text-[var(--color-text-muted)]">{detail.problem_pl}</span>
          </p>
          <p className="text-sm">
            <strong>Opis rozwiązania:</strong>{" "}
            <span className="text-[var(--color-text-muted)]">{detail.solution_pl}</span>
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Grupy beneficjentów i wskaźniki</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--color-text-muted)]">
            {detail.beneficiary_groups.map((b) => (
              <li key={b}>{BENEFICIARY_LABELS[b] ?? b}</li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-[var(--color-border-subtle)] pt-3">
            <span className="inline-block rounded bg-[var(--color-surface-raised)] px-2 py-0.5 text-[11px] font-bold text-[var(--color-text-muted)]">
              Obliczenie systemu
            </span>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <div>Innowacyjność: {detail.scores?.innovativeness ?? "—"}%</div>
              <div>Potencjał: {detail.scores?.application_potential ?? "—"}%</div>
              <div>Transfer: {detail.scores?.transferability ?? "—"}%</div>
              <div>Wiarygodność: {detail.scores?.credibility ?? "—"}%</div>
            </div>
          </div>
        </div>
      </section>

      {/* Evidence Provenance & Sources */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Oznaczenie pochodzenia informacji</h2>
          <ul className="space-y-2.5 text-sm">
            {detail.evidences.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3"
              >
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                  <span>{EVIDENCE_KIND_LABELS[ev.kind]}</span>
                  {ev.source_registry ? (
                    <span className="text-[var(--color-text-muted)]">
                      · Źródło: {ev.source_registry}
                    </span>
                  ) : null}
                  {ev.confidence ? (
                    <span className="text-[var(--color-text-muted)]">
                      · Pewność: {ev.confidence}
                    </span>
                  ) : null}
                </div>
                <p>{ev.text_pl}</p>
                {ev.limitation_note ? (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Ograniczenie: {ev.limitation_note}
                  </p>
                ) : null}
              </li>
            ))}
            {detail.missing_info.map((m, idx) => (
              <li
                key={`miss-${idx}`}
                className="rounded-lg border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-3 text-xs text-[var(--color-warn-text)]"
              >
                <strong>Brakująca informacja:</strong> {m}
              </li>
            ))}
            {detail.conflicting_info.map((c, idx) => (
              <li
                key={`conf-${idx}`}
                className="rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-3 text-xs text-[var(--color-error-text)]"
              >
                <strong>Sprzeczność:</strong> {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <h2 className="text-lg font-bold">Źródła z aktywnymi odnośnikami</h2>
          <ul className="space-y-2.5 text-xs">
            {detail.sources.map((src) => (
              <li
                key={src.id}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3"
              >
                <div className="font-bold text-[var(--color-text)]">{src.label}</div>
                <div className="mt-0.5 text-[var(--color-text-muted)]">
                  {src.registry} · Pozyskano: {src.fetched_at} · Weryfikacja: {src.last_verified_at}
                </div>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block font-semibold text-[var(--color-accent-text)] underline"
                >
                  {src.url} ↗
                </a>
              </li>
            ))}
          </ul>

          {fullDetail?.contact_info && Object.keys(fullDetail.contact_info).length > 0 ? (
            <div className="mt-4 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 text-xs text-[var(--color-success-text)]">
              <div className="font-bold uppercase">Dane kontaktowe (odblokowane po zalogowaniu)</div>
              <div className="mt-1 font-semibold">{fullDetail.contact_info.unit_name}</div>
              <div>{fullDetail.contact_info.contact_person}</div>
              <div>
                {fullDetail.contact_info.email} · {fullDetail.contact_info.phone}
              </div>
            </div>
          ) : !auth.authenticated ? (
            <div className="mt-4 space-y-2 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-xs text-[var(--color-info-text)]">
              <div className="font-bold uppercase">
                Dane kontaktowe i plan wdrożenia (po zalogowaniu)
              </div>
              <p>
                Zaloguj się lub załóż konto, aby odblokować zweryfikowane dane kontaktowe jednostki wdrażającej oraz wygenerować 5-fazowy plan działania.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link
                  href={`/login?next=${encodeURIComponent(`/innovations/${slug}?deploy=1`)}`}
                  className="inline-flex min-h-9 items-center rounded-md bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-[var(--color-on-accent)]"
                >
                  Zaloguj się
                </Link>
                <Link
                  href={`/register?next=${encodeURIComponent(`/innovations/${slug}?deploy=1`)}`}
                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-semibold text-[var(--color-text)]"
                >
                  Załóż konto
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* Bottom Action Bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 print:hidden">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleCompare(detail.slug)}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-sm font-semibold"
          >
            {isPinned ? "W porównaniu ✓" : "Dodaj do porównania"}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          >
            {copied ? "Skopiowano link" : "Udostępnij"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          >
            Eksportuj PDF
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold"
          >
            Eksportuj CSV
          </button>
          <button
            type="button"
            disabled={savingBookmark || isSaved}
            onClick={() => void handleSaveBookmark()}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold disabled:opacity-70"
          >
            {!auth.authenticated
              ? "Zaloguj się, aby zapisać"
              : isSaved
                ? "Zapisano na koncie ✓"
                : savingBookmark
                  ? "Zapisywanie…"
                  : "Zapisz na koncie"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleExploreDeployment}
          className="min-h-11 cursor-pointer rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
        >
          {auth.authenticated
            ? "Odkryj możliwości wdrożenia"
            : "Zaloguj się i odkryj plan wdrożenia"}
        </button>
      </section>

      {/* Level-3 Organization Questionnaire after Login */}
      {showQuestionnaire ? (
        <section
          ref={questionnaireRef}
          id="org-questionnaire"
          className="space-y-4 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6 print:hidden"
        >
          {existingPlan ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-3 text-xs text-[var(--color-info-text)]">
              <span>
                Masz już wygenerowany{" "}
                <strong>{PLAN_VARIANT_LABELS[existingPlan.variant]}</strong> dla tej innowacji.
              </span>
              <Link
                href={`/workspace/plans/${existingPlan.id}`}
                className="font-bold underline"
              >
                Otwórz istniejący plan →
              </Link>
            </div>
          ) : null}

          <div>
            <h2 className="text-xl font-bold">Ankieta organizacji — kontekst wdrożenia</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {prefilledFromSearch
                ? "Część pól została automatycznie uzupełniona na podstawie danych z wyszukiwarki. "
                : ""}
              Na podstawie dojrzałości innowacji i kontekstu system dobierze wariant planu (walidacja, pilotaż albo transfer i wdrożenie).
            </p>
          </div>

          <form onSubmit={handleGeneratePlan} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

            <button
              type="submit"
              disabled={submittingPlan}
              className="min-h-11 cursor-pointer rounded-lg bg-[var(--color-accent)] px-6 py-2.5 text-sm font-bold text-[var(--color-on-accent)] disabled:opacity-60"
            >
              {submittingPlan ? "Generowanie planu…" : "Wygeneruj spersonalizowany plan w 5 fazach"}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

export default function InnovationDetailPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-text-muted)]">Ładowanie karty…</p>}>
      <InnovationDetailInner />
    </Suspense>
  );
}
