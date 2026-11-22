import { apiRequest } from "./api";
import type {
  DeploymentLevel,
  EvidenceKind,
  InnovationCharacter,
  OrgType,
  PlanVariant,
  PrimaryArea,
  StepStatus,
  VerificationStatus,
} from "./radar-labels";

export interface InnovationSource {
  id: number;
  label: string;
  registry: string;
  url: string;
  fetched_at: string;
  last_verified_at: string;
  is_available: boolean;
}

export interface EvidenceItem {
  id: number;
  kind: EvidenceKind;
  text_pl: string;
  text_en: string;
  source_id: number | null;
  source_registry: string;
  confidence: string;
  limitation_note: string;
}

export interface InnovationSummary {
  id: number;
  slug: string;
  title_pl: string;
  title_en: string;
  short_summary_pl: string;
  short_summary_en: string;
  problem_pl: string;
  problem_en: string;
  primary_area: PrimaryArea;
  innovation_character: InnovationCharacter[];
  sectors: string[];
  beneficiary_groups: string[];
  target_org_types: OrgType[];
  tags: string[];
  organization_name: string;
  organization_type: OrgType;
  origin_location: string;
  deployment_level: DeploymentLevel;
  trl: number | null;
  classification_provenance?: Record<string, string>;
  verification_status: VerificationStatus;
  last_verified_at: string;
  updated_at: string;
  scores: Record<string, number>;
  missing_info: string[];
  suggested_next_step: string;
}

export interface OsloAssessment {
  status?: "compliant" | "partial" | "needs_verification" | "non_compliant";
  method?: "ai_estimate" | "rule_based" | "pci_verified";
  compliant?: boolean;
  novelty_status?: string;
  novelty_reason?: string;
  novelty_excerpt?: string;
  availability_status?: string;
  availability_reason?: string;
  novelty?: string;
  implementation_or_availability?: string;
  value_rationale?: string;
  limitations?: string[];
}

export interface InnovationDetail extends InnovationSummary {
  solution_pl: string;
  solution_en: string;
  oslo_compliant: boolean;
  oslo_assessment?: OsloAssessment;
  verification_method: string;
  fetched_at: string;
  strengths: string[];
  risks: string[];
  conflicting_info: string[];
  required_resources: string[];
  metrics: string[];
  partner_archetypes: string[];
  sources: InnovationSource[];
  evidences: EvidenceItem[];
}

export interface InnovationRegisteredDetail extends InnovationDetail {
  contact_info: {
    unit_name?: string;
    contact_person?: string;
    email?: string;
    phone?: string;
  };
}

export interface MatchItem {
  innovation: InnovationSummary;
  problem_score: number;
  sector_score: number;
  beneficiary_score: number;
  organization_fit_score: number;
  overall_score: number;
  primary_reason: string;
  reasons: string[];
}

export interface DiscoveryMatchResponse {
  sufficient: boolean;
  guidance_message: string;
  low_confidence: boolean;
  low_confidence_reason: string;
  results: MatchItem[];
}

export interface AdopterProfile {
  organization_type: OrgType;
  organization_name: string;
  role_title: string;
  deployment_location: string;
  potential_users_count: number;
  current_approach: string;
  available_resources: string;
  team_competencies: string;
  target_timeline: string;
  key_constraints: string;
  is_pci_admin: boolean;
  is_complete: boolean;
  updated_at: string;
}

export interface AuthState {
  authenticated: boolean;
  user: {
    id: number;
    email: string;
    full_name: string;
    is_pci_admin: boolean;
  } | null;
  profile: AdopterProfile | null;
}

export interface ImplementationStep {
  id: number;
  phase_number: number;
  phase_key: string;
  title: string;
  actions: string[];
  deliverable: string;
  status: StepStatus;
  notes: string;
  updated_at: string;
}

export interface ImplementationPlan {
  id: number;
  innovation: InnovationRegisteredDetail;
  variant: PlanVariant;
  variant_rationale: string;
  organization_snapshot: Record<string, unknown>;
  comparison_slugs: string[];
  requirements: string[];
  risks: string[];
  success_metrics: string[];
  user_reported_issues: string;
  steps: ImplementationStep[];
  created_at: string;
  updated_at: string;
}

export interface SavedComparison {
  id: number;
  title: string;
  innovation_slugs: string[];
  query_context: Record<string, unknown>;
  created_at: string;
}

export interface SavedInnovation {
  id: number;
  innovation: InnovationSummary;
  created_at: string;
}

export interface AdminInnovationItem {
  slug: string;
  title_pl: string;
  short_summary_pl: string;
  organization_name: string;
  origin_location: string;
  primary_area: PrimaryArea;
  deployment_level: DeploymentLevel;
  trl: number | null;
  oslo_compliant?: boolean;
  oslo_assessment?: OsloAssessment;
  classification_provenance?: Record<string, string>;
  verification_status: VerificationStatus;
  verification_method: string;
  last_verified_at: string;
  missing_info: string[];
  conflicting_info: string[];
  duplicate_of_slug: string;
  is_merged: boolean;
}

export interface SourceFeedConfig {
  live_fetch?: boolean;
  max_records?: number;
  adapter?: string;
}

export interface SourceFeedItem {
  id: number;
  name: string;
  category: string;
  url: string;
  method: string;
  status: "active" | "error" | "stale";
  error_message: string;
  last_synced_at: string;
  records_count: number;
  config?: SourceFeedConfig;
}

export interface ScrapeUrlResponse {
  url: string;
  scraped_count: number;
  created_count: number;
  updated_count: number;
  unchanged_count: number;
  duplicate_count: number;
  conflict_count: number;
  results: Array<{
    innovation: AdminInnovationItem;
    outcome: string;
    potential_duplicate_slug: string;
  }>;
}

export interface IngestionRunItem {
  id: number;
  started_at: string;
  status: string;
  new_records: number;
  updated_records: number;
  errors_count: number;
  summary: string;
}

export interface AdminDataQualityResponse {
  pending_review: AdminInnovationItem[];
  conflicts_or_missing: AdminInnovationItem[];
  potential_duplicates: AdminInnovationItem[];
  stale_records: AdminInnovationItem[];
  all_records: AdminInnovationItem[];
  source_feeds: SourceFeedItem[];
  ingestion_runs: IngestionRunItem[];
}

export interface AdminImplementationOverview {
  plan_id: number;
  user_email: string;
  user_name: string;
  organization_name: string;
  organization_type: string;
  deployment_location: string;
  innovation_slug: string;
  innovation_title: string;
  comparison_slugs: string[];
  variant: PlanVariant;
  current_phase: number;
  completed_steps_count: number;
  total_steps_count: number;
  completed_titles: string[];
  user_reported_issues: string;
  step_notes: string[];
  updated_at: string;
}

export function fetchInnovations(params: Record<string, string | undefined> = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val) qs.set(key, val);
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiRequest<InnovationSummary[]>(`/api/innovations/${suffix}`);
}

export function fetchInnovationDetail(slug: string) {
  return apiRequest<InnovationDetail>(`/api/innovations/${slug}/`);
}

export function fetchInnovationFullDetail(slug: string) {
  return apiRequest<InnovationRegisteredDetail>(`/api/innovations/${slug}/full/`);
}

export function matchProblem(payload: {
  problem_text: string;
  sector?: string;
  beneficiary_groups?: string[];
  organization_type?: string;
  deployment_location?: string;
  problem_scale?: string;
  preferred_maturity?: string;
}) {
  return apiRequest<DiscoveryMatchResponse>("/api/discovery/match/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createMatchNotification(payload: {
  email?: string;
  problem_text: string;
  filters_snapshot?: Record<string, unknown>;
}) {
  return apiRequest<{ id: number; email: string }>("/api/notifications/matches/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchAuthMe() {
  return apiRequest<AuthState>("/api/auth/me/");
}

export function registerAccount(payload: {
  email: string;
  password: string;
  full_name?: string;
  organization_type?: OrgType;
  organization_name?: string;
  role_title?: string;
  deployment_location?: string;
}) {
  return apiRequest<AuthState>("/api/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginAccount(email: string, password: string) {
  return apiRequest<AuthState>("/api/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutAccount() {
  return apiRequest<{ ok: boolean }>("/api/auth/logout/", { method: "POST" });
}

export function updateProfile(payload: Partial<AdopterProfile>) {
  return apiRequest<AdopterProfile>("/api/profile/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchSavedComparisons() {
  return apiRequest<SavedComparison[]>("/api/comparisons/");
}

export function saveComparison(payload: {
  title: string;
  innovation_slugs: string[];
  query_context?: Record<string, unknown>;
}) {
  return apiRequest<SavedComparison>("/api/comparisons/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchSavedInnovations() {
  return apiRequest<SavedInnovation[]>("/api/saved-innovations/");
}

export function saveInnovation(innovation_slug: string) {
  return apiRequest<SavedInnovation>("/api/saved-innovations/", {
    method: "POST",
    body: JSON.stringify({ innovation_slug }),
  });
}

export function removeSavedInnovation(innovation_slug: string) {
  return apiRequest<void>(
    `/api/saved-innovations/${encodeURIComponent(innovation_slug)}/`,
    {
      method: "DELETE",
    },
  );
}

export function fetchImplementationPlans() {
  return apiRequest<ImplementationPlan[]>("/api/implementation-plans/");
}

export function fetchImplementationPlan(id: number) {
  return apiRequest<ImplementationPlan>(`/api/implementation-plans/${id}/`);
}

export function createImplementationPlan(payload: {
  innovation_slug: string;
  comparison_slugs?: string[];
}) {
  return apiRequest<ImplementationPlan>("/api/implementation-plans/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateImplementationPlanIssues(id: number, user_reported_issues: string) {
  return apiRequest<ImplementationPlan>(`/api/implementation-plans/${id}/`, {
    method: "PATCH",
    body: JSON.stringify({ user_reported_issues }),
  });
}

export function updateImplementationStep(
  stepId: number,
  payload: { status?: StepStatus; notes?: string },
) {
  return apiRequest<ImplementationStep>(`/api/implementation-steps/${stepId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchAdminDataQuality() {
  return apiRequest<AdminDataQualityResponse>("/api/admin/innovations/");
}

export function patchAdminInnovation(
  slug: string,
  payload: Partial<AdminInnovationItem>,
) {
  return apiRequest<AdminInnovationItem>(`/api/admin/innovations/${slug}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function mergeDuplicateInnovation(slug: string) {
  return apiRequest<{ merged_slug: string; target_slug: string }>(
    `/api/admin/innovations/${slug}/merge-duplicate/`,
    { method: "POST" },
  );
}

export function runAdminIngestion(payload?: {
  live_fetch?: boolean;
  feed_ids?: number[];
  max_records?: number;
}) {
  return apiRequest<IngestionRunItem>("/api/admin/ingestion/run/", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export function scrapeAdminUrl(payload: {
  url: string;
  registry?: string;
  label?: string;
  organization_name?: string;
  method?: "auto" | "HTML" | "PDF" | "API" | "RSS" | "OAI-PMH";
  max_records?: number;
}) {
  return apiRequest<ScrapeUrlResponse>("/api/admin/ingestion/scrape-url/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createAdminSourceFeed(payload: {
  name: string;
  category: string;
  url: string;
  method: string;
  config?: SourceFeedConfig;
}) {
  return apiRequest<SourceFeedItem>("/api/admin/source-feeds/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchAdminSourceFeed(
  feedId: number,
  payload: Partial<Pick<SourceFeedItem, "name" | "category" | "url" | "method" | "status" | "config">>,
) {
  return apiRequest<SourceFeedItem>(`/api/admin/source-feeds/${feedId}/`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteAdminSourceFeed(feedId: number) {
  return apiRequest<void>(`/api/admin/source-feeds/${feedId}/`, {
    method: "DELETE",
  });
}

export function fetchAdminImplementations() {
  return apiRequest<AdminImplementationOverview[]>("/api/admin/implementations/");
}
