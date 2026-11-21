"use client";

import { useMemo, useState } from "react";
import {
  AlertDialog,
  Badge,
  Button,
  Card,
  DataTable,
  DefinitionList,
  Dropdown,
  EyeIcon,
  MetricCard,
  PhaseStepper,
  PlusIcon,
  ProgressBar,
  ScoreBreakdown,
  SegmentedControl,
  SimpleTable,
  StatFilterCard,
  StatusIndicator,
  Switch,
  defaultTableState,
  tableModel,
  type SimpleTableColumn,
  type TableColumn,
  type TableSelectionAction,
  type TableState,
} from "@/components/ui";

type SampleInnovationRow = {
  slug: string;
  title: string;
  area: "Technologiczny" | "Edukacyjny" | "Administracyjny";
  location: string;
  trl: number | null;
  matchScore: number;
  verified: boolean;
  status: "verified" | "pending_review" | "stale";
};

const SAMPLE_INNOVATIONS: readonly SampleInnovationRow[] = [
  { slug: "asystent-seniora", title: "Asystent e-Usług dla Seniorów", area: "Administracyjny", location: "Gdynia, Pomorskie", trl: 7, matchScore: 91, verified: true, status: "verified" },
  { slug: "czujnik-powietrza", title: "Szkolny System Jakości Powietrza", area: "Technologiczny", location: "Kraków, Małopolskie", trl: 8, matchScore: 86, verified: true, status: "verified" },
  { slug: "punkt-pomocy", title: "Mobilny Punkt Wsparcia Mieszkańców", area: "Edukacyjny", location: "Rzeszów, Podkarpackie", trl: null, matchScore: 78, verified: false, status: "pending_review" },
  { slug: "czytelny-urzad", title: "Generator Pism Prostym Językiem", area: "Administracyjny", location: "Poznań, Wielkopolskie", trl: 9, matchScore: 84, verified: true, status: "verified" },
  { slug: "teleopieka-gminna", title: "Gminna Sieć Teleopieki Domowej", area: "Technologiczny", location: "Lublin, Lubelskie", trl: 8, matchScore: 82, verified: false, status: "pending_review" },
  { slug: "mentoring-cyfrowy", title: "Międzypokoleniowy Mentoring Cyfrowy", area: "Edukacyjny", location: "Wrocław, Dolnośląskie", trl: 6, matchScore: 76, verified: true, status: "verified" },
  { slug: "audyt-dostepnosci", title: "Szybki Audyt Dostępności Placówek", area: "Administracyjny", location: "Łódź, Łódzkie", trl: 7, matchScore: 74, verified: false, status: "stale" },
  { slug: "czujnik-suszy", title: "Mikrosieci Monitoringu Retencji", area: "Technologiczny", location: "Bydgoszcz, Kujawsko-Pomorskie", trl: 5, matchScore: 71, verified: false, status: "pending_review" },
  { slug: "karta-mlodziezy", title: "Cyfrowa Karta Aktywności Młodzieży", area: "Edukacyjny", location: "Białystok, Podlaskie", trl: 8, matchScore: 69, verified: true, status: "verified" },
  { slug: "eko-flota-gminy", title: "Optymalizator Tras Usług Komunalnych", area: "Technologiczny", location: "Katowice, Śląskie", trl: 7, matchScore: 67, verified: true, status: "verified" },
  { slug: "budzet-uczniowski", title: "Platforma Szkolnego Budżetu Obywatelskiego", area: "Edukacyjny", location: "Szczecin, Zachodniopomorskie", trl: 9, matchScore: 65, verified: true, status: "verified" },
  { slug: "okienko-ngo", title: "Jedno Okienko Grantowe dla NGO", area: "Administracyjny", location: "Olsztyn, Warmińsko-Mazurskie", trl: 6, matchScore: 63, verified: false, status: "pending_review" },
];

const SIMPLE_COLUMNS: readonly SimpleTableColumn<SampleInnovationRow>[] = [
  { id: "title", label: "Innowacja", value: (r) => r.title, minWidth: 240 },
  { id: "area", label: "Główny obszar", value: (r) => r.area, minWidth: 160 },
  { id: "location", label: "Pochodzenie", value: (r) => r.location, minWidth: 200 },
  {
    id: "trl",
    label: "TRL",
    align: "right",
    minWidth: 110,
    value: (r) => (r.trl !== null ? `TRL ${r.trl}/9` : "Nie dotyczy"),
  },
  {
    id: "match",
    label: "Dopasowanie",
    align: "right",
    minWidth: 120,
    value: (r) => `${r.matchScore}%`,
  },
];

const FULL_TABLE_FEATURES = {
  headerRow: true,
  pinnedHeader: true,
  headerColumn: true,
  headerSortButtons: true,
  sorting: true,
  filters: true,
  search: true,
  toolbar: true,
  pagination: true,
  pinnedColumn: true,
  selectable: true,
  rowDetails: true,
  bounded: true,
};

const TABLE_PRESETS = {
  minimal: {
    ...FULL_TABLE_FEATURES,
    headerColumn: false,
    headerSortButtons: false,
    sorting: false,
    filters: false,
    search: false,
    toolbar: false,
    pagination: false,
    pinnedColumn: false,
    selectable: false,
    rowDetails: false,
  },
  standard: {
    ...FULL_TABLE_FEATURES,
    selectable: false,
    filters: false,
    headerSortButtons: false,
  },
  full: FULL_TABLE_FEATURES,
} as const;

const FEATURE_LABELS: Record<keyof typeof FULL_TABLE_FEATURES, string> = {
  toolbar: "Toolbar",
  search: "Wyszukiwanie",
  filters: "Filtry kolumn",
  sorting: "Sortowanie",
  headerSortButtons: "Przyciski sortowania w nagłówku",
  pagination: "Paginacja",
  selectable: "Zaznaczanie wierszy",
  rowDetails: "Drawer szczegółów rekordu",
  pinnedColumn: "Przypięta pierwsza kolumna",
  headerRow: "Nagłówek tabeli",
  pinnedHeader: "Przypięty nagłówek",
  headerColumn: "Pierwsza kolumna jako row-header",
  bounded: "Limit wysokości (380px)",
};

export function ListExamples() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Lista klucz–wartość (inline i stacked)
          </h3>
          <DefinitionList
            items={[
              { id: "org", label: "Autor / Organizacja", value: "Fundacja Cyfrowa Gdynia" },
              { id: "loc", label: "Lokalizacja pochodzenia", value: "Gdynia, Pomorskie" },
              {
                id: "method",
                label: "Sposób weryfikacji",
                value: "Rejestr PARP + dokumentacja wdrożenia",
                layout: "stacked",
                description: "Ostatnia aktualizacja: 2026-10-14",
              },
            ]}
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Siatka metadanych (columns=2 wewnątrz karty)
          </h3>
          <Card title="Parametry wdrożeniowe" density="compact" variant="surface">
            <DefinitionList
              columns={2}
              items={[
                { id: "sector", label: "Branża", value: "Administracja publiczna" },
                { id: "level", label: "Poziom wdrożenia", value: "Pilotaż · TRL 7/9" },
                { id: "ben", label: "Beneficjenci", value: "Seniorzy 60+" },
                { id: "sources", label: "Liczba źródeł", value: "3 rejestry publiczne" },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}

export function ScoringBreakdownExamples() {
  return (
    <div className="space-y-6">
      <ScoreBreakdown
        overallScore={86}
        primaryReason="Wysoka zgodność problemu (obsługa cyfrowa seniorów w gminie) oraz potwierdzony pilotaż w samorządzie."
        criteria={[
          { label: "Problem", weightPercent: 40, score: 92, sourceKind: "evidence" },
          { label: "Branża", weightPercent: 20, score: 100, sourceKind: "evidence" },
          { label: "Beneficjenci", weightPercent: 20, score: 85, sourceKind: "evidence" },
          { label: "Typ organizacji", weightPercent: 20, score: 65, sourceKind: "declaration" },
        ]}
      />

      <div className="grid gap-6 sm:grid-cols-2">
        <Card title="Postęp realizacji planu (Brand Lime / domyślny)" density="compact">
          <div className="space-y-4">
            <ProgressBar label="Ukończone kroki (Brand Lime)" value={3} max={5} accent="lime" />
            <ProgressBar label="Postęp analizy (Brand Cyan)" value={4} max={5} accent="cyan" />
          </div>
        </Card>
        <Card title="Wskaźnik etapów (PhaseStepper)" density="compact">
          <PhaseStepper totalPhases={5} completedCount={2} currentPhase={3} />
        </Card>
      </div>
    </div>
  );
}

export function TableExamples() {
  const [features, setFeatures] = useState(FULL_TABLE_FEATURES);
  const [accent, setAccent] = useState<"cyan" | "lime">("cyan");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [onlyPendingSelection, setOnlyPendingSelection] = useState(false);
  const [bulkReviewRows, setBulkReviewRows] = useState<readonly SampleInnovationRow[] | null>(null);

  const [striping, setStriping] = useState<"none" | "rows" | "columns" | "both">("rows");
  const [simpleHeaderRow, setSimpleHeaderRow] = useState(true);
  const [simplePinnedHeader, setSimplePinnedHeader] = useState(true);
  const [simpleHeaderColumn, setSimpleHeaderColumn] = useState(false);
  const [simpleEmpty, setSimpleEmpty] = useState(false);

  const activePreset =
    Object.entries(TABLE_PRESETS).find(([, value]) =>
      Object.keys(FULL_TABLE_FEATURES).every(
        (key) =>
          features[key as keyof typeof FULL_TABLE_FEATURES] ===
          value[key as keyof typeof FULL_TABLE_FEATURES],
      ),
    )?.[0] ?? "";

  const dataColumns = useMemo<TableColumn<SampleInnovationRow>[]>(
    () => [
      {
        id: "title",
        label: "Innowacja",
        value: (r) => r.title,
        searchable: true,
        sortable: true,
        filter: "text",
        minWidth: 220,
      },
      {
        id: "area",
        label: "Główny obszar",
        value: (r) => r.area,
        searchable: true,
        sortable: true,
        filter: "category",
        options: [
          { value: "Technologiczny", label: "Technologiczny" },
          { value: "Edukacyjny", label: "Edukacyjny" },
          { value: "Administracyjny", label: "Administracyjny" },
        ],
      },
      {
        id: "location",
        label: "Pochodzenie",
        value: (r) => r.location,
        searchable: true,
        sortable: true,
      },
      {
        id: "trl",
        label: "TRL",
        align: "right",
        value: (r) => r.trl,
        render: (r) => (r.trl !== null ? `TRL ${r.trl}/9` : "Nie dotyczy"),
        sortable: true,
        filter: "number",
      },
      {
        id: "matchScore",
        label: "Dopasowanie",
        align: "right",
        value: (r) => r.matchScore,
        render: (r) => `${r.matchScore}%`,
        sortable: true,
        filter: "number",
      },
      {
        id: "verified",
        label: "Zweryfikowano",
        type: "checkbox",
        value: (r) => r.verified,
        width: 120,
      },
      {
        id: "status",
        label: "Status",
        value: (r) => r.status,
        render: (r) =>
          r.status === "verified" ? (
            <StatusIndicator tone="success">Zweryfikowana</StatusIndicator>
          ) : r.status === "stale" ? (
            <StatusIndicator tone="warning">Nieaktualna</StatusIndicator>
          ) : (
            <StatusIndicator tone="info">Do przeglądu</StatusIndicator>
          ),
      },
    ],
    [],
  );

  const selectionActions: TableSelectionAction<SampleInnovationRow>[] = [
    {
      id: "review",
      label: "Przejrzyj zaznaczone",
      icon: <EyeIcon size={16} />,
      onSelect: (rows) => setBulkReviewRows(rows),
    },
  ];

  return (
    <div className="space-y-10">
      {/* Configurable DataTable */}
      <section className="space-y-4" aria-label="Konfigurowalna tabela danych">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            DataTable (wyszukiwanie, filtry, sortowanie, paginacja, zaznaczanie i drawer szczegółów)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Kompaktowy zestaw funkcji dopasowany do Radaru Innowacji i panelu PCI: bez zaznaczania komórek, zmiany kolejności kolumn ani zapisu widoków w przeglądarce.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl
            label="Preset tabeli"
            value={activePreset}
            onValueChange={(value) => {
              const next = TABLE_PRESETS[value as keyof typeof TABLE_PRESETS];
              setFeatures(next);
              if (!next.selectable) setSelectedIds([]);
            }}
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "standard", label: "Standard" },
              { value: "full", label: "Full (PCI)" },
            ]}
          />
          <SegmentedControl
            label="Akcent tabeli"
            value={accent}
            accent={accent}
            onValueChange={(value) => setAccent(value as "cyan" | "lime")}
            options={[
              { value: "cyan", label: "Brand Cyan" },
              { value: "lime", label: "Brand Lime" },
            ]}
          />
        </div>

        <details className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text)]">
            Opcje funkcji tabeli
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FEATURE_LABELS).map(([key, label]) => {
              const feature = key as keyof typeof FULL_TABLE_FEATURES;
              const disabled =
                (feature === "pinnedHeader" && !features.headerRow) ||
                (feature === "headerSortButtons" &&
                  (!features.sorting || !features.headerRow));
              return (
                <Switch
                  key={feature}
                  label={label}
                  accent={accent}
                  checked={features[feature]}
                  disabled={disabled}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setFeatures((current) => ({ ...current, [feature]: checked }));
                    if (feature === "selectable" && !checked) setSelectedIds([]);
                  }}
                />
              );
            })}
            <Switch
              label="Zaznaczaj tylko do przeglądu"
              accent={accent}
              checked={onlyPendingSelection}
              disabled={!features.selectable}
              onChange={(event) => {
                const checked = event.target.checked;
                setOnlyPendingSelection(checked);
                if (checked) {
                  setSelectedIds((ids) =>
                    ids.filter((slug) =>
                      SAMPLE_INNOVATIONS.some(
                        (row) => row.slug === slug && !row.verified,
                      ),
                    ),
                  );
                }
              }}
            />
          </div>
        </details>

        {features.selectable ? (
          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span role="status" className="font-semibold text-[var(--color-text)]">
              Zaznaczono: {selectedIds.length}
            </span>
            <Button
              size="compact"
              variant="outline"
              disabled={selectedIds.length === 0}
              onClick={() => setSelectedIds([])}
            >
              Wyczyść zaznaczenie z zewnątrz
            </Button>
          </div>
        ) : null}

        <DataTable
          name="Katalog innowacji (DataTable)"
          rows={SAMPLE_INNOVATIONS}
          columns={dataColumns}
          getRowId={(r) => r.slug}
          accent={accent}
          toolbar={features.toolbar}
          search={features.search}
          filters={features.filters}
          sorting={features.sorting}
          headerSortButtons={features.headerSortButtons}
          pagination={features.pagination}
          headerRow={features.headerRow}
          pinnedHeader={features.pinnedHeader}
          headerColumn={features.headerColumn}
          pinnedColumn={features.pinnedColumn ? "title" : undefined}
          height={features.bounded ? 380 : undefined}
          selectable={features.selectable}
          selectedRowIds={selectedIds}
          onSelectionChange={setSelectedIds}
          canSelectRow={
            onlyPendingSelection ? (row) => !row.verified : undefined
          }
          selectionActions={selectionActions}
          rowDetails={
            features.rowDetails
              ? {
                  title: (row) => row.title,
                  description: (row) =>
                    `Przykładowy rekord katalogu (${row.location}). Przeglądaj kolejne rekordy strzałkami w nagłówku.`,
                }
              : undefined
          }
          initialState={{ pageSize: 10 }}
        />
      </section>

      {/* Toolbar actions & empty / no-results states */}
      <TableEmptyStatesDemo accent={accent} />

      {/* SimpleTable */}
      <section className="space-y-4" aria-label="Prosta tabela">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            SimpleTable (lekka tabela prezentacyjna)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Bez paska narzędzi, paginacji, zaznaczania ani zapytań — idealna do zwięzłych zestawień i podsumowań.
          </p>
        </div>

        <details className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--color-text)]">
            Opcje SimpleTable
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Dropdown
              label="Naprzemienne tło (striping)"
              size="compact"
              value={striping}
              onValueChange={(value) =>
                setStriping(value as "none" | "rows" | "columns" | "both")
              }
              options={[
                { value: "none", label: "Brak" },
                { value: "rows", label: "Wiersze" },
                { value: "columns", label: "Kolumny" },
                { value: "both", label: "Wiersze i kolumny" },
              ]}
            />
            <Switch
              label="Nagłówek tabeli"
              accent={accent}
              checked={simpleHeaderRow}
              onChange={(event) => setSimpleHeaderRow(event.target.checked)}
            />
            <Switch
              label="Przypięty nagłówek"
              accent={accent}
              checked={simplePinnedHeader}
              disabled={!simpleHeaderRow}
              onChange={(event) => setSimplePinnedHeader(event.target.checked)}
            />
            <Switch
              label="Pierwsza kolumna jako row-header"
              accent={accent}
              checked={simpleHeaderColumn}
              onChange={(event) => setSimpleHeaderColumn(event.target.checked)}
            />
            <Switch
              label="Symuluj brak rekordów"
              accent={accent}
              checked={simpleEmpty}
              onChange={(event) => setSimpleEmpty(event.target.checked)}
            />
          </div>
        </details>

        <SimpleTable
          name="Przykładowy skrót innowacji"
          rows={simpleEmpty ? [] : SAMPLE_INNOVATIONS.slice(0, 6)}
          columns={SIMPLE_COLUMNS}
          getRowId={(r) => r.slug}
          accent={accent}
          striping={striping}
          headerRow={simpleHeaderRow}
          pinnedHeader={simplePinnedHeader}
          headerColumn={simpleHeaderColumn}
          height={290}
          emptyState={
            <div className="space-y-2 py-2">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                Brak innowacji do wyświetlenia
              </p>
              <Button
                size="compact"
                variant="outline"
                onClick={() => setSimpleEmpty(false)}
              >
                Przywróć przykładowe rekordy
              </Button>
            </div>
          }
        />
      </section>

      <AlertDialog
        open={bulkReviewRows !== null}
        onClose={() => setBulkReviewRows(null)}
        title="Podgląd zaznaczonych rekordów"
        description="Przykładowa akcja zbiorcza z pływającego paska zaznaczenia."
        details={(bulkReviewRows ?? []).map((row) => ({
          label: row.slug,
          value: row.title,
        }))}
      />
    </div>
  );
}

function TableEmptyStatesDemo({ accent }: { accent: "cyan" | "lime" }) {
  const [rows, setRows] = useState<readonly SampleInnovationRow[]>(
    SAMPLE_INNOVATIONS.slice(0, 3),
  );
  const [state, setState] = useState<TableState>(defaultTableState);
  const [withControls, setWithControls] = useState(true);

  const columns = useMemo<TableColumn<SampleInnovationRow>[]>(
    () => [
      { id: "title", label: "Innowacja", value: (r) => r.title, searchable: true, minWidth: 220 },
      { id: "location", label: "Pochodzenie", value: (r) => r.location, searchable: true },
      { id: "matchScore", label: "Dopasowanie", align: "right", value: (r) => r.matchScore, render: (r) => `${r.matchScore}%` },
    ],
    [],
  );

  const preview = !rows.length
    ? "empty"
    : tableModel(rows, columns, state, "pl-PL").matched.length
      ? "records"
      : "no-results";

  function addDemoRow() {
    setRows((current) => [
      ...current,
      {
        slug: `demo-${current.length + 1}`,
        title: `Nowa innowacja demo #${current.length + 1}`,
        area: "Administracyjny",
        location: "Warszawa, Mazowieckie",
        trl: 7,
        matchScore: 80,
        verified: false,
        status: "pending_review",
      },
    ]);
    setState((current) => ({ ...current, search: "", filters: {}, page: 0 }));
  }

  const addButton = (
    <Button size="compact" leadingIcon={<PlusIcon size={16} />} onClick={addDemoRow}>
      Dodaj rekord demo
    </Button>
  );

  return (
    <section className="space-y-4" aria-label="Akcje paska i puste stany">
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Akcje paska narzędzi i stany puste / brak wyników
        </h3>
        <p className="text-xs text-[var(--color-text-muted)]">
          Niezależne komunikaty dla pustego źródła danych (`emptyState`) oraz braku dopasowań po filtrach (`noResultsState`).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Dropdown
          label="Podgląd stanu danych"
          size="compact"
          value={preview}
          onValueChange={(value) => {
            setRows(value === "empty" ? [] : SAMPLE_INNOVATIONS.slice(0, 3));
            setState({
              ...defaultTableState,
              search: value === "no-results" ? "Nieistniejąca fraza" : "",
            });
          }}
          options={[
            { value: "records", label: "Rekordy" },
            { value: "empty", label: "Brak rekordów (emptyState)" },
            { value: "no-results", label: "Brak dopasowań (noResultsState)" },
          ]}
        />
        <Switch
          label="Wbudowane kontrolki paska"
          accent={accent}
          checked={withControls}
          onChange={(event) => setWithControls(event.target.checked)}
        />
      </div>

      <DataTable
        name="Kolejka weryfikacji (demo stanów)"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.slug}
        accent={accent}
        state={state}
        onStateChange={setState}
        pagination={false}
        sorting={false}
        filters={false}
        toolbar={withControls}
        toolbarActions={addButton}
        height={250}
        emptyState={
          <div className="space-y-2 py-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Kolejka jest pusta
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Dodaj przykładowy rekord, aby zobaczyć układ wierszy.
            </p>
            {addButton}
          </div>
        }
        noResultsState={({ clearFilters }) => (
          <div className="space-y-2 py-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Brak innowacji pasujących do wyszukiwania
            </p>
            <Button variant="outline" size="compact" onClick={clearFilters}>
              Wyczyść filtry
            </Button>
          </div>
        )}
      />
    </section>
  );
}

export function CardExamples() {
  const [metricState, setMetricState] = useState<"ready" | "loading" | "error">("ready");
  const [cardVariant, setCardVariant] = useState<"subtle" | "highlighted-lime" | "highlighted">("subtle");
  const [activeFilter, setActiveFilter] = useState("all");

  return (
    <div className="space-y-8">
      {/* Stat filter cards (Admin PCI pattern) */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          StatFilterCard (klikalne kafelki filtrów z licznikiem)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { key: "all", label: "Wszystkie rekordy", hint: "Pełna baza", count: 24 },
            { key: "pending", label: "Do weryfikacji", hint: "Wymaga decyzji", count: 5 },
            { key: "issues", label: "Braki i sprzeczności", hint: "Do uzupełnienia", count: 3 },
            { key: "duplicates", label: "Duplikaty", hint: "Do scalenia", count: 2 },
          ].map((item) => (
            <StatFilterCard
              key={item.key}
              count={item.count}
              label={item.label}
              hint={item.hint}
              accent={item.key === "pending" ? "lime" : "cyan"}
              active={activeFilter === item.key}
              onClick={() => setActiveFilter(item.key)}
            />
          ))}
        </div>
      </div>

      {/* Card variants */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Card i MetricCard
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Spójne subtelne ramki i miękkie warianty wyróżnień jak w StatFilterCard i Bannerach.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SegmentedControl
              label="Wariant karty"
              value={cardVariant}
              onValueChange={(val) =>
                setCardVariant(val as "subtle" | "highlighted-lime" | "highlighted")
              }
              options={[
                { value: "subtle", label: "Domyślna" },
                { value: "highlighted-lime", label: "Lime" },
                { value: "highlighted", label: "Cyan" },
              ]}
            />
            <SegmentedControl
              label="Stan MetricCard"
              value={metricState}
              onValueChange={(val) =>
                setMetricState(val as "ready" | "loading" | "error")
              }
              options={[
                { value: "ready", label: "Ready" },
                { value: "loading", label: "Loading" },
                { value: "error", label: "Error" },
              ]}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="Asystent e-Usług dla Seniorów"
            variant={cardVariant}
            badge={<Badge tone="lime" size="compact">Brand Lime</Badge>}
            footer="Źródło: Baza Innowacji Społecznych · Weryfikacja: 2026-10-14"
            actions={<Button size="compact" tone="lime">Otwórz szczegóły</Button>}
            secondaryActions={
              <Button size="compact" variant="outline">
                Dodaj do porównania
              </Button>
            }
          >
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Cyfrowy punkt wsparcia dla osób 60+ ułatwiający załatwianie spraw urzędowych w gminie.
            </p>
          </Card>

          <MetricCard
            title="Dopasowanie do profilu gminy"
            value={86}
            unit="%"
            prominent
            variant={cardVariant}
            badge={<Badge tone="info" size="compact">TRL 7/9</Badge>}
            state={metricState}
            description="Wyliczenie na podstawie opisu problemu i kontekstu organizacji."
            breakdownSummary="Rozbicie 40 / 20 / 20 / 20"
            breakdownItems={[
              { label: "Problem (40%)", value: "92%" },
              { label: "Branża (20%)", value: "100%" },
              { label: "Beneficjenci (20%)", value: "85%" },
              { label: "Typ organizacji (20%)", value: "65%" },
            ]}
            footer="Ostatnia aktualizacja wyliczenia: dzisiaj"
            onRetry={() => setMetricState("ready")}
          />
        </div>
      </div>
    </div>
  );
}
