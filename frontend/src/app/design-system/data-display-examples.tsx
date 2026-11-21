"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Card,
  DefinitionList,
  MetricCard,
  PhaseStepper,
  ProgressBar,
  ScoreBreakdown,
  SimpleTable,
  StatFilterCard,
  StatusIndicator,
  type TableColumn,
} from "@/components/ui";

type SampleInnovationRow = {
  slug: string;
  title: string;
  area: string;
  location: string;
  trl: number | null;
  status: "verified" | "pending_review" | "stale";
};

const SAMPLE_ROWS: readonly SampleInnovationRow[] = [
  {
    slug: "asystent-seniora",
    title: "Asystent e-Usług dla Seniorów",
    area: "Administracyjny",
    location: "Gdynia, Pomorskie",
    trl: 7,
    status: "verified",
  },
  {
    slug: "czujnik-powietrza",
    title: "Szkolny System Jakości Powietrza",
    area: "Technologiczny",
    location: "Kraków, Małopolskie",
    trl: 8,
    status: "verified",
  },
  {
    slug: "punkt-pomocy",
    title: "Mobilny Punkt Wsparcia Mieszkańców",
    area: "Edukacyjny",
    location: "Rzeszów, Podkarpackie",
    trl: null,
    status: "pending_review",
  },
];

const COLUMNS: readonly TableColumn<SampleInnovationRow>[] = [
  { id: "title", label: "Innowacja", value: (r) => r.title },
  { id: "area", label: "Główny obszar", value: (r) => r.area },
  { id: "location", label: "Pochodzenie", value: (r) => r.location },
  {
    id: "trl",
    label: "TRL",
    align: "right",
    value: (r) => (r.trl !== null ? `TRL ${r.trl}/9` : "Nie dotyczy"),
  },
  {
    id: "status",
    label: "Status",
    render: (r) =>
      r.status === "verified" ? (
        <StatusIndicator tone="success">Zweryfikowana</StatusIndicator>
      ) : (
        <StatusIndicator tone="info">Do przeglądu</StatusIndicator>
      ),
  },
];

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
  const [showEmpty, setShowEmpty] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[var(--color-text-muted)]">
          Responsywna tabela z przypiętym nagłówkiem, wyrównaniem kolumn numerycznych i obsługą pustego stanu.
        </p>
        <Button
          size="compact"
          variant="outline"
          onClick={() => setShowEmpty((v) => !v)}
        >
          {showEmpty ? "Pokaż rekordy" : "Symuluj brak wyników"}
        </Button>
      </div>

      <SimpleTable
        name="Przykładowy katalog innowacji"
        rows={showEmpty ? [] : SAMPLE_ROWS}
        columns={COLUMNS}
        getRowId={(r) => r.slug}
        headerColumn
        emptyState={
          <div className="space-y-2 py-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              Brak innowacji spełniających kryteria
            </p>
            <Button size="compact" variant="outline" onClick={() => setShowEmpty(false)}>
              Przywróć przykładowe rekordy
            </Button>
          </div>
        }
      />
    </div>
  );
}

export function CardExamples() {
  const [metricState, setMetricState] = useState<"ready" | "loading" | "error">("ready");
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
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Card (outline / highlighted / highlighted-lime) i MetricCard (ready / loading / error)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="Asystent e-Usług dla Seniorów"
            variant="highlighted-lime"
            badge={<Badge tone="lime">Rekomendacja Brand Lime</Badge>}
            footer="Źródło: Baza Innowacji Społecznych · Weryfikacja: 2026-10-14"
            actions={<Button size="compact" tone="lime">Otwórz szczegóły</Button>}
            secondaryActions={
              <Button size="compact" tone="lime" variant="outline">
                Dodaj do porównania
              </Button>
            }
          >
            <p className="text-sm text-[var(--color-text-muted)]">
              Wariant highlighted-lime z akcentem Brand Lime oraz dopasowanymi przyciskami i odznaką.
            </p>
          </Card>

          <MetricCard
            title="Dopasowanie do profilu gminy"
            value={86}
            unit="%"
            prominent
            variant="highlighted"
            state={metricState}
            description="Wyliczenie na podstawie opisu problemu i kontekstu organizacji."
            breakdownSummary="Rozbicie 40 / 20 / 20 / 20"
            breakdownItems={[
              { label: "Problem (40%)", value: "92%" },
              { label: "Branża (20%)", value: "100%" },
              { label: "Beneficjenci (20%)", value: "85%" },
              { label: "Typ organizacji (20%)", value: "65%" },
            ]}
            onRetry={() => setMetricState("ready")}
            actions={
              <div className="flex flex-wrap gap-1.5">
                {(["ready", "loading", "error"] as const).map((s) => (
                  <Button
                    key={s}
                    size="compact"
                    variant={metricState === s ? "filled" : "outline"}
                    onClick={() => setMetricState(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            }
          />
        </div>
      </div>
    </div>
  );
}
