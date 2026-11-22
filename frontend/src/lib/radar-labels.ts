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
export type AdopterDeploymentStatus = "none" | "in_pilot" | "deployed" | "stopped";
export type PciTransferStatus =
  | "unverified"
  | "deployment_confirmed"
  | "effect_verified"
  | "needs_clarification";
export type TransferStageKey =
  | "planning"
  | "validation"
  | "pilot"
  | "deployed"
  | "effect_verified"
  | "stopped";
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

export const ADOPTER_DEPLOYMENT_STATUS_LABELS: Record<AdopterDeploymentStatus, string> = {
  none: "Nie zgłoszono etapu wdrożenia",
  in_pilot: "Trwa pilotaż lub walidacja",
  deployed: "Wdrożono w praktyce",
  stopped: "Zakończono lub wstrzymano",
};

export const PCI_TRANSFER_STATUS_LABELS: Record<PciTransferStatus, string> = {
  unverified: "Oczekuje na weryfikację",
  deployment_confirmed: "Potwierdzone wdrożenie",
  effect_verified: "Zweryfikowany efekt",
  needs_clarification: "Wymaga uzupełnienia",
};

export type ClassificationProvenance =
  | "pci_verified"
  | "source"
  | "rule_based"
  | "ai_suggested"
  | "unknown";

export const PROVENANCE_LABELS: Record<ClassificationProvenance, string> = {
  pci_verified: "Potwierdzone przez PCI",
  source: "Ze źródła",
  rule_based: "Szacunek regułowy",
  ai_suggested: "Szacunek AI",
  unknown: "Brak danych",
};

export const PROVENANCE_SHORT_LABELS: Record<ClassificationProvenance, string> = {
  pci_verified: "Fakt PCI",
  source: "Źródło",
  rule_based: "Szacunek: reguły",
  ai_suggested: "Szacunek: AI",
  unknown: "Brak danych",
};

export const PROVENANCE_TONE: Record<
  ClassificationProvenance,
  "success" | "info" | "warning" | "neutral"
> = {
  pci_verified: "success",
  source: "info",
  rule_based: "warning",
  ai_suggested: "warning",
  unknown: "neutral",
};

export type OsloStatus = "compliant" | "partial" | "needs_verification" | "non_compliant";
export type OsloCriterionStatus = "met" | "partial" | "unknown" | "not_met";

export const OSLO_CRITERION_LABELS: Record<OsloCriterionStatus, string> = {
  met: "Spełnione",
  partial: "Częściowe",
  unknown: "Nieustalone",
  not_met: "Niespełnione",
};

export const OSLO_CRITERION_TONE: Record<
  OsloCriterionStatus,
  "success" | "warning" | "neutral" | "error"
> = {
  met: "success",
  partial: "warning",
  unknown: "neutral",
  not_met: "error",
};

export function getProvenanceMeta(
  provenance: Record<string, string> | undefined,
  field: string,
  hasValue = true,
) {
  const raw = provenance?.[field];
  const key: ClassificationProvenance =
    !hasValue
      ? "unknown"
      : raw === "pci_verified" ||
          raw === "source" ||
          raw === "rule_based" ||
          raw === "ai_suggested" ||
          raw === "unknown"
        ? raw
        : "rule_based";
  return {
    key,
    label: PROVENANCE_LABELS[key],
    shortLabel: PROVENANCE_SHORT_LABELS[key],
    tone: PROVENANCE_TONE[key],
    isFact: key === "pci_verified" || key === "source",
  };
}

export interface OsloAssessmentInput {
  status?: string;
  method?: string;
  compliant?: boolean;
  novelty_status?: string;
  novelty_reason?: string;
  novelty_excerpt?: string;
  availability_status?: string;
  availability_reason?: string;
  novelty?: string;
  implementation_or_availability?: string;
  limitations?: string[];
}

function normalizeCriterionStatus(raw: string | undefined): OsloCriterionStatus {
  if (raw === "met" || raw === "partial" || raw === "unknown" || raw === "not_met") {
    return raw;
  }
  return "unknown";
}

export function getOsloDisplay(
  osloCompliant: boolean | undefined,
  osloAssessment: OsloAssessmentInput | undefined,
  provenance?: Record<string, string>,
) {
  const method = osloAssessment?.method;
  const provKey = provenance?.oslo_compliant;
  const isPciVerified = method === "pci_verified" || provKey === "pci_verified";

  let status: OsloStatus;
  if (
    osloAssessment?.status === "compliant" ||
    osloAssessment?.status === "partial" ||
    osloAssessment?.status === "needs_verification" ||
    osloAssessment?.status === "non_compliant"
  ) {
    status = osloAssessment.status;
  } else if (osloCompliant && isPciVerified) {
    status = "compliant";
  } else if (osloCompliant && osloAssessment?.novelty && osloAssessment?.implementation_or_availability) {
    status = "partial";
  } else if (osloCompliant === false && method === "pci_verified") {
    status = "non_compliant";
  } else {
    status = "needs_verification";
  }

  const badgeLabel =
    status === "compliant" && isPciVerified
      ? "Oslo 2018: potwierdzone przez PCI"
      : status === "compliant"
        ? "Oslo 2018: wstępnie spełnione (szacunek)"
        : status === "partial"
          ? "Oslo 2018: spełnione częściowo"
          : status === "non_compliant"
            ? "Oslo 2018: niespełnione"
            : "Oslo 2018: wymaga weryfikacji";

  const tone: "success" | "info" | "warning" | "neutral" =
    status === "compliant" && isPciVerified
      ? "success"
      : status === "compliant"
        ? "info"
        : status === "partial" || status === "needs_verification"
          ? "warning"
          : "neutral";

  const methodLabel =
    isPciVerified
      ? "Potwierdzone przez PCI"
      : method === "ai_estimate" || provKey === "ai_suggested"
        ? "Szacunek AI"
        : "Klasyfikacja regułowa";

  return {
    status,
    badgeLabel,
    tone,
    methodLabel,
    noveltyStatus: normalizeCriterionStatus(osloAssessment?.novelty_status),
    noveltyReason:
      osloAssessment?.novelty_reason ||
      osloAssessment?.novelty ||
      "Brak szczegółowego uzasadnienia nowości lub ulepszenia w źródle.",
    noveltyExcerpt: osloAssessment?.novelty_excerpt || "",
    availabilityStatus: normalizeCriterionStatus(osloAssessment?.availability_status),
    availabilityReason:
      osloAssessment?.availability_reason ||
      osloAssessment?.implementation_or_availability ||
      "Brak potwierdzenia udostępnienia użytkownikom lub wdrożenia w praktyce.",
    limitations:
      osloAssessment?.limitations && osloAssessment.limitations.length > 0
        ? osloAssessment.limitations
        : [
            "Zgodność z Oslo Manual 2018 wymaga jednoczesnego potwierdzenia nowości/ulepszenia oraz udostępnienia lub wdrożenia.",
          ],
  };
}
