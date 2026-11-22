import type { InnovationSummary, MatchItem } from "./radar-api";
import type { SolvePrefillContext } from "../components/SessionProvider";

/** Filters affecting matching require explicit recalculation; beneficiary order is irrelevant. */
export function hasMatchContextChanged(previous: SolvePrefillContext, current: SolvePrefillContext): boolean {
  return previous.problem_text !== current.problem_text || previous.sector !== current.sector ||
    [...previous.beneficiary_groups].sort().join() !== [...current.beneficiary_groups].sort().join() ||
    previous.organization_type !== current.organization_type || previous.deployment_location !== current.deployment_location ||
    previous.problem_scale !== current.problem_scale || previous.preferred_maturity !== current.preferred_maturity;
}

export interface InnovationSearchFilters {
  primaryArea: string;
  character: string;
  sector: string;
  beneficiaries: string[];
  originLocation: string;
  deploymentLevel: string;
  trlMin: string;
  sourceOrgType: string;
  verifiedOnly: boolean;
}

const DEPLOYMENT_RANK: Record<string, number> = {
  concept: 1, prototype: 2, tests: 3, pilot: 4, deployed: 5,
};

/** Apply catalog constraints to either catalog records or ranked problem matches. */
export function selectInnovationResults(
  items: InnovationSummary[],
  filters: InnovationSearchFilters,
  sort: string,
  matches: Record<string, MatchItem> = {},
): InnovationSummary[] {
  const origin = filters.originLocation.trim().toLocaleLowerCase("pl");
  const results = items.filter((item) =>
    (!filters.primaryArea || item.primary_area === filters.primaryArea) &&
    (!filters.character || item.innovation_character.some((character) => character === filters.character)) &&
    (!filters.sector || item.sectors.includes(filters.sector)) &&
    (!filters.beneficiaries.length || filters.beneficiaries.some((key) => item.beneficiary_groups.includes(key))) &&
    (!origin || item.origin_location.toLocaleLowerCase("pl").includes(origin)) &&
    (!filters.deploymentLevel || item.deployment_level === filters.deploymentLevel) &&
    (!filters.trlMin || (item.trl !== null && item.trl >= Number(filters.trlMin))) &&
    (!filters.sourceOrgType || item.organization_type === filters.sourceOrgType) &&
    (!filters.verifiedOnly || item.verification_status === "verified"),
  );
  return results.sort((a, b) => {
    if (sort === "relevance") return (matches[b.slug]?.overall_score ?? 0) - (matches[a.slug]?.overall_score ?? 0);
    if (sort === "name") return a.title_pl.localeCompare(b.title_pl, "pl");
    if (sort === "deployment_level") return DEPLOYMENT_RANK[b.deployment_level] - DEPLOYMENT_RANK[a.deployment_level];
    if (sort === "updated_at") return b.updated_at.localeCompare(a.updated_at);
    return (b.scores?.application_potential ?? 0) - (a.scores?.application_potential ?? 0);
  });
}

export function getLegacySolveRedirect(params: Record<string, string | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else if (value !== undefined) query.set(key, value);
  }
  query.set("mode", "problem");
  return `/innovations?${query}`;
}
