import type {
  ImplementationPlan,
  InnovationDetail,
  InnovationSummary,
  MatchItem,
} from "./radar-api";
import {
  BENEFICIARY_LABELS,
  CHARACTER_LABELS,
  DEPLOYMENT_LABELS,
  EVIDENCE_KIND_LABELS,
  PLAN_VARIANT_LABELS,
  PRIMARY_AREA_LABELS,
  SECTOR_LABELS,
  STEP_STATUS_LABELS,
  VERIFICATION_LABELS,
} from "./radar-labels";

function escapeCsvCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r;]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsvContent(rows: Array<Array<unknown>>): string {
  const body = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\r\n");
  return `\uFEFF${body}\r\n`;
}

export function downloadCsvFile(filename: string, rows: Array<Array<unknown>>) {
  const csv = buildCsvContent(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatInnovationsCatalogCsv(
  items: InnovationSummary[],
): Array<Array<unknown>> {
  const header = [
    "Nazwa",
    "Krótki opis",
    "Rozwiązywany problem",
    "Główny obszar",
    "Charakter",
    "Branża",
    "Grupy beneficjentów",
    "Organizacja",
    "Lokalizacja pochodzenia",
    "Poziom wdrożenia",
    "TRL",
    "Status weryfikacji",
    "Data aktualizacji",
  ];
  const rows = items.map((item) => [
    item.title_pl,
    item.short_summary_pl,
    item.problem_pl,
    PRIMARY_AREA_LABELS[item.primary_area],
    item.innovation_character.map((c) => CHARACTER_LABELS[c]).join("; "),
    item.sectors.map((s) => SECTOR_LABELS[s] ?? s).join("; "),
    item.beneficiary_groups.map((b) => BENEFICIARY_LABELS[b] ?? b).join("; "),
    item.organization_name,
    item.origin_location,
    DEPLOYMENT_LABELS[item.deployment_level],
    item.trl !== null ? `${item.trl}/9` : "Nie dotyczy",
    VERIFICATION_LABELS[item.verification_status],
    item.last_verified_at,
  ]);
  return [header, ...rows];
}

export function formatInnovationCardCsv(
  detail: InnovationDetail,
): Array<Array<unknown>> {
  const rows: Array<Array<unknown>> = [
    ["Pole", "Wartość", "Oznaczenie pochodzenia"],
    ["Nazwa", detail.title_pl, "Deklaracja źródła"],
    ["Krótkie podsumowanie", detail.short_summary_pl, "Deklaracja źródła"],
    ["Rozwiązywany problem", detail.problem_pl, "Deklaracja źródła"],
    ["Opis rozwiązania", detail.solution_pl, "Deklaracja źródła"],
    ["Główny obszar", PRIMARY_AREA_LABELS[detail.primary_area], "Obliczenie systemu"],
    [
      "Charakter",
      detail.innovation_character.map((c) => CHARACTER_LABELS[c]).join("; "),
      "Obliczenie systemu",
    ],
    [
      "Branża",
      detail.sectors.map((s) => SECTOR_LABELS[s] ?? s).join("; "),
      "Obliczenie systemu",
    ],
    [
      "Grupy beneficjentów",
      detail.beneficiary_groups.map((b) => BENEFICIARY_LABELS[b] ?? b).join("; "),
      "Obliczenie systemu",
    ],
    ["Autor / Organizacja", detail.organization_name, "Fakt potwierdzony"],
    ["Lokalizacja pochodzenia", detail.origin_location, "Fakt potwierdzony"],
    ["Poziom wdrożenia", DEPLOYMENT_LABELS[detail.deployment_level], "Obliczenie systemu"],
    [
      "TRL",
      detail.trl !== null ? `${detail.trl}/9` : "Nie dotyczy",
      "Obliczenie systemu",
    ],
    ["Status weryfikacji", VERIFICATION_LABELS[detail.verification_status], detail.verification_method],
    ["Data pozyskania", detail.fetched_at, "Obliczenie systemu"],
    ["Data aktualizacji", detail.last_verified_at, "Obliczenie systemu"],
    ["Innowacyjność (%)", detail.scores?.innovativeness ?? "", "Obliczenie systemu"],
    ["Potencjał zastosowania (%)", detail.scores?.application_potential ?? "", "Obliczenie systemu"],
    ["Możliwość transferu (%)", detail.scores?.transferability ?? "", "Obliczenie systemu"],
    ["Wiarygodność (%)", detail.scores?.credibility ?? "", "Obliczenie systemu"],
  ];

  for (const ev of detail.evidences) {
    rows.push([
      `Informacja (${EVIDENCE_KIND_LABELS[ev.kind]})`,
      ev.text_pl,
      ev.source_registry || EVIDENCE_KIND_LABELS[ev.kind],
    ]);
  }
  for (const m of detail.missing_info) {
    rows.push(["Brakująca informacja", m, "Brakująca informacja"]);
  }
  for (const src of detail.sources) {
    rows.push([`Źródło (${src.registry})`, `${src.label} — ${src.url}`, src.last_verified_at]);
  }
  return rows;
}

export function formatComparisonCsv(
  details: InnovationDetail[],
  matchBySlug: Record<string, MatchItem>,
): Array<Array<unknown>> {
  const header = ["Kryterium", ...details.map((d) => d.title_pl)];
  return [
    header,
    ["Organizacja", ...details.map((d) => d.organization_name)],
    ["Rozwiązywany problem", ...details.map((d) => d.problem_pl)],
    [
      "Obszar i charakter",
      ...details.map(
        (d) =>
          `${PRIMARY_AREA_LABELS[d.primary_area]} · ${d.innovation_character
            .map((c) => CHARACTER_LABELS[c])
            .join("; ")}`,
      ),
    ],
    ["Branża", ...details.map((d) => d.sectors.map((s) => SECTOR_LABELS[s] ?? s).join("; "))],
    [
      "Beneficjenci",
      ...details.map((d) =>
        d.beneficiary_groups.map((b) => BENEFICIARY_LABELS[b] ?? b).join("; "),
      ),
    ],
    ["Poziom wdrożenia", ...details.map((d) => DEPLOYMENT_LABELS[d.deployment_level])],
    ["TRL", ...details.map((d) => (d.trl !== null ? `TRL ${d.trl}/9` : "Nie dotyczy"))],
    [
      "Zgodność z potrzebą użytkownika",
      ...details.map((d) => {
        const m = matchBySlug[d.slug];
        return m ? `${m.overall_score}% (${m.primary_reason})` : "Brak aktywnego opisu problemu";
      }),
    ],
    ["Innowacyjność (%)", ...details.map((d) => d.scores?.innovativeness ?? "")],
    ["Potencjał zastosowania (%)", ...details.map((d) => d.scores?.application_potential ?? "")],
    ["Możliwość transferu (%)", ...details.map((d) => d.scores?.transferability ?? "")],
    ["Wiarygodność (%)", ...details.map((d) => d.scores?.credibility ?? "")],
    [
      "Jakość źródeł",
      ...details.map(
        (d) =>
          `${VERIFICATION_LABELS[d.verification_status]} · ${d.sources.length} źródeł (${d.sources
            .map((s) => s.registry)
            .join("; ")})`,
      ),
    ],
    ["Mocne strony", ...details.map((d) => d.strengths.join("; "))],
    ["Ryzyka", ...details.map((d) => d.risks.join("; "))],
    ["Braki informacyjne", ...details.map((d) => d.missing_info.join("; ") || "Brak")],
    ["Sugerowany następny krok", ...details.map((d) => d.suggested_next_step)],
  ];
}

export function formatImplementationPlanCsv(
  plan: ImplementationPlan,
): Array<Array<unknown>> {
  const contact = plan.innovation.contact_info;
  const rows: Array<Array<unknown>> = [
    ["Innowacja", plan.innovation.title_pl],
    ["Wariant planu", PLAN_VARIANT_LABELS[plan.variant]],
    ["Uzasadnienie wariantu", plan.variant_rationale],
    ["Organizacja wdrażająca", String(plan.organization_snapshot.organization_name ?? "")],
    ["Lokalizacja wdrożenia", String(plan.organization_snapshot.deployment_location ?? "")],
    [
      "Kontakt do wdrożenia",
      [
        contact?.unit_name || plan.innovation.organization_name,
        contact?.contact_person,
        contact?.email,
        contact?.phone,
      ]
        .filter(Boolean)
        .join(" | "),
    ],
    ["Wymagane zasoby", plan.requirements.join("; ")],
    ["Ryzyka", plan.risks.join("; ")],
    ["Mierniki sukcesu", plan.success_metrics.join("; ")],
    ["Zgłoszone problemy lub braki", plan.user_reported_issues],
    [],
    ["Faza", "Tytuł fazy", "Status", "Działania", "Rezultat fazy", "Notatka"],
  ];

  for (const step of plan.steps) {
    rows.push([
      `Faza ${step.phase_number}/5`,
      step.title,
      STEP_STATUS_LABELS[step.status],
      step.actions.join(" | "),
      step.deliverable,
      step.notes,
    ]);
  }
  return rows;
}
