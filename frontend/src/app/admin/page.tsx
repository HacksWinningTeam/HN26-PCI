"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useSession } from "@/components/SessionProvider";
import { SkipToContentLink } from "@/components/SkipToContentLink";
import {
  AppFooter,
  AppShellLayout,
  Badge,
  Banner,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandLayersIcon,
  BrandLimeBurstIcon,
  BrandSearchIdeaIcon,
  BuildingsIcon,
  Button,
  CardSurface,
  ClockIcon,
  CloseIcon,
  DatabaseIcon,
  DataTable,
  Dropdown,
  EmptyState,
  ErrorState,
  GitMergeIcon,
  IconButton,
  LoadingState,
  MenuIcon,
  NavBar,
  NumberInput,
  PlusIcon,
  RefreshIcon,
  ShieldCheckIcon,
  Sidebar,
  SidebarUtilities,
  SparkleIcon,
  StatFilterCard,
  Switch,
  TargetIcon,
  TextInput,
  defaultTableState,
  type TableColumn,
  type TableState,
} from "@/components/ui";
import {
  createAdminSourceFeed,
  deleteAdminSourceFeed,
  fetchAdminDataQuality,
  fetchAdminImpactRadar,
  fetchAdminImplementations,
  mergeDuplicateInnovation,
  patchAdminInnovation,
  patchAdminSourceFeed,
  runAdminIngestion,
  scrapeAdminUrl,
  verifyAdminTransfer,
  type AdminDataQualityResponse,
  type AdminImpactRadarResponse,
  type AdminImplementationOverview,
  type AdminInnovationItem,
  type SourceFeedItem,
} from "@/lib/radar-api";
import { ImpactRadarPanel } from "@/components/admin/ImpactRadarPanel";
import {
  DEPLOYMENT_LABELS,
  getProvenanceMeta,
  ORG_TYPE_LABELS,
  PLAN_VARIANT_LABELS,
  VERIFICATION_LABELS,
  type DeploymentLevel,
  type OrgType,
  type VerificationStatus,
} from "@/lib/radar-labels";

type AdminTab = "radar" | "quality" | "duplicates" | "feeds" | "activity";
type RecordFilter = "all" | "pending" | "issues" | "duplicates" | "stale";

const STATUS_BADGE_TONE: Record<
  VerificationStatus,
  "success" | "info" | "warning" | "error"
> = {
  verified: "success",
  pending_review: "info",
  stale: "warning",
  conflict: "error",
};

const FEED_STATUS_LABELS: Record<"active" | "error" | "stale", string> = {
  active: "Aktywne",
  error: "Błąd pobierania",
  stale: "Nieaktualne źródło",
};

const FEED_STATUS_TONE: Record<"active" | "error" | "stale", "success" | "error" | "warning"> = {
  active: "success",
  error: "error",
  stale: "warning",
};

const PRIORITY_ORDER: Record<VerificationStatus, number> = {
  conflict: 0,
  pending_review: 1,
  stale: 2,
  verified: 3,
};

const SCRAPE_METHOD_OPTIONS = [
  { value: "auto", label: "Auto-detekcja (HTML / PDF / API / RSS / OAI)" },
  { value: "HTML", label: "Strona WWW (HTML)" },
  { value: "PDF", label: "Dokument PDF (pypdf)" },
  { value: "API", label: "JSON API (CORDIS / Dane.gov.pl / OpenAlex)" },
  { value: "RSS", label: "Kanał RSS / Atom" },
  { value: "OAI-PMH", label: "Repozytorium OAI-PMH (XML)" },
] as const;

const FEED_CATEGORY_OPTIONS = [
  { value: "Projekty B+R", label: "Projekty B+R" },
  { value: "Nauka i patenty", label: "Nauka i patenty" },
  { value: "Administracja i edukacja", label: "Administracja i edukacja" },
] as const;

const FEED_METHOD_OPTIONS = [
  { value: "API", label: "JSON API" },
  { value: "RSS", label: "RSS / Atom" },
  { value: "OAI-PMH", label: "OAI-PMH" },
  { value: "HTML", label: "Strona HTML" },
  { value: "PDF", label: "Dokument PDF" },
] as const;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AdminPage() {
  const { auth, authLoaded, logout, setCompareSlugs } = useSession();
  const editorRef = useRef<HTMLFormElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  const searchId = useId();

  const [tab, setTab] = useState<AdminTab>("radar");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [recordTableState, setRecordTableState] = useState<TableState>(defaultTableState);
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);

  const [radar, setRadar] = useState<AdminImpactRadarResponse | null>(null);
  const [quality, setQuality] = useState<AdminDataQualityResponse | null>(null);
  const [activity, setActivity] = useState<AdminImplementationOverview[]>([]);
  const [editing, setEditing] = useState<AdminInnovationItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<VerificationStatus>("verified");
  const [editLocation, setEditLocation] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDeploymentLevel, setEditDeploymentLevel] = useState<DeploymentLevel>("concept");
  const [editTrl, setEditTrl] = useState("");
  const [editOsloCompliant, setEditOsloCompliant] = useState<"true" | "false">("false");
  const [clearConflicts, setClearConflicts] = useState(false);
  const [clearMissing, setClearMissing] = useState(false);

  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scrapeRegistry, setScrapeRegistry] = useState("");
  const [scrapeMethod, setScrapeMethod] = useState<"auto" | "HTML" | "PDF" | "API" | "RSS" | "OAI-PMH">("auto");
  const [scrapingUrl, setScrapingUrl] = useState(false);
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [feedName, setFeedName] = useState("");
  const [feedCategory, setFeedCategory] = useState("Projekty B+R");
  const [feedUrl, setFeedUrl] = useState("");
  const [feedMethod, setFeedMethod] = useState("API");
  const [feedMaxRecords, setFeedMaxRecords] = useState(10);
  const [feedLiveFetch, setFeedLiveFetch] = useState(true);
  const [savingFeed, setSavingFeed] = useState(false);
  const [busyFeedId, setBusyFeedId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [q, a, r] = await Promise.all([
        fetchAdminDataQuality(),
        fetchAdminImplementations(),
        fetchAdminImpactRadar(),
      ]);
      setQuality(q);
      setActivity(a);
      setRadar(r);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Nie udało się pobrać danych panelu PCI.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoaded || !auth.authenticated || !auth.user?.is_pci_admin) {
      return;
    }
    let active = true;
    void Promise.all([
      fetchAdminDataQuality(),
      fetchAdminImplementations(),
      fetchAdminImpactRadar(),
    ])
      .then(([q, a, r]) => {
        if (!active) return;
        setQuality(q);
        setActivity(a);
        setRadar(r);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Nie udało się pobrać danych panelu PCI.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [auth.authenticated, auth.user?.is_pci_admin, authLoaded]);

  async function handleLogout() {
    await logout();
  }

  async function handleVerifyTransfer(
    planId: number,
    payload: {
      pci_transfer_status:
        | "deployment_confirmed"
        | "effect_verified"
        | "needs_clarification";
      pci_transfer_note: string;
    },
  ) {
    setMessage("");
    setError("");
    const updated = await verifyAdminTransfer(planId, payload);
    const nextRadar = await fetchAdminImpactRadar();
    setRadar(nextRadar);
    setMessage(
      `Zaktualizowano status transferu „${updated.innovation_title}” (${updated.organization_name}) na: ${updated.stage_label}.`,
    );
  }

  async function handleMergeDuplicate(slug: string) {
    setMessage("");
    setError("");
    setBusySlug(slug);
    try {
      const res = await mergeDuplicateInnovation(slug);
      setMessage(
        `Scalono duplikat z rekordem głównym (${res.target_slug}).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd scalania duplikatu.");
    } finally {
      setBusySlug(null);
    }
  }

  async function handleQuickVerify(rec: AdminInnovationItem) {
    setMessage("");
    setError("");
    setBusySlug(rec.slug);
    try {
      await patchAdminInnovation(rec.slug, {
        verification_status: "verified",
        verification_method:
          rec.verification_method || "Zweryfikowano przez operatora PCI",
      });
      setMessage(`Zatwierdzono rekord „${rec.title_pl}”.`);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Nie udało się zatwierdzić rekordu.",
      );
    } finally {
      setBusySlug(null);
    }
  }

  async function handleRunIngestion(feedIds?: number[]) {
    setMessage("");
    setError("");
    setIngesting(true);
    try {
      const run = await runAdminIngestion({
        live_fetch: true,
        ...(feedIds && feedIds.length > 0 ? { feed_ids: feedIds } : {}),
      });
      setMessage(`Pobrano aktualne dane ze źródeł: ${run.summary}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd odświeżania źródeł.");
    } finally {
      setIngesting(false);
    }
  }

  async function handleScrapeUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!scrapeUrl.trim()) return;
    setMessage("");
    setError("");
    setScrapingUrl(true);
    try {
      const res = await scrapeAdminUrl({
        url: scrapeUrl.trim(),
        registry: scrapeRegistry.trim() || undefined,
        method: scrapeMethod,
      });
      const firstTitle = res.results[0]?.innovation.title_pl ?? scrapeUrl;
      setMessage(
        `Zescrapowano ${res.scraped_count} rekord(y): nowe ${res.created_count}, zaktualizowane ${res.updated_count}, duplikaty ${res.duplicate_count}. Ostatni: „${firstTitle}” (w kolejce do weryfikacji).`,
      );
      setScrapeUrl("");
      setScrapeRegistry("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać wskazanego URL.");
    } finally {
      setScrapingUrl(false);
    }
  }

  async function handleCreateFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!feedName.trim() || !feedUrl.trim()) return;
    setMessage("");
    setError("");
    setSavingFeed(true);
    try {
      const created = await createAdminSourceFeed({
        name: feedName.trim(),
        category: feedCategory.trim() || "Projekty B+R",
        url: feedUrl.trim(),
        method: feedMethod,
        config: {
          live_fetch: feedLiveFetch,
          max_records: feedMaxRecords,
        },
      });
      setMessage(`Dodano kanał źródłowy „${created.name}”.`);
      setFeedName("");
      setFeedUrl("");
      setShowAddFeed(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać kanału źródłowego.");
    } finally {
      setSavingFeed(false);
    }
  }

  async function handleToggleFeedLive(feed: SourceFeedItem) {
    setMessage("");
    setError("");
    setBusyFeedId(feed.id);
    try {
      const nextLive = !(feed.config?.live_fetch ?? true);
      await patchAdminSourceFeed(feed.id, {
        config: {
          ...(feed.config ?? {}),
          live_fetch: nextLive,
        },
      });
      setMessage(
        `Kanał „${feed.name}”: automatyczne pobieranie ${nextLive ? "włączone" : "wyłączone"}.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować kanału.");
    } finally {
      setBusyFeedId(null);
    }
  }

  async function handleDeleteFeed(feed: SourceFeedItem) {
    setMessage("");
    setError("");
    setBusyFeedId(feed.id);
    try {
      await deleteAdminSourceFeed(feed.id);
      setMessage(`Usunięto kanał „${feed.name}”.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć kanału.");
    } finally {
      setBusyFeedId(null);
    }
  }

  function startEdit(item: AdminInnovationItem) {
    setEditing(item);
    setEditTitle(item.title_pl);
    setEditStatus(item.verification_status);
    setEditLocation(item.origin_location);
    setEditMethod(item.verification_method);
    setEditSummary(item.short_summary_pl);
    setEditDeploymentLevel(item.deployment_level);
    setEditTrl(item.trl !== null ? String(item.trl) : "");
    setEditOsloCompliant(item.oslo_compliant ? "true" : "false");
    setClearConflicts(false);
    setClearMissing(false);
    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setMessage("");
    setError("");
    const trimmedTrl = editTrl.trim();
    let parsedTrl: number | null = null;
    if (trimmedTrl !== "") {
      const n = Number(trimmedTrl);
      if (!Number.isInteger(n) || n < 1 || n > 9) {
        setError("Poziom TRL musi być liczbą całkowitą od 1 do 9 (albo pusty).");
        return;
      }
      parsedTrl = n;
    }
    try {
      await patchAdminInnovation(editing.slug, {
        title_pl: editTitle,
        short_summary_pl: editSummary,
        verification_status: editStatus,
        verification_method: editMethod,
        origin_location: editLocation,
        deployment_level: editDeploymentLevel,
        trl: parsedTrl,
        oslo_compliant: editOsloCompliant === "true",
        ...(clearConflicts ? { conflicting_info: [] } : {}),
        ...(clearMissing ? { missing_info: [] } : {}),
      });
      setMessage(`Zapisano zmiany w rekordzie „${editTitle}”.`);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu rekordu.");
    }
  }

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase("pl-PL");

  const recordBySlug = useMemo(() => {
    const map: Record<string, AdminInnovationItem> = {};
    for (const r of quality?.all_records ?? []) {
      map[r.slug] = r;
    }
    return map;
  }, [quality]);

  const filteredRecords = useMemo(() => {
    if (!quality) return [];
    const base =
      recordFilter === "pending"
        ? quality.pending_review
        : recordFilter === "issues"
          ? quality.conflicts_or_missing
          : recordFilter === "duplicates"
            ? quality.potential_duplicates
            : recordFilter === "stale"
              ? quality.stale_records
              : quality.all_records;

    const searched = normalizedQuery
      ? base.filter((rec) =>
          [
            rec.title_pl,
            rec.organization_name,
            rec.origin_location,
            rec.slug,
            ...rec.conflicting_info,
            ...rec.missing_info,
          ]
            .join(" ")
            .toLocaleLowerCase("pl-PL")
            .includes(normalizedQuery),
        )
      : base;

    return [...searched].sort(
      (a, b) =>
        (PRIORITY_ORDER[a.verification_status] ?? 9) -
        (PRIORITY_ORDER[b.verification_status] ?? 9),
    );
  }, [normalizedQuery, quality, recordFilter]);

  const filteredDuplicates = useMemo(() => {
    const list = quality?.potential_duplicates ?? [];
    if (!normalizedQuery) return list;
    return list.filter((dup) =>
      [dup.title_pl, dup.organization_name, dup.slug, dup.duplicate_of_slug]
        .join(" ")
        .toLocaleLowerCase("pl-PL")
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, quality]);

  const filteredFeeds = useMemo(() => {
    const feeds = quality?.source_feeds ?? [];
    if (!normalizedQuery) return feeds;
    return feeds.filter((feed) =>
      [feed.name, feed.category, feed.method, feed.url, feed.error_message]
        .join(" ")
        .toLocaleLowerCase("pl-PL")
        .includes(normalizedQuery),
    );
  }, [normalizedQuery, quality]);

  const displayedActivity = useMemo(() => {
    const base = onlyWithIssues
      ? activity.filter(
          (row) => Boolean(row.user_reported_issues) || row.step_notes.length > 0,
        )
      : activity;

    if (!normalizedQuery) return base;
    return base.filter((row) =>
      [
        row.user_name,
        row.user_email,
        row.organization_name,
        row.innovation_title,
        row.deployment_location,
        row.user_reported_issues,
        ...row.step_notes,
      ]
        .join(" ")
        .toLocaleLowerCase("pl-PL")
        .includes(normalizedQuery),
    );
  }, [activity, normalizedQuery, onlyWithIssues]);

  const activityIssuesCount = useMemo(
    () =>
      activity.filter(
        (row) => Boolean(row.user_reported_issues) || row.step_notes.length > 0,
      ).length,
    [activity],
  );

  const duplicateCount = quality?.potential_duplicates.length ?? 0;
  const awaitingRadarCount = radar?.funnel.awaiting_pci_review ?? 0;

  const sidebarItems = [
    {
      id: "radar",
      label:
        awaitingRadarCount > 0
          ? `Impact Radar (${awaitingRadarCount})`
          : "Impact Radar",
      icon: <TargetIcon size={20} />,
      active: tab === "radar",
      current: "page" as const,
      onSelect: () => {
        setTab("radar");
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      },
    },
    {
      id: "quality",
      label: "Jakość i weryfikacja",
      icon: <ShieldCheckIcon size={20} />,
      active: tab === "quality",
      current: "page" as const,
      onSelect: () => {
        setTab("quality");
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      },
    },
    {
      id: "duplicates",
      label: duplicateCount > 0 ? `Duplikaty (${duplicateCount})` : "Duplikaty",
      icon: <GitMergeIcon size={20} />,
      active: tab === "duplicates",
      current: "page" as const,
      onSelect: () => {
        setTab("duplicates");
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      },
    },
    {
      id: "feeds",
      label: "Źródła publiczne",
      icon: <DatabaseIcon size={20} />,
      active: tab === "feeds",
      current: "page" as const,
      onSelect: () => {
        setTab("feeds");
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      },
    },
    {
      id: "activity",
      label: `Wdrożenia (${activity.length})`,
      icon: <BuildingsIcon size={20} />,
      active: tab === "activity",
      current: "page" as const,
      onSelect: () => {
        setTab("activity");
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      },
    },
  ];

  const sectionMeta: Record<AdminTab, { title: string; breadcrumb: string }> = {
    radar: { title: "Impact Radar", breadcrumb: "Impact Radar" },
    quality: { title: "Jakość i weryfikacja", breadcrumb: "Jakość danych" },
    duplicates: { title: "Duplikaty rekordów", breadcrumb: "Duplikaty" },
    feeds: { title: "Źródła publiczne", breadcrumb: "Źródła" },
    activity: { title: "Wdrożenia organizacji", breadcrumb: "Wdrożenia" },
  };

  function searchField(id: string) {
    return (
      <div className="w-full">
        <label htmlFor={id} className="sr-only">
          Szukaj w panelu administratora
        </label>
        <input
          id={id}
          type="search"
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setRecordTableState((state) => ({ ...state, page: 0 }));
          }}
          placeholder="Szukaj rekordu, źródła lub organizacji…"
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
        />
      </div>
    );
  }

  const filterCards: Array<{
    key: RecordFilter;
    label: string;
    hint: string;
    count: number;
  }> = quality
    ? [
        {
          key: "all",
          label: "Wszystkie rekordy",
          hint: "Pełna baza innowacji",
          count: quality.all_records.length,
        },
        {
          key: "pending",
          label: "Do weryfikacji",
          hint: "Oczekujące lub sprzeczne",
          count: quality.pending_review.length,
        },
        {
          key: "issues",
          label: "Braki i sprzeczności",
          hint: "Wymagają uzupełnienia",
          count: quality.conflicts_or_missing.length,
        },
        {
          key: "duplicates",
          label: "Duplikaty",
          hint: "Do scalenia z głównym",
          count: quality.potential_duplicates.length,
        },
        {
          key: "stale",
          label: "Nieaktualne",
          hint: "Dawno nieodświeżane",
          count: quality.stale_records.length,
        },
      ]
    : [];

  const latestRun = quality?.ingestion_runs?.[0] ?? null;

  const recordColumns: TableColumn<AdminInnovationItem>[] = [
    {
      id: "innovation",
      label: "Innowacja i pochodzenie",
      minWidth: 240,
      value: (rec) => `${rec.title_pl} ${rec.organization_name} ${rec.origin_location}`,
      sortable: true,
      filter: "text",
      render: (rec) => (
        <div className="space-y-0.5">
          <div className="font-semibold">{rec.title_pl}</div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {rec.organization_name} · {rec.origin_location}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      label: "Status",
      minWidth: 140,
      value: (rec) => rec.verification_status,
      sortable: true,
      filter: "category",
      options: Object.entries(VERIFICATION_LABELS).map(([value, label]) => ({ value, label })),
      render: (rec) => (
        <Badge tone={STATUS_BADGE_TONE[rec.verification_status]} size="compact">
          {VERIFICATION_LABELS[rec.verification_status]}
        </Badge>
      ),
    },
    {
      id: "issues",
      label: "Wykryte problemy / braki",
      minWidth: 240,
      value: (rec) => [...rec.conflicting_info, ...rec.missing_info].join(" ") || "Brak uwag",
      filter: "text",
      render: (rec) => (
        <div className="space-y-1 text-[var(--color-text-muted)]">
          {rec.conflicting_info.map((conflict, index) => (
            <div key={`conflict-${index}`} className="text-[var(--color-error-text)]">
              <strong>Sprzeczność:</strong> {conflict}
            </div>
          ))}
          {rec.missing_info.map((missing, index) => (
            <div key={`missing-${index}`}>
              <strong>Brak:</strong> {missing}
            </div>
          ))}
          {rec.conflicting_info.length === 0 && rec.missing_info.length === 0
            ? "Brak uwag"
            : null}
        </div>
      ),
    },
    {
      id: "verifiedAt",
      label: "Ostatnia weryfikacja",
      minWidth: 160,
      value: (rec) => rec.last_verified_at || null,
      sortable: true,
      render: (rec) => <span className="font-mono">{rec.last_verified_at}</span>,
    },
    {
      id: "actions",
      label: "Działania",
      minWidth: 200,
      render: (rec) => (
        <div className="flex flex-wrap gap-1.5">
          {rec.verification_status !== "verified" ? (
            <Button
              type="button"
              variant="outline"
              tone="success"
              disabled={busySlug === rec.slug}
              aria-label={`Zatwierdź: ${rec.title_pl}`}
              onClick={() => void handleQuickVerify(rec)}
            >
              Zatwierdź
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            aria-label={`Edytuj: ${rec.title_pl}`}
            onClick={() => startEdit(rec)}
          >
            Edytuj
          </Button>
          <Link
            href={`/innovations/${rec.slug}`}
            aria-label={`Otwórz kartę: ${rec.title_pl}`}
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--color-border-subtle)] px-3 text-sm font-semibold text-[var(--color-accent-text)] hover:underline"
          >
            Karta ↗
          </Link>
        </div>
      ),
    },
  ];

  if (!authLoaded || !auth.authenticated || !auth.user?.is_pci_admin) {
    return (
      <>
        <SkipToContentLink />
        <main
          id="main-content"
          className="flex min-h-screen flex-1 items-center justify-center bg-[var(--color-canvas)] px-4 py-12"
        >
          <div className="w-full max-w-md">
            <LoadingState
              label="Sprawdzanie uprawnień operatora PCI…"
              description="Chwilę, trwa weryfikacja sesji."
            />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SkipToContentLink />

      <AppShellLayout
        viewport
        contentAs="main"
        contentId="main-content"
        navigationId={navigationId}
        mobileMenuOpen={mobileMenuOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileMenuOpen) {
            setMobileMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
        sidebar={
          <Sidebar
            label="Nawigacja panelu PCI"
            mobileSearch={searchField(`${searchId}-mobile`)}
            brand={
              <Link
                href="/admin"
                aria-label="Praktoteka — Panel PCI"
                className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sidebar-focus)]"
              >
                <BrandLogo />
              </Link>
            }
            items={sidebarItems}
            footer={<SidebarUtilities onLogout={handleLogout} />}
          />
        }
        navbar={
          <header>
            <NavBar
              title={sectionMeta[tab].title}
              breadcrumbs={[
                { label: "Praktoteka", href: "/admin" },
                { label: "Panel PCI" },
                { label: sectionMeta[tab].breadcrumb },
              ]}
              leading={
                <IconButton
                  ref={menuButton}
                  variant="outline"
                  className="md:hidden"
                  aria-label={mobileMenuOpen ? "Zamknij menu panelu" : "Otwórz menu panelu"}
                  aria-expanded={mobileMenuOpen}
                  aria-controls={navigationId}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                </IconButton>
              }
              search={searchField(`${searchId}-desktop`)}
              actions={
                <Button
                  variant="outline"
                  leadingIcon={<RefreshIcon className={ingesting ? "animate-spin" : undefined} />}
                  disabled={ingesting || loading}
                  onClick={() => void handleRunIngestion()}
                >
                  {ingesting ? "Odświeżanie…" : "Odśwież źródła"}
                </Button>
              }
              mobileActions={
                <IconButton
                  variant="outline"
                  aria-label={ingesting ? "Odświeżanie źródeł…" : "Odśwież źródła"}
                  disabled={ingesting || loading}
                  onClick={() => void handleRunIngestion()}
                >
                  <RefreshIcon size={20} className={ingesting ? "animate-spin" : undefined} />
                </IconButton>
              }
            />
          </header>
        }
        footer={<AppFooter />}
      >
        <div className="space-y-6">
          {message ? (
            <Banner
              tone="success"
              appearance="tinted"
              announcement="polite"
              onDismiss={() => setMessage("")}
            >
              {message}
            </Banner>
          ) : null}

          {error && quality ? (
            <Banner
              tone="error"
              appearance="tinted"
              announcement="assertive"
              onDismiss={() => setError("")}
            >
              {error}
            </Banner>
          ) : null}

          {loading ? (
            <LoadingState
              label="Ładowanie panelu administratora PCI…"
              description="Pobieramy status jakości danych, kanały źródeł oraz wdrożenia organizacji."
            />
          ) : error && !quality ? (
            <ErrorState message={error} onRetry={() => void load()} />
          ) : null}

          {!loading && tab === "radar" && radar ? (
            <ImpactRadarPanel
              radar={radar}
              searchQuery={searchQuery}
              onVerifyTransfer={handleVerifyTransfer}
            />
          ) : null}

          {!loading && tab === "quality" && quality ? (
            <div className="space-y-6">
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
                role="group"
                aria-label="Filtruj rekordy według statusu jakości"
              >
                {filterCards.map((card) => (
                  <StatFilterCard
                    key={card.key}
                    count={card.count}
                    label={card.label}
                    hint={card.hint}
                    active={recordFilter === card.key}
                    accent={card.key === "all" ? "lime" : "cyan"}
                    onClick={() => {
                      setRecordFilter(card.key);
                      setRecordTableState((state) => ({ ...state, page: 0 }));
                    }}
                  />
                ))}
              </div>

              {editing ? (
                <form
                  ref={editorRef}
                  onSubmit={handleSaveEdit}
                  className="space-y-4 rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      Edycja rekordu: {editing.title_pl}
                    </h2>
                    <Link
                      href={`/innovations/${editing.slug}`}
                      className="text-xs font-semibold text-[var(--color-accent-text)] underline"
                    >
                      Otwórz kartę publiczną ↗
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="ed-title" className="mb-1 block text-xs font-semibold">
                        Nazwa innowacji
                      </label>
                      <input
                        id="ed-title"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ed-loc" className="mb-1 block text-xs font-semibold">
                        Lokalizacja pochodzenia
                      </label>
                      <input
                        id="ed-loc"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ed-status" className="mb-1 block text-xs font-semibold">
                        Status weryfikacji
                      </label>
                      <select
                        id="ed-status"
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as VerificationStatus)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      >
                        {Object.entries(VERIFICATION_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="ed-method" className="mb-1 block text-xs font-semibold">
                        Sposób weryfikacji
                      </label>
                      <input
                        id="ed-method"
                        value={editMethod}
                        onChange={(e) => setEditMethod(e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="ed-summary" className="mb-1 block text-xs font-semibold">
                        Krótkie podsumowanie
                      </label>
                      <input
                        id="ed-summary"
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label htmlFor="ed-deployment" className="mb-1 block text-xs font-semibold">
                        Poziom wdrożenia
                      </label>
                      <select
                        id="ed-deployment"
                        aria-describedby="ed-deployment-hint"
                        value={editDeploymentLevel}
                        onChange={(e) =>
                          setEditDeploymentLevel(e.target.value as DeploymentLevel)
                        }
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      >
                        {Object.entries(DEPLOYMENT_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <p id="ed-deployment-hint" className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        Obecnie:{" "}
                        {
                          getProvenanceMeta(editing.classification_provenance, "deployment_level")
                            .label
                        }
                      </p>
                    </div>
                    <div>
                      <label htmlFor="ed-trl" className="mb-1 block text-xs font-semibold">
                        Poziom TRL (1–9, opcjonalnie)
                      </label>
                      <input
                        id="ed-trl"
                        type="number"
                        min={1}
                        max={9}
                        aria-describedby="ed-trl-hint"
                        placeholder="Brak / nie dotyczy"
                        value={editTrl}
                        onChange={(e) => setEditTrl(e.target.value)}
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      />
                      <p id="ed-trl-hint" className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        Obecnie:{" "}
                        {
                          getProvenanceMeta(
                            editing.classification_provenance,
                            "trl",
                            editing.trl !== null,
                          ).label
                        }
                      </p>
                    </div>
                    <div>
                      <label htmlFor="ed-oslo" className="mb-1 block text-xs font-semibold">
                        Zgodność z Oslo Manual 2018
                      </label>
                      <select
                        id="ed-oslo"
                        aria-describedby="ed-oslo-hint"
                        value={editOsloCompliant}
                        onChange={(e) =>
                          setEditOsloCompliant(e.target.value as "true" | "false")
                        }
                        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
                      >
                        <option value="false">Wymaga weryfikacji / niespełniona</option>
                        <option value="true">Potwierdzona zgodność (Oslo 2018)</option>
                      </select>
                      <p id="ed-oslo-hint" className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                        Obecnie:{" "}
                        {
                          getProvenanceMeta(editing.classification_provenance, "oslo_compliant")
                            .label
                        }
                      </p>
                    </div>
                  </div>

                  {editing.conflicting_info.length > 0 || editing.missing_info.length > 0 ? (
                    <div className="flex flex-wrap gap-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs">
                      {editing.conflicting_info.length > 0 ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={clearConflicts}
                            onChange={(e) => setClearConflicts(e.target.checked)}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                          />
                          <span>
                            Wyczyść wyjaśnione sprzeczności ({editing.conflicting_info.length})
                          </span>
                        </label>
                      ) : null}
                      {editing.missing_info.length > 0 ? (
                        <label className="inline-flex cursor-pointer items-center gap-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={clearMissing}
                            onChange={(e) => setClearMissing(e.target.checked)}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                          />
                          <span>
                            Oznacz braki informacyjne jako uzupełnione ({editing.missing_info.length})
                          </span>
                        </label>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="compact">
                      Zapisz zmiany
                    </Button>
                    <Button
                      type="button"
                      size="compact"
                      variant="outline"
                      onClick={() => setEditing(null)}
                    >
                      Anuluj
                    </Button>
                  </div>
                </form>
              ) : null}

              <CardSurface variant="subtle" className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      {filterCards.find((c) => c.key === recordFilter)?.label ?? "Rekordy"} (
                      {filteredRecords.length})
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Domyślnie rekordy wymagające decyzji operatora są na początku listy.
                    </p>
                  </div>
                  {recordFilter !== "all" || normalizedQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRecordFilter("all");
                        setSearchQuery("");
                        setRecordTableState(defaultTableState);
                      }}
                      className="min-h-11 cursor-pointer text-xs font-semibold text-[var(--color-accent-text)] underline"
                    >
                      Wyczyść filtry i pokaż wszystkie
                    </button>
                  ) : null}
                </div>

                <DataTable
                  name="Lista innowacji"
                  rows={filteredRecords}
                  columns={recordColumns}
                  getRowId={(rec) => rec.slug}
                  state={recordTableState}
                  onStateChange={setRecordTableState}
                  search={false}
                  filters
                  sorting
                  pagination
                  emptyState={
                    <EmptyState
                      title="Brak pasujących rekordów"
                      description="Zmień wybrany filtr statusu lub wyczyść wyszukiwanie w górnym pasku."
                    />
                  }
                />
              </CardSurface>
            </div>
          ) : null}

          {!loading && tab === "duplicates" && quality ? (
            <div className="space-y-4">
              {filteredDuplicates.length === 0 ? (
                <EmptyState
                  icon={<GitMergeIcon size={20} weight="bold" />}
                  title={
                    normalizedQuery
                      ? "Brak duplikatów pasujących do wyszukiwania"
                      : "Brak duplikatów do scalenia"
                  }
                  description="Wszystkie potencjalnie powielone wpisy zostały sprawdzone i scalone."
                />
              ) : (
                <CardSurface variant="subtle" className="space-y-4 p-5">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      Wykryte duplikaty do scalenia ({filteredDuplicates.length})
                    </h2>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Scalenie przenosi źródła z duplikatu do głównego rekordu i ukrywa powielony wpis w katalogu.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {filteredDuplicates.map((dup) => {
                      const target = recordBySlug[dup.duplicate_of_slug];
                      return (
                        <div
                          key={dup.slug}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-4 text-sm"
                        >
                          <div className="space-y-1">
                            <div>
                              <strong className="text-[var(--color-warn-text)]">
                                {dup.title_pl}
                              </strong>{" "}
                              <span className="text-xs text-[var(--color-warn-text)] opacity-85">
                                ({dup.organization_name})
                              </span>
                            </div>
                            <div className="text-xs text-[var(--color-warn-text)]">
                              Prawdopodobny duplikat rekordu:{" "}
                              <Link
                                href={`/innovations/${dup.duplicate_of_slug}`}
                                className="font-semibold underline"
                              >
                                {target ? target.title_pl : dup.duplicate_of_slug}
                              </Link>
                            </div>
                          </div>
                          <Button
                            size="compact"
                            disabled={busySlug === dup.slug}
                            onClick={() => void handleMergeDuplicate(dup.slug)}
                          >
                            {busySlug === dup.slug ? "Scalanie…" : "Scal z głównym rekordem"}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </CardSurface>
              )}
            </div>
          ) : null}

          {!loading && tab === "feeds" && quality ? (
            <div className="space-y-6">
              <section
                aria-labelledby="scrape-url-heading"
                className="relative overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-xs sm:p-6"
              >
                <BrandBlobSoftBlueIcon
                  size={170}
                  className="pointer-events-none absolute -top-14 -right-12 opacity-45"
                />
                <BrandBlobLimeIcon
                  size={125}
                  className="pointer-events-none absolute right-24 -bottom-14 hidden opacity-35 sm:block"
                />

                <div className="relative z-10 flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] shadow-xs sm:h-16 sm:w-16">
                    <BrandLimeBurstIcon
                      size={22}
                      className="pointer-events-none absolute -top-2.5 -left-2.5 -rotate-45"
                    />
                    <BrandSearchIdeaIcon size={38} className="sm:h-10 sm:w-10" />
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="info" size="compact">
                        Gemini AI + pypdf
                      </Badge>
                      <Badge tone="neutral" variant="outline" size="compact">
                        Kolejka do weryfikacji
                      </Badge>
                    </div>
                    <h2
                      id="scrape-url-heading"
                      className="text-lg font-extrabold tracking-tight text-[var(--color-text)] sm:text-xl"
                    >
                      Zescrapuj pojedynczy URL lub dokument PDF
                    </h2>
                    <p className="max-w-3xl text-sm text-[var(--color-text-muted)]">
                      Wklej adres projektu, repozytorium, kanału RSS/OAI-PMH lub pliku PDF. System
                      pobierze treść, wykluczy duplikaty i przekaże kartę do zakładki „Jakość i
                      weryfikacja”.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleScrapeUrl}
                  className="relative z-10 mt-5 grid grid-cols-1 gap-4 border-t border-[var(--color-border-subtle)] pt-5 md:grid-cols-12"
                >
                  <div className="md:col-span-6">
                    <TextInput
                      id="scrape-url"
                      type="url"
                      required
                      label="Adres URL strony, API lub PDF"
                      placeholder="https://cordis.europa.eu/project/id/... lub https://.../raport.pdf"
                      value={scrapeUrl}
                      onChange={(e) => setScrapeUrl(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <TextInput
                      id="scrape-registry"
                      label="Źródło / rejestr"
                      placeholder="np. CORDIS, BIP, UPRP"
                      value={scrapeRegistry}
                      onChange={(e) => setScrapeRegistry(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Dropdown
                      id="scrape-method"
                      label="Format / adapter"
                      options={SCRAPE_METHOD_OPTIONS}
                      value={scrapeMethod}
                      onValueChange={(val) =>
                        setScrapeMethod(
                          val as "auto" | "HTML" | "PDF" | "API" | "RSS" | "OAI-PMH",
                        )
                      }
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-12">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Zapisywana jest pełna migawka źródła i suma SHA-256 bez obchodzenia barier
                      CAPTCHA.
                    </span>
                    <Button
                      type="submit"
                      variant="filled"
                      loading={scrapingUrl}
                      leadingIcon={<SparkleIcon size={16} />}
                      disabled={!scrapeUrl.trim()}
                    >
                      {scrapingUrl ? "Pobieranie i klasyfikacja…" : "Pobierz i sklasyfikuj"}
                    </Button>
                  </div>
                </form>
              </section>

              <CardSurface className="space-y-5 rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)]">
                      <BrandLayersIcon size={28} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base font-bold text-[var(--color-text)] sm:text-lg">
                          Kanały źródeł publicznych
                        </h2>
                        <Badge tone="neutral" size="compact">
                          {filteredFeeds.length}
                        </Badge>
                      </div>
                      {latestRun ? (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          Ostatnie odświeżenie: {formatDateTime(latestRun.started_at)} ·{" "}
                          {latestRun.summary}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      leadingIcon={showAddFeed ? <CloseIcon size={16} /> : <PlusIcon size={16} />}
                      onClick={() => setShowAddFeed((prev) => !prev)}
                    >
                      {showAddFeed ? "Zamknij" : "Dodaj kanał"}
                    </Button>
                    <Button
                      type="button"
                      variant="filled"
                      loading={ingesting}
                      leadingIcon={<RefreshIcon size={16} />}
                      onClick={() => void handleRunIngestion()}
                    >
                      {ingesting ? "Odświeżanie…" : "Odśwież źródła teraz"}
                    </Button>
                  </div>
                </div>

                {showAddFeed ? (
                  <form
                    onSubmit={handleCreateFeed}
                    className="grid grid-cols-1 gap-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-canvas)] p-4 sm:p-5 md:grid-cols-12"
                  >
                    <div className="md:col-span-4">
                      <TextInput
                        id="feed-name"
                        required
                        label="Nazwa kanału"
                        placeholder="np. Politechnika Rzeszowska — OAI"
                        value={feedName}
                        onChange={(e) => setFeedName(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Dropdown
                        id="feed-category"
                        label="Kategoria"
                        options={FEED_CATEGORY_OPTIONS}
                        value={feedCategory}
                        onValueChange={setFeedCategory}
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Dropdown
                        id="feed-method"
                        label="Metoda pobierania"
                        options={FEED_METHOD_OPTIONS}
                        value={feedMethod}
                        onValueChange={setFeedMethod}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <NumberInput
                        id="feed-max"
                        label="Limit / run"
                        min={1}
                        max={20}
                        value={String(feedMaxRecords)}
                        onChange={(e) => setFeedMaxRecords(Number(e.target.value) || 10)}
                      />
                    </div>
                    <div className="md:col-span-8">
                      <TextInput
                        id="feed-url"
                        type="url"
                        required
                        label="Adres URL kanału"
                        placeholder="https://..."
                        value={feedUrl}
                        onChange={(e) => setFeedUrl(e.target.value)}
                      />
                    </div>
                    <div className="flex items-end md:col-span-4">
                      <Switch
                        label="Automatyczne pobieranie"
                        accent="lime"
                        checked={feedLiveFetch}
                        onChange={(e) => setFeedLiveFetch(e.target.checked)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 md:col-span-12">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowAddFeed(false)}
                      >
                        Anuluj
                      </Button>
                      <Button type="submit" variant="filled" loading={savingFeed}>
                        {savingFeed ? "Zapisywanie…" : "Zapisz kanał"}
                      </Button>
                    </div>
                  </form>
                ) : null}

                {filteredFeeds.length === 0 ? (
                  <EmptyState
                    icon={<DatabaseIcon size={20} weight="bold" />}
                    title="Brak źródeł pasujących do wyszukiwania"
                    description="Wyczyść frazę w wyszukiwarce, aby zobaczyć wszystkie kanały pobierania."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {filteredFeeds.map((f) => {
                      const isLive = f.config?.live_fetch !== false;
                      return (
                        <div
                          key={f.id}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4 text-xs sm:p-5"
                        >
                          <div className="space-y-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="space-y-0.5">
                                <div className="text-sm font-bold text-[var(--color-text)]">
                                  {f.name}
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)]">
                                  {f.category}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {isLive ? (
                                  <Badge tone="info" variant="solid" size="compact">
                                    Automatycznie
                                  </Badge>
                                ) : null}
                                <Badge tone={FEED_STATUS_TONE[f.status]} size="compact">
                                  {FEED_STATUS_LABELS[f.status]}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--color-text-muted)]">
                              <span>
                                Metoda: <strong className="text-[var(--color-text)]">{f.method}</strong>
                              </span>
                              <span>·</span>
                              <span>
                                Rekordy w bazie:{" "}
                                <strong className="font-mono text-[var(--color-text)]">
                                  {f.records_count}
                                </strong>
                              </span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <ClockIcon size={12} />
                                {formatDateTime(f.last_synced_at)}
                              </span>
                            </div>

                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block break-all font-semibold text-[var(--color-accent-text)] underline"
                            >
                              {f.url} ↗
                            </a>

                            {f.error_message ? (
                              <Banner tone="warning" title="Uwaga dla źródła">
                                {f.error_message}
                              </Banner>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                size="compact"
                                variant="outline"
                                leadingIcon={<RefreshIcon size={14} />}
                                disabled={ingesting || busyFeedId === f.id}
                                onClick={() => void handleRunIngestion([f.id])}
                              >
                                Odśwież
                              </Button>
                              <Button
                                type="button"
                                size="compact"
                                variant="outline"
                                disabled={busyFeedId === f.id}
                                onClick={() => void handleToggleFeedLive(f)}
                              >
                                {isLive ? "Wyłącz automat" : "Włącz automat"}
                              </Button>
                            </div>
                            <Button
                              type="button"
                              size="compact"
                              variant="ghost"
                              tone="destructive"
                              leadingIcon={<CloseIcon size={14} />}
                              disabled={busyFeedId === f.id}
                              onClick={() => void handleDeleteFeed(f)}
                            >
                              Usuń
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardSurface>

              {quality.ingestion_runs.length > 0 ? (
                <CardSurface className="space-y-3 rounded-2xl p-5 sm:p-6">
                  <h2 className="text-base font-bold text-[var(--color-text)]">
                    Historia uruchomień synchronizacji
                  </h2>
                  <ul className="divide-y divide-[var(--color-border-subtle)] text-xs">
                    {quality.ingestion_runs.map((run) => (
                      <li
                        key={run.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            tone={run.status === "completed" ? "success" : "warning"}
                            size="compact"
                          >
                            {run.status === "completed" ? "Zakończono" : "Z ostrzeżeniami"}
                          </Badge>
                          <span className="font-semibold text-[var(--color-text)]">
                            {run.summary}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 font-mono text-[var(--color-text-muted)]">
                          <ClockIcon size={12} />
                          {formatDateTime(run.started_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardSurface>
              ) : null}
            </div>
          ) : null}

          {!loading && tab === "activity" ? (
            <section className="space-y-4">
              <CardSurface
                variant="subtle"
                className="flex flex-wrap items-center justify-between gap-3 p-4 text-xs"
              >
                <div className="flex flex-wrap gap-4">
                  <span>
                    Wygenerowane plany:{" "}
                    <strong className="font-mono">{activity.length}</strong>
                  </span>
                  <span>
                    Plany z uwagami lub problemami:{" "}
                    <strong className="font-mono">{activityIssuesCount}</strong>
                  </span>
                </div>

                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={onlyWithIssues}
                    onChange={(e) => setOnlyWithIssues(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>Pokaż tylko ze zgłoszonymi problemami lub notatkami</span>
                </label>
              </CardSurface>

              {displayedActivity.length === 0 ? (
                <EmptyState
                  icon={<BuildingsIcon size={20} weight="bold" />}
                  title={
                    onlyWithIssues || normalizedQuery
                      ? "Brak wdrożeń spełniających kryteria"
                      : "Brak wygenerowanych planów wdrożenia"
                  }
                  description="Zmień filtr uwag albo wyczyść wyszukiwanie w górnym pasku."
                />
              ) : null}

              {displayedActivity.map((row) => (
                <article
                  key={row.plan_id}
                  className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge tone="info" size="compact">
                        {PLAN_VARIANT_LABELS[row.variant]}
                      </Badge>
                      <h2 className="text-lg font-bold text-[var(--color-text)]">
                        {row.user_name} ({row.organization_name}) →{" "}
                        <Link
                          href={`/innovations/${row.innovation_slug}`}
                          className="text-[var(--color-accent-text)] hover:underline"
                        >
                          {row.innovation_title}
                        </Link>
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {row.user_email} ·{" "}
                        {ORG_TYPE_LABELS[row.organization_type as OrgType] ?? row.organization_type}{" "}
                        · {row.deployment_location || "brak lokalizacji"}
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <div className="font-mono font-bold">
                        Etap {row.current_phase}/5 · Ukończono {row.completed_steps_count}/
                        {row.total_steps_count}
                      </div>
                      <div className="mt-1.5 flex justify-end gap-1" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((phase) => {
                          const done = phase <= row.completed_steps_count;
                          const current = phase === row.current_phase && !done;
                          return (
                            <span
                              key={phase}
                              className={`h-2 w-7 rounded-full ${
                                done
                                  ? "bg-[var(--color-success-badge)]"
                                  : current
                                    ? "bg-[var(--color-accent)]"
                                    : "bg-[var(--color-surface-raised)]"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                    <div>
                      <strong>Ukończone kroki:</strong>{" "}
                      {row.completed_titles.join(", ") || "Brak"}
                    </div>
                    <div>
                      <strong>Wykonane porównanie:</strong>{" "}
                      {row.comparison_slugs.length >= 2 ? (
                        <Link
                          href="/compare"
                          onClick={() => setCompareSlugs(row.comparison_slugs)}
                          className="font-semibold text-[var(--color-accent-text)] underline"
                        >
                          {row.comparison_slugs.join(" vs ")} →
                        </Link>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">
                          Brak porównania (wybrano bezpośrednio)
                        </span>
                      )}
                    </div>
                  </div>

                  {row.user_reported_issues || row.step_notes.length > 0 ? (
                    <div className="space-y-1 rounded-lg border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-3 text-xs text-[var(--color-warn-text)]">
                      {row.user_reported_issues ? (
                        <div>
                          <strong>Zgłoszone braki/problemy:</strong> {row.user_reported_issues}
                        </div>
                      ) : null}
                      {row.step_notes.length > 0 ? (
                        <div>
                          <strong>Notatki użytkownika:</strong> {row.step_notes.join(" | ")}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
        </div>
      </AppShellLayout>
    </>
  );
}
