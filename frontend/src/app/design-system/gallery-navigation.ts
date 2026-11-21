export type GalleryGroup =
  | "Library"
  | "Foundations"
  | "Controls"
  | "Data display"
  | "Feedback"
  | "Overlays"
  | "Navigation";

export type GallerySection = {
  id: string;
  name: string;
  group: GalleryGroup;
  keywords: string;
};

export const gallerySections: readonly GallerySection[] = [
  { id: "overview", name: "Overview", group: "Library", keywords: "all components pci radar" },
  { id: "typography", name: "Typography", group: "Foundations", keywords: "text font type scale" },
  { id: "colors", name: "Colors", group: "Foundations", keywords: "palette theme accents contrast" },
  { id: "spacing", name: "Spacing", group: "Foundations", keywords: "layout gutters targets" },
  { id: "buttons", name: "Buttons", group: "Controls", keywords: "actions controls primary secondary" },
  { id: "forms", name: "Forms and controls", group: "Controls", keywords: "planned submit inputs filters search" },
  { id: "scoring-breakdown", name: "Scoring breakdown", group: "Data display", keywords: "planned assessment criteria weights evidence" },
  { id: "tables", name: "Tables", group: "Data display", keywords: "planned catalog records partners" },
  { id: "cards-metrics", name: "Cards and metrics", group: "Data display", keywords: "surfaces statistics readiness" },
  { id: "banners", name: "Banners", group: "Feedback", keywords: "planned demo synthetic notices alerts" },
  { id: "badges-status", name: "Badges and status indicators", group: "Feedback", keywords: "labels tags pass fail evidence" },
  { id: "empty-states", name: "Empty states", group: "Feedback", keywords: "planned no similar results" },
  { id: "loading-states", name: "Loading states", group: "Feedback", keywords: "planned skeleton spinner" },
  { id: "error-states", name: "Error states", group: "Feedback", keywords: "planned failure retry" },
  { id: "dialogs", name: "Dialogs and confirmations", group: "Overlays", keywords: "planned override confirmation" },
  { id: "navigation-bars", name: "Navigation bars", group: "Navigation", keywords: "planned radar submit detail assessment" },
] as const;

export function filterGallerySections(query: string): GallerySection[] {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...gallerySections];
  return gallerySections.filter((section) =>
    words.every((word) =>
      `${section.name} ${section.group} ${section.keywords}`
        .toLocaleLowerCase()
        .includes(word),
    ),
  );
}

export function gallerySectionForHash(hash: string): GallerySection | undefined {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return undefined;
  }
  if (!id) return gallerySections[0];
  const alias =
    id === "semantic-colors"
      ? "colors"
      : id === "breadcrumbs"
        ? "navigation-bars"
        : id;
  return gallerySections.find((section) => section.id === alias);
}

/** Open ancestor disclosures before scrolling to the target section. */
export function revealGalleryTarget(hash: string): void {
  const section = gallerySectionForHash(hash);
  if (!section || typeof document === "undefined") return;

  if (section.id === "overview") {
    const container = document.getElementById("main-content");
    if (container && typeof container.scrollTo === "function") {
      container.scrollTo({ top: 0, behavior: "instant" });
    }
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    return;
  }

  let decodedId: string;
  try {
    decodedId = decodeURIComponent(hash.replace(/^#/, ""));
  } catch {
    return;
  }

  const target = document.getElementById(decodedId);
  if (!target) return;

  let disclosure = target.closest("details");
  while (disclosure) {
    disclosure.open = true;
    disclosure = disclosure.parentElement?.closest("details") ?? null;
  }

  if (typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "instant", block: "start" });
  }
}
