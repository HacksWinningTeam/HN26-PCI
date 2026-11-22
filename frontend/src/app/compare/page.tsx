"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/SessionProvider";
import {
  fetchInnovationDetail,
  fetchInnovations,
  saveComparison,
  type InnovationDetail,
  type InnovationSummary,
} from "@/lib/radar-api";
import { downloadCsvFile, formatComparisonCsv } from "@/lib/radar-export";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  VERIFICATION_LABELS,
} from "@/lib/radar-labels";

function ScoreCell({
  value,
  max,
}: {
  value: number | undefined;
  max: number;
}) {
  if (typeof value !== "number") {
    return <td className="p-3.5 align-top font-mono">—</td>;
  }
  const isLeader = value === max && max > 0;
  return (
    <td
      className={`p-3.5 align-top font-mono ${
        isLeader
          ? "bg-[var(--color-info-bg)] font-bold text-[var(--color-info-text)]"
          : ""
      }`}
    >
      {value}%
    </td>
  );
}

export default function ComparePage() {
  const router = useRouter();
  const {
    auth,
    compareSlugs,
    setCompareSlugs,
    matchBySlug,
    solveContext,
  } = useSession();

  const [allSummaries, setAllSummaries] = useState<InnovationSummary[]>([]);
  const [details, setDetails] = useState<InnovationDetail[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchInnovations().then(setAllSummaries).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      compareSlugs.map((slug) => fetchInnovationDetail(slug).catch(() => null)),
    ).then((loaded) => {
      if (cancelled) return;
      setDetails(loaded.filter((x): x is InnovationDetail => Boolean(x)));
    });
    return () => {
      cancelled = true;
    };
  }, [compareSlugs]);

  function handleSlotChange(idx: number, slug: string) {
    const next = [...compareSlugs];
    if (!slug) next.splice(idx, 1);
    else next[idx] = slug;
    setCompareSlugs(next);
  }

  async function handleSaveComparison() {
    if (!auth.authenticated) {
      router.push("/login?next=/compare");
      return;
    }
    if (details.length < 2) return;
    setSaving(true);
    setError("");
    try {
      const title = details.map((d) => d.title_pl.split("—")[0].trim()).join(" vs ");
      await saveComparison({
        title,
        innovation_slugs: details.map((d) => d.slug),
        query_context: { ...solveContext },
      });
      setSavedMessage("Porównanie zapisano na koncie w zakładce Moje wdrożenia.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać porównania.");
    } finally {
      setSaving(false);
    }
  }

  const scoreMax = useMemo(() => {
    const getMax = (key: string) =>
      Math.max(0, ...details.map((d) => d.scores?.[key] ?? 0));
    return {
      innovativeness: getMax("innovativeness"),
      application_potential: getMax("application_potential"),
      transferability: getMax("transferability"),
      credibility: getMax("credibility"),
    };
  }, [details]);

  const keyDifferences = useMemo(() => {
    if (details.length < 2) return [];
    const notes: string[] = [];

    const areas = new Set(details.map((d) => PRIMARY_AREA_LABELS[d.primary_area]));
    if (areas.size > 1) {
      notes.push(`Różne główne obszary: ${[...areas].join(" vs ")}.`);
    }

    const levels = new Set(details.map((d) => DEPLOYMENT_LABELS[d.deployment_level]));
    if (levels.size > 1) {
      notes.push(`Różny poziom dojrzałości wdrożeniowej: ${[...levels].join(" / ")}.`);
    }

    const nonVerified = details.filter((d) => d.verification_status !== "verified");
    if (nonVerified.length > 0) {
      notes.push(
        `Uwaga na wiarygodność: ${nonVerified
          .map((d) => `${d.title_pl.split("—")[0].trim()} (${VERIFICATION_LABELS[d.verification_status]})`)
          .join(", ")}.`,
      );
    }

    const sortedByCred = [...details].sort(
      (a, b) => (b.scores?.credibility ?? 0) - (a.scores?.credibility ?? 0),
    );
    if ((sortedByCred[0]?.scores?.credibility ?? 0) > (sortedByCred.at(-1)?.scores?.credibility ?? 0)) {
      notes.push(
        `Najwyższa wiarygodność źródeł: ${sortedByCred[0].title_pl.split("—")[0].trim()} (${sortedByCred[0].scores?.credibility}%).`,
      );
    }

    return notes;
  }, [details]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-text-muted)]">
          {auth.authenticated
            ? "Wybierz od 2 do 3 innowacji. Możesz zapisać to porównanie w zakładce Moje wdrożenia."
            : "Wybierz od 2 do 3 innowacji do zestawienia. Zapis porównania na koncie wymaga zalogowania."}
        </p>

        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            type="button"
            onClick={() =>
              downloadCsvFile(
                "porownanie-innowacji.csv",
                formatComparisonCsv(details, matchBySlug),
              )
            }
            disabled={details.length < 2}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Eksportuj CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={details.length < 2}
            className="min-h-11 cursor-pointer rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs font-semibold disabled:opacity-50"
          >
            Eksportuj PDF
          </button>
          <button
            type="button"
            onClick={() => void handleSaveComparison()}
            disabled={details.length < 2 || saving}
            className="min-h-11 cursor-pointer rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)] disabled:opacity-50"
          >
            {auth.authenticated
              ? saving
                ? "Zapisywanie…"
                : "Zapisz porównanie na koncie"
              : "Zaloguj się, aby zapisać porównanie"}
          </button>
        </div>
      </div>

      {savedMessage ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm font-semibold text-[var(--color-success-text)]"
        >
          <span>{savedMessage}</span>
          <Link href="/workspace" className="underline">
            Otwórz Moje wdrożenia →
          </Link>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm font-semibold text-[var(--color-error-text)]">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-3 print:hidden">
        {[0, 1, 2].map((idx) => (
          <div key={idx}>
            <label htmlFor={`slot-${idx}`} className="mb-1 block text-xs font-semibold">
              Innowacja {idx + 1}
            </label>
            <select
              id={`slot-${idx}`}
              value={compareSlugs[idx] ?? ""}
              onChange={(e) => handleSlotChange(idx, e.target.value)}
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            >
              <option value="">— Wybierz —</option>
              {allSummaries.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.title_pl}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {details.length < 2 ? (
        <div className="space-y-3 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <p className="text-sm text-[var(--color-text-muted)]">
            Wybierz co najmniej dwie innowacje powyżej lub z katalogu, aby wyświetlić tabelę porównawczą.
          </p>
          {allSummaries.length >= 2 ? (
            <button
              type="button"
              onClick={() =>
                setCompareSlugs(allSummaries.slice(0, 2).map((item) => item.slug))
              }
              className="min-h-10 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-xs font-semibold hover:border-[var(--color-accent)]"
            >
              Załaduj przykładowe porównanie (2 innowacje)
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
          {keyDifferences.length > 0 ? (
            <section className="space-y-2 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] p-4 text-xs text-[var(--color-info-text)]">
              <h2 className="text-sm font-bold">Kluczowe różnice między wybranymi rozwiązaniami</h2>
              <ul className="list-disc space-y-1 pl-5">
                {keyDifferences.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            <table className="w-full min-w-[740px] border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                  <th className="w-56 p-3.5 font-bold">Kryterium</th>
                  {details.map((d) => (
                    <th key={d.slug} className="p-3.5 align-top">
                      <Link
                        href={`/innovations/${d.slug}`}
                        className="text-base font-bold text-[var(--color-accent-text)] hover:underline"
                      >
                        {d.title_pl}
                      </Link>
                      <div className="mt-0.5 text-xs font-normal text-[var(--color-text-muted)]">
                        {d.organization_name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-subtle)]">
                <tr>
                  <th className="p-3.5 font-semibold">Rozwiązywany problem</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top">{d.problem_pl}</td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Obszar i charakter</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top">
                      <strong>{PRIMARY_AREA_LABELS[d.primary_area]}</strong> ·{" "}
                      {d.innovation_character.map((c) => CHARACTER_LABELS[c]).join(", ")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Branża</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top">
                      {d.sectors.map((s) => SECTOR_LABELS[s] ?? s).join(", ")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Beneficjenci</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top">
                      {d.beneficiary_groups.map((b) => BENEFICIARY_LABELS[b] ?? b).join(", ")}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Poziom wdrożenia</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top font-semibold">
                      {DEPLOYMENT_LABELS[d.deployment_level]}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">TRL</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top font-mono">
                      {d.trl !== null ? `TRL ${d.trl}/9` : "Nie dotyczy"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Zgodność z potrzebą użytkownika</th>
                  {details.map((d) => {
                    const m = matchBySlug[d.slug];
                    return (
                      <td key={d.slug} className="p-3.5 align-top text-xs">
                        {m ? (
                          <span>
                            <strong>{m.overall_score}%</strong> ({m.primary_reason})
                          </span>
                        ) : (
                          <Link href="/solve" className="text-[var(--color-accent-text)] underline">
                            Opisz problem, aby obliczyć dopasowanie
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Innowacyjność</th>
                  {details.map((d) => (
                    <ScoreCell
                      key={d.slug}
                      value={d.scores?.innovativeness}
                      max={scoreMax.innovativeness}
                    />
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Potencjał zastosowania</th>
                  {details.map((d) => (
                    <ScoreCell
                      key={d.slug}
                      value={d.scores?.application_potential}
                      max={scoreMax.application_potential}
                    />
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Możliwość transferu</th>
                  {details.map((d) => (
                    <ScoreCell
                      key={d.slug}
                      value={d.scores?.transferability}
                      max={scoreMax.transferability}
                    />
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Wiarygodność</th>
                  {details.map((d) => (
                    <ScoreCell
                      key={d.slug}
                      value={d.scores?.credibility}
                      max={scoreMax.credibility}
                    />
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Jakość źródeł</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top text-xs space-y-1">
                      <div className="font-semibold">
                        {VERIFICATION_LABELS[d.verification_status]} · {d.sources.length} źródeł
                      </div>
                      <div className="text-[var(--color-text-muted)]">
                        Rejestry: {d.sources.map((s) => s.registry).join(", ") || "brak"}
                      </div>
                      <div className="text-[var(--color-text-muted)]">
                        {d.verification_method}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Mocne strony i ryzyka</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top text-xs space-y-1.5">
                      <div>
                        <strong>Mocne strony:</strong> {d.strengths.join("; ") || "—"}
                      </div>
                      <div>
                        <strong>Ryzyka:</strong> {d.risks.join("; ") || "—"}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Braki informacyjne</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top text-xs text-[var(--color-text-muted)]">
                      {d.missing_info.join("; ") || "Brak"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Sugerowany następny krok</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top font-semibold text-[var(--color-accent-text)]">
                      {d.suggested_next_step}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th className="p-3.5 font-semibold">Działanie</th>
                  {details.map((d) => (
                    <td key={d.slug} className="p-3.5 align-top">
                      <Link
                        href={`/innovations/${d.slug}`}
                        className="inline-flex min-h-10 items-center rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
                      >
                        Szczegóły i wdrożenie →
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
