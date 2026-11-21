export type PrimaryArea = "technological" | "educational" | "administrative";
export type InnovationCharacter = "product" | "process" | "organizational" | "social";
export type DeploymentLevel = "concept" | "prototype" | "tests" | "pilot" | "deployed";
export type VerificationStatus = "verified" | "pending_review" | "stale" | "conflict";
export type OrgType =
  | "public_institution"
  | "school"
  | "university"
  | "social_org"
  | "company"
  | "startup"
  | "other";
export type PlanVariant = "validation" | "pilot" | "transfer_deployment";
export type StepStatus = "not_started" | "in_progress" | "completed";
export type EvidenceKind =
  | "verified_fact"
  | "source_declaration"
  | "system_calculation"
  | "ai_estimate"
  | "missing_info";

export const PRIMARY_AREA_LABELS: Record<PrimaryArea, string> = {
  technological: "Technologiczny",
  educational: "Edukacyjny",
  administrative: "Administracyjny",
};

export const CHARACTER_LABELS: Record<InnovationCharacter, string> = {
  product: "Produktowy",
  process: "Procesowy",
  organizational: "Organizacyjny",
  social: "Społeczny",
};

export const DEPLOYMENT_LABELS: Record<DeploymentLevel, string> = {
  concept: "Koncepcja",
  prototype: "Prototyp",
  tests: "Testy",
  pilot: "Wdrożenie pilotażowe",
  deployed: "Stosowane w praktyce",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  verified: "Zweryfikowany",
  pending_review: "Oczekuje na weryfikację",
  stale: "Nieaktualny",
  conflict: "Sprzeczne dane",
};

export const ORG_TYPE_LABELS: Record<OrgType, string> = {
  public_institution: "Gmina lub instytucja publiczna",
  school: "Szkoła",
  university: "Uczelnia",
  social_org: "Organizacja społeczna",
  company: "Firma",
  startup: "Startup",
  other: "Inna organizacja",
};

export const SECTOR_LABELS: Record<string, string> = {
  administracja: "Administracja",
  edukacja: "Edukacja",
  zdrowie_jakosc_zycia: "Zdrowie i jakość życia",
  ICT: "ICT",
  lotnictwo: "Lotnictwo",
  motoryzacja: "Motoryzacja",
  sektor_kosmiczny: "Sektor kosmiczny",
};

export const BENEFICIARY_LABELS: Record<string, string> = {
  children_0_12: "Dzieci (0–12 lat)",
  youth_13_18: "Młodzież (13–18 lat)",
  young_adults_19_26: "Młodzi dorośli (19–26 lat)",
  adults_27_59: "Dorośli (27–59 lat)",
  seniors_60_plus: "Seniorzy (60+)",
  families_parents: "Rodziny, rodzice i opiekunowie",
  disabilities_special_needs: "Osoby z niepełnosprawnościami",
  ill_needing_care: "Osoby chore i wymagające opieki",
  mental_crisis: "Osoby w kryzysie psychicznym",
  difficult_life_situation: "Osoby w trudnej sytuacji życiowej",
  social_digital_exclusion: "Osoby zagrożone wykluczeniem",
  students_teachers: "Uczniowie, studenci i nauczyciele",
  workers_jobseekers: "Pracownicy i poszukujący pracy",
  entrepreneurs_startups: "Przedsiębiorcy i startupy",
  public_orgs_communities: "Instytucje publiczne i społeczności",
};

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  verified_fact: "Fakt potwierdzony",
  source_declaration: "Deklaracja źródła",
  system_calculation: "Obliczenie systemu",
  ai_estimate: "Szacunek / klasyfikacja AI",
  missing_info: "Brakująca informacja",
};

export const PLAN_VARIANT_LABELS: Record<PlanVariant, string> = {
  validation: "Plan walidacji",
  pilot: "Plan pilotażu",
  transfer_deployment: "Plan transferu i wdrożenia",
};

export const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  not_started: "Nierozpoczęty",
  in_progress: "Rozpoczęty",
  completed: "Ukończony",
};
