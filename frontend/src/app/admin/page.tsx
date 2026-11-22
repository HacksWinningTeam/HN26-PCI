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
  BuildingsIcon,
  Button,
  CardSurface,
  CheckCircleIcon,
  CloseIcon,
  DatabaseIcon,
  EmptyState,
  ErrorState,
  GitMergeIcon,
  IconButton,
  LoadingState,
  MenuIcon,
  NavBar,
  RefreshIcon,
  ShieldCheckIcon,
  Sidebar,
  SidebarUtilities,
  StatFilterCard,
} from "@/components/ui";
import {
  fetchAdminDataQuality,
  fetchAdminImplementations,
  mergeDuplicateInnovation,
  patchAdminInnovation,
  runAdminIngestion,
  type AdminDataQualityResponse,
  type AdminImplementationOverview,
  type AdminInnovationItem,
} from "@/lib/radar-api";
import {
  ORG_TYPE_LABELS,
  PLAN_VARIANT_LABELS,
  VERIFICATION_LABELS,
  type OrgType,
  type VerificationStatus,
} from "@/lib/radar-labels";

type AdminTab = "quality" | "duplicates" | "feeds" | "activity";
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

  const [tab, setTab] = useState<AdminTab>("quality");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);

  const [quality, setQuality] = useState<AdminDataQualityResponse | null>(null);
  const [activity, setActivity] = useState<AdminImplementationOverview[]>([]);
  const [editing, setEditing] = useState<AdminInnovationItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStatus, setEditStatus] = useState<VerificationStatus>("verified");
  const [editLocation, setEditLocation] = useState("");
  const [editMethod, setEditMethod] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [clearConflicts, setClearConflicts] = useState(false);
  const [clearMissing, setClearMissing] = useState(false);

  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [q, a] = await Promise.all([
        fetchAdminDataQuality(),
        fetchAdminImplementations(),
      ]);
      setQuality(q);
      setActivity(a);
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
    void Promise.all([fetchAdminDataQuality(), fetchAdminImplementations()])
      .then(([q, a]) => {
        if (!active) return;
        setQuality(q);
        setActivity(a);
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

  async function handleRunIngestion() {
    setMessage("");
    setError("");
    setIngesting(true);
    try {
      const run = await runAdminIngestion();
      setMessage(`Odświeżono źródła: ${run.summary}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd odświeżania źródeł.");
    } finally {
      setIngesting(false);
    }
  }

  function startEdit(item: AdminInnovationItem) {
    setEditing(item);
    setEditTitle(item.title_pl);
    setEditStatus(item.verification_status);
    setEditLocation(item.origin_location);
    setEditMethod(item.verification_method);
    setEditSummary(item.short_summary_pl);
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
    try {
      await patchAdminInnovation(editing.slug, {
        title_pl: editTitle,
        short_summary_pl: editSummary,
        verification_status: editStatus,
        verification_method: editMethod,
        origin_location: editLocation,
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

  const sidebarItems = [
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
    {
      id: "workspace",
      label: "Moje wdrożenia",
      href: "/workspace",
      icon: <CheckCircleIcon size={20} />,
      onSelect: () => {
        setMobileMenuOpen(false);
      },
    },
  ];

  const sectionMeta: Record<AdminTab, { title: string; breadcrumb: string }> = {
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
          onChange={(event) => setSearchQuery(event.target.value)}
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
        mobileSearch={searchField(`${searchId}-mobile`)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileMenuOpen) {
            setMobileMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
        sidebar={
          <Sidebar
            label="Nawigacja panelu PCI"
            brand={
              <Link
                href="/workspace"
                aria-label="Praktoteka — Moje wdrożenia"
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
                { label: "Praktoteka", href: "/workspace" },
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
                    onClick={() => setRecordFilter(card.key)}
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
                      Rekordy wymagające decyzji operatora są wyświetlane na górze listy.
                    </p>
                  </div>
                  {recordFilter !== "all" || normalizedQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRecordFilter("all");
                        setSearchQuery("");
                      }}
                      className="min-h-11 cursor-pointer text-xs font-semibold text-[var(--color-accent-text)] underline"
                    >
                      Wyczyść filtry i pokaż wszystkie
                    </button>
                  ) : null}
                </div>

                {filteredRecords.length === 0 ? (
                  <EmptyState
                    title="Brak pasujących rekordów"
                    description="Zmień wybrany filtr statusu lub wyczyść wyszukiwanie w górnym pasku."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-raised)]">
                          <th className="p-2.5 font-bold">Innowacja i pochodzenie</th>
                          <th className="p-2.5 font-bold">Status</th>
                          <th className="p-2.5 font-bold">Wykryte problemy / braki</th>
                          <th className="p-2.5 font-bold">Ostatnia weryfikacja</th>
                          <th className="p-2.5 font-bold">Działania</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-subtle)]">
                        {filteredRecords.map((rec) => (
                          <tr key={rec.slug}>
                            <td className="p-2.5 align-top">
                              <div className="font-semibold text-[var(--color-text)]">
                                {rec.title_pl}
                              </div>
                              <div className="mt-0.5 text-[var(--color-text-muted)]">
                                {rec.organization_name} · {rec.origin_location}
                              </div>
                            </td>
                            <td className="p-2.5 align-top">
                              <Badge
                                tone={STATUS_BADGE_TONE[rec.verification_status]}
                                size="compact"
                              >
                                {VERIFICATION_LABELS[rec.verification_status]}
                              </Badge>
                            </td>
                            <td className="space-y-1 p-2.5 align-top text-[var(--color-text-muted)]">
                              {rec.conflicting_info.map((c, i) => (
                                <div key={`c-${i}`} className="text-[var(--color-error-text)]">
                                  <strong>Sprzeczność:</strong> {c}
                                </div>
                              ))}
                              {rec.missing_info.map((m, i) => (
                                <div key={`m-${i}`}>
                                  <strong>Brak:</strong> {m}
                                </div>
                              ))}
                              {rec.conflicting_info.length === 0 &&
                              rec.missing_info.length === 0
                                ? "Brak uwag"
                                : null}
                            </td>
                            <td className="p-2.5 align-top font-mono">{rec.last_verified_at}</td>
                            <td className="p-2.5 align-top">
                              <div className="flex flex-wrap gap-1.5">
                                {rec.verification_status !== "verified" ? (
                                  <button
                                    type="button"
                                    disabled={busySlug === rec.slug}
                                    onClick={() => void handleQuickVerify(rec)}
                                    className="min-h-9 cursor-pointer rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-2.5 py-1 font-semibold text-[var(--color-success-text)] disabled:opacity-60"
                                  >
                                    Zatwierdź ✓
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => startEdit(rec)}
                                  className="min-h-9 cursor-pointer rounded-md border border-[var(--color-border)] px-2.5 py-1 font-semibold hover:border-[var(--color-accent)]"
                                >
                                  Edytuj
                                </button>
                                <Link
                                  href={`/innovations/${rec.slug}`}
                                  className="inline-flex min-h-9 items-center rounded-md border border-[var(--color-border-subtle)] px-2.5 py-1 font-semibold text-[var(--color-accent-text)] hover:underline"
                                >
                                  Karta ↗
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
              <CardSurface variant="subtle" className="space-y-4 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-[var(--color-text)]">
                      Kanały pobierania danych ze źródeł publicznych ({filteredFeeds.length})
                    </h2>
                    {latestRun ? (
                      <p className="text-xs text-[var(--color-text-muted)]">
                        Ostatnie odświeżenie: {formatDateTime(latestRun.started_at)} ·{" "}
                        {latestRun.summary}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="compact"
                    leadingIcon={<RefreshIcon className={ingesting ? "animate-spin" : undefined} />}
                    disabled={ingesting}
                    onClick={() => void handleRunIngestion()}
                  >
                    {ingesting ? "Odświeżanie…" : "Odśwież źródła teraz"}
                  </Button>
                </div>

                {filteredFeeds.length === 0 ? (
                  <EmptyState
                    icon={<DatabaseIcon size={20} weight="bold" />}
                    title="Brak źródeł pasujących do wyszukiwania"
                    description="Wyczyść frazę w wyszukiwarce, aby zobaczyć wszystkie kanały pobierania."
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {filteredFeeds.map((f) => (
                      <div
                        key={f.id}
                        className="space-y-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4 text-xs"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-[var(--color-text)]">{f.name}</div>
                            <div className="text-[var(--color-text-muted)]">{f.category}</div>
                          </div>
                          <Badge tone={FEED_STATUS_TONE[f.status]} size="compact">
                            {FEED_STATUS_LABELS[f.status]}
                          </Badge>
                        </div>

                        <div className="text-[var(--color-text-muted)]">
                          Metoda: <strong>{f.method}</strong> · Rekordy:{" "}
                          <strong className="font-mono">{f.records_count}</strong> · Synchronizacja:{" "}
                          {formatDateTime(f.last_synced_at)}
                        </div>

                        <div>
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="break-all font-semibold text-[var(--color-accent-text)] underline"
                          >
                            {f.url} ↗
                          </a>
                        </div>

                        {f.error_message ? (
                          <div className="rounded-lg border border-[var(--color-warn-border)] bg-[var(--color-warn-bg)] p-2 font-semibold text-[var(--color-warn-text)]">
                            {f.error_message}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </CardSurface>

              {quality.ingestion_runs.length > 0 ? (
                <CardSurface variant="subtle" className="space-y-3 p-5">
                  <h2 className="text-base font-bold text-[var(--color-text)]">
                    Historia uruchomień synchronizacji
                  </h2>
                  <ul className="divide-y divide-[var(--color-border-subtle)] text-xs">
                    {quality.ingestion_runs.map((run) => (
                      <li
                        key={run.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                      >
                        <span className="font-semibold text-[var(--color-text)]">
                          {run.summary}
                        </span>
                        <span className="font-mono text-[var(--color-text-muted)]">
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
