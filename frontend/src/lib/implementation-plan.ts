import type { ImplementationStep } from "./radar-api";
import {
  ORG_TYPE_LABELS,
  type DeploymentLevel,
  type OrgType,
  type PlanVariant,
} from "./radar-labels";

export interface PlanVariantPreview {
  variant: PlanVariant;
  rationale: string;
}

/** Mirror backend deterministic rule (`select_plan_variant`) for pre-generation preview. */
export function resolvePlanVariantPreview(
  deploymentLevel: DeploymentLevel,
  trl: number | null,
): PlanVariantPreview {
  if (
    deploymentLevel === "concept" ||
    (deploymentLevel === "prototype" && (trl ?? 0) <= 3)
  ) {
    return {
      variant: "validation",
      rationale:
        "Innowacja jest na etapie koncepcji lub wczesnego prototypu — system przygotuje plan walidacji przed pilotażem.",
    };
  }
  if (deploymentLevel === "prototype" || deploymentLevel === "tests") {
    return {
      variant: "pilot",
      rationale:
        "Innowacja jest przetestowanym prototypem lub w fazie testów — system przygotuje plan ograniczonego pilotażu.",
    };
  }
  return {
    variant: "transfer_deployment",
    rationale:
      "Innowacja jest wdrożona lub sprawdzona w praktyce — system przygotuje plan transferu i wdrożenia w jednostce.",
  };
}

/** Parse positive integer user count from a controlled text/number input draft. */
export function parseUsersCountInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return parsed;
}

export interface PlanProgressSummary {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  percent: number;
  nextStep: ImplementationStep | null;
  allCompleted: boolean;
}

export interface OrganizationContextEntry {
  id: string;
  label: string;
  value: string;
}

/** Compute overall completion counts, percentage, and the active/next step for a plan. */
export function computePlanProgress(
  steps: readonly ImplementationStep[],
): PlanProgressSummary {
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "completed").length;
  const inProgress = steps.filter((s) => s.status === "in_progress").length;
  const notStarted = Math.max(0, total - completed - inProgress);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const nextStep =
    steps.find((s) => s.status === "in_progress") ??
    steps.find((s) => s.status !== "completed") ??
    null;

  return {
    total,
    completed,
    inProgress,
    notStarted,
    percent,
    nextStep,
    allCompleted: total > 0 && completed === total,
  };
}

const SNAPSHOT_FIELDS: ReadonlyArray<{
  key: string;
  label: string;
  format?: (raw: unknown) => string;
}> = [
  { key: "organization_name", label: "Organizacja" },
  {
    key: "organization_type",
    label: "Typ organizacji",
    format: (raw) => {
      const str = typeof raw === "string" ? raw.trim() : "";
      if (!str) return "";
      return ORG_TYPE_LABELS[str as OrgType] ?? str;
    },
  },
  { key: "role_title", label: "Rola koordynatora" },
  { key: "deployment_location", label: "Lokalizacja wdrożenia" },
  {
    key: "potential_users_count",
    label: "Skala odbiorców",
    format: (raw) => {
      const num = typeof raw === "number" ? raw : Number(raw);
      return Number.isFinite(num) && num > 0 ? `${num} osób` : "";
    },
  },
  { key: "target_timeline", label: "Zakładany termin" },
  { key: "current_approach", label: "Obecny sposób działania" },
  { key: "available_resources", label: "Dostępne zasoby" },
  { key: "team_competencies", label: "Kompetencje zespołu" },
  { key: "key_constraints", label: "Kluczowe ograniczenia" },
];

/** Extract non-empty Polish-labeled entries from an implementation plan's organization snapshot. */
export function extractOrganizationContextItems(
  snapshot: Record<string, unknown> | null | undefined,
): OrganizationContextEntry[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const entries: OrganizationContextEntry[] = [];

  for (const field of SNAPSHOT_FIELDS) {
    const raw = snapshot[field.key];
    const formatted = field.format
      ? field.format(raw)
      : typeof raw === "string"
        ? raw.trim()
        : "";
    if (formatted) {
      entries.push({
        id: field.key,
        label: field.label,
        value: formatted,
      });
    }
  }
  return entries;
}

/** Format an ISO timestamp safely for Polish UI metadata without throwing on invalid strings. */
export function formatPlanDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}
