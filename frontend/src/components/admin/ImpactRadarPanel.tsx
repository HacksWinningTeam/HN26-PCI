"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Badge,
  Banner,
  Button,
  CardSurface,
  ChartBarIcon,
  CheckCircleIcon,
  DataTable,
  EmptyState,
  SparkleIcon,
  TargetIcon,
  TextArea,
  WarningIcon,
  defaultTableState,
  type StatusTone,
  type TableColumn,
  type TableState,
} from "@/components/ui";
import type {
  AdminImpactRadarResponse,
  AdminImpactTransfer,
} from "@/lib/radar-api";
import {
  ADOPTER_DEPLOYMENT_STATUS_LABELS,
  ORG_TYPE_LABELS,
  PCI_TRANSFER_STATUS_LABELS,
  PLAN_VARIANT_LABELS,
  type OrgType,
  type PciTransferStatus,
  type TransferStageKey,
} from "@/lib/radar-labels";

const STAGE_TONE: Record<TransferStageKey, StatusTone> = {
  planning: "neutral",
  validation: "info",
  pilot: "info",
  deployed: "lime",
  effect_verified: "success",
  stopped: "warning",
};

const PCI_STATUS_TONE: Record<PciTransferStatus, StatusTone> = {
  unverified: "warning",
  deployment_confirmed: "info",
  effect_verified: "success",
  needs_clarification: "error",
};

const STAGE_OPTIONS: ReadonlyArray<{ value: TransferStageKey; label: string }> = [
  { value: "planning", label: "Przygotowanie planu" },
  { value: "validation", label: "Walidacja" },
  { value: "pilot", label: "Pilotaż" },
  { value: "deployed", label: "Wdrożenie" },
  { value: "effect_verified", label: "Zweryfikowany efekt" },
  { value: "stopped", label: "Wstrzymano" },
];

function formatPercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pl-PL", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pl-PL", { dateStyle: "medium" });
}

function TransferVerificationForm({
  row,
  onVerify,
}: {
  row: AdminImpactTransfer;
  onVerify: (
    planId: number,
    payload: {
      pci_transfer_status:
        | "deployment_confirmed"
        | "effect_verified"
        | "needs_clarification";
      pci_transfer_note: string;
    },
  ) => Promise<void>;
}) {
  const [note, setNote] = useState(row.pci_transfer_note || "");
  const [busyStatus, setBusyStatus] = useState<
    "deployment_confirmed" | "effect_verified" | "needs_clarification" | null
  >(null);
  const [localError, setLocalError] = useState("");

  async function submitDecision(
    targetStatus:
      | "deployment_confirmed"
      | "effect_verified"
      | "needs_clarification",
  ) {
    setLocalError("");
    const trimmed = note.trim();
    if (targetStatus === "needs_clarification" && !trimmed) {
      setLocalError("Podaj uwagę dla organizacji, co wymaga uzupełnienia.");
      return;
    }
    if (
      targetStatus === "effect_verified" &&
      !row.outcome_summary.trim() &&
      row.reached_beneficiaries_count === null &&
      !trimmed
    ) {
      setLocalError(
        "Weryfikacja efektu wymaga opisu rezultatów / liczby odbiorców albo notatki PCI.",
      );
      return;
    }

    setBusyStatus(targetStatus);
    try {
      await onVerify(row.plan_id, {
        pci_transfer_status: targetStatus,
        pci_transfer_note: trimmed,
      });
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Nie udało się zapisać decyzji PCI.",
      );
    } finally {
      setBusyStatus(null);
    }
  }

  return (
    <div className="space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
      <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-[var(--color-text-muted)]">Postęp checklisty</dt>
          <dd className="mt-0.5 font-mono font-semibold text-[var(--color-text)]">
            Faza {row.current_phase}/5 ({row.completed_steps_count}/{row.total_steps_count})
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Deklaracja organizacji</dt>
          <dd className="mt-0.5 font-semibold text-[var(--color-text)]">
            {ADOPTER_DEPLOYMENT_STATUS_LABELS[row.adopter_deployment_status]}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Start pilotażu / wdrożenia</dt>
          <dd className="mt-0.5 font-mono text-[var(--color-text)]">
            {row.deployment_started_on
              ? formatDateOnly(row.deployment_started_on)
              : formatDateTime(row.pilot_started_at)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-muted)]">Objęci odbiorcy</dt>
          <dd className="mt-0.5 font-mono font-semibold text-[var(--color-text)]">
            {row.reached_beneficiaries_count !== null
              ? row.reached_beneficiaries_count
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="space-y-1 text-xs">
        <div className="text-[var(--color-text-muted)]">Zmierzone efekty</div>
        <p className="m-0 leading-relaxed text-[var(--color-text)]">
          {row.outcome_summary.trim() || "Brak opisu efektów."}
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-xs">
        {row.evidence_url ? (
          <a
            href={row.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold break-all text-[var(--color-accent-text)] underline"
          >
            Link do dowodu ↗
          </a>
        ) : null}
        <Link
          href={`/innovations/${row.innovation_slug}`}
          className="font-semibold text-[var(--color-accent-text)] underline"
        >
          Karta innowacji ↗
        </Link>
      </div>

      {localError ? (
        <Banner tone="error" appearance="tinted" announcement="assertive">
          {localError}
        </Banner>
      ) : null}

      <TextArea
        id={`pci-transfer-note-${row.plan_id}`}
        label="Notatka weryfikacyjna PCI"
        rows={3}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Podstawa weryfikacji lub informacja, co należy uzupełnić…"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          loading={busyStatus === "deployment_confirmed"}
          disabled={busyStatus !== null}
          leadingIcon={<CheckCircleIcon size={16} />}
          onClick={() => void submitDecision("deployment_confirmed")}
        >
          Potwierdź wdrożenie
        </Button>
        <Button
          type="button"
          variant="filled"
          tone="success"
          loading={busyStatus === "effect_verified"}
          disabled={busyStatus !== null}
          leadingIcon={<SparkleIcon size={16} />}
          onClick={() => void submitDecision("effect_verified")}
        >
          Zweryfikuj efekt
        </Button>
        <Button
          type="button"
          variant="outline"
          tone="destructive"
          loading={busyStatus === "needs_clarification"}
          disabled={busyStatus !== null}
          leadingIcon={<WarningIcon size={16} />}
          onClick={() => void submitDecision("needs_clarification")}
        >
          Do uzupełnienia
        </Button>
      </div>
    </div>
  );
}

export function ImpactRadarPanel({
  radar,
  searchQuery,
  onVerifyTransfer,
}: {
  radar: AdminImpactRadarResponse;
  searchQuery: string;
  onVerifyTransfer: (
    planId: number,
    payload: {
      pci_transfer_status:
        | "deployment_confirmed"
        | "effect_verified"
        | "needs_clarification";
      pci_transfer_note: string;
    },
  ) => Promise<void>;
}) {
  const [tableState, setTableState] = useState<TableState>(defaultTableState);
  const { funnel, transfers } = radar;

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("pl-PL");
    if (!q) return transfers;
    return transfers.filter((row) =>
      [
        row.innovation_title,
        row.organization_name,
        row.deployment_location,
        row.stage_label,
        row.outcome_summary,
        row.user_email,
      ]
        .join(" ")
        .toLocaleLowerCase("pl-PL")
        .includes(q),
    );
  }, [searchQuery, transfers]);

  const kpis = [
    {
      label: "Utworzone plany",
      value: funnel.created_plans,
      icon: <TargetIcon size={18} className="text-[var(--color-text-muted)]" />,
    },
    {
      label: "Rozpoczęte pilotaże",
      value: funnel.started_pilots,
      icon: <ChartBarIcon size={18} className="text-[var(--color-text-muted)]" />,
    },
    {
      label: "Potwierdzone wdrożenia",
      value: funnel.confirmed_deployments,
      icon: <CheckCircleIcon size={18} className="text-[var(--color-text-muted)]" />,
    },
    {
      label: "Zweryfikowane efekty",
      value: funnel.verified_effects,
      icon: <SparkleIcon size={18} className="text-[var(--color-text-muted)]" />,
    },
  ];

  const funnelRows = [
    {
      key: "plans",
      label: "Utworzone plany",
      count: funnel.created_plans,
      share: funnel.created_plans > 0 ? 100 : 0,
      barClass: "bg-[var(--color-info-text)]",
    },
    {
      key: "pilots",
      label: "Rozpoczęte pilotaże",
      count: funnel.started_pilots,
      share: formatPercent(funnel.started_pilots, funnel.created_plans),
      barClass: "bg-[var(--color-accent)]",
    },
    {
      key: "deployments",
      label: "Potwierdzone wdrożenia",
      count: funnel.confirmed_deployments,
      share: formatPercent(funnel.confirmed_deployments, funnel.created_plans),
      barClass: "bg-[var(--color-accent-lime)]",
    },
    {
      key: "effects",
      label: "Zweryfikowane efekty",
      count: funnel.verified_effects,
      share: formatPercent(funnel.verified_effects, funnel.created_plans),
      barClass: "bg-[var(--color-success-badge)]",
    },
  ];

  const columns: TableColumn<AdminImpactTransfer>[] = [
    {
      id: "innovation",
      label: "Innowacja",
      minWidth: 220,
      value: (row) => row.innovation_title,
      sortable: true,
      filter: "text",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[var(--color-text)]">
            {row.innovation_title}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {PLAN_VARIANT_LABELS[row.variant]}
          </div>
        </div>
      ),
    },
    {
      id: "organization",
      label: "Organizacja",
      minWidth: 200,
      value: (row) => `${row.organization_name} ${row.deployment_location}`,
      sortable: true,
      filter: "text",
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-[var(--color-text)]">
            {row.organization_name}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {ORG_TYPE_LABELS[row.organization_type as OrgType] ??
              (row.organization_type || "Organizacja")}
            {row.deployment_location ? ` · ${row.deployment_location}` : ""}
          </div>
        </div>
      ),
    },
    {
      id: "stage",
      label: "Etap",
      minWidth: 140,
      value: (row) => row.stage_key,
      sortable: true,
      filter: "category",
      options: STAGE_OPTIONS,
      render: (row) => (
        <Badge tone={STAGE_TONE[row.stage_key]} size="compact">
          {row.stage_label}
        </Badge>
      ),
    },
    {
      id: "report",
      label: "Postęp / Odbiorcy",
      minWidth: 180,
      value: (row) =>
        row.reached_beneficiaries_count !== null
          ? `${row.reached_beneficiaries_count} ${row.outcome_summary}`
          : row.outcome_summary || `Faza ${row.current_phase}/5`,
      render: (row) => (
        <div className="text-xs">
          <span className="font-mono font-semibold text-[var(--color-text)]">
            Faza {row.current_phase}/5
          </span>
          {row.reached_beneficiaries_count !== null ? (
            <span className="text-[var(--color-text-muted)]">
              {" "}
              · {row.reached_beneficiaries_count} odbiorców
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "pciStatus",
      label: "Status PCI",
      minWidth: 170,
      value: (row) => row.pci_transfer_status,
      sortable: true,
      filter: "category",
      options: Object.entries(PCI_TRANSFER_STATUS_LABELS).map(
        ([value, label]) => ({ value, label }),
      ),
      render: (row) => (
        <Badge tone={PCI_STATUS_TONE[row.pci_transfer_status]} size="compact">
          {PCI_TRANSFER_STATUS_LABELS[row.pci_transfer_status]}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 4 KPI Summary Cards */}
      <section aria-label="Wskaźniki transferu innowacji">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <CardSurface key={kpi.label} className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--color-text-muted)] sm:text-sm">
                  {kpi.label}
                </span>
                {kpi.icon}
              </div>
              <div className="mt-3 font-mono text-2xl font-extrabold tracking-tight tabular-nums text-[var(--color-text)] sm:text-3xl">
                {kpi.value}
              </div>
            </CardSurface>
          ))}
        </div>
      </section>

      {/* Innovation Transfer Funnel */}
      <CardSurface className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-[var(--color-text)]">
            Lejek transferu innowacji
          </h2>
          {funnel.total_reached_beneficiaries > 0 ? (
            <span className="font-mono text-xs text-[var(--color-text-muted)]">
              Potwierdzeni odbiorcy: {funnel.total_reached_beneficiaries}
            </span>
          ) : null}
        </div>

        <ol className="space-y-3.5">
          {funnelRows.map((step) => {
            const widthPct =
              step.count > 0 && funnel.created_plans > 0
                ? Math.max(3, Math.round((step.count / funnel.created_plans) * 100))
                : 0;
            return (
              <li key={step.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-[var(--color-text)]">
                    {step.label}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[var(--color-text)]">
                    {step.count}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label={step.label}
                  aria-valuemin={0}
                  aria-valuemax={Math.max(1, funnel.created_plans)}
                  aria-valuenow={step.count}
                  aria-valuetext={`${step.count} (${step.share}%)`}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-raised)]"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${step.barClass}`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      </CardSurface>

      {/* Active Transfers Table */}
      <CardSurface className="space-y-4 p-5 sm:p-6">
        <h2 className="text-base font-bold text-[var(--color-text)]">
          Aktywne transfery
        </h2>

        <DataTable
          name="Aktywne transfery innowacji"
          rows={filteredTransfers}
          columns={columns}
          getRowId={(row) => String(row.plan_id)}
          state={tableState}
          onStateChange={setTableState}
          search
          filters
          sorting
          pagination
          headerColumn
          emptyState={
            <EmptyState
              icon={<TargetIcon size={20} weight="bold" />}
              title="Brak aktywnych transferów"
              description="Rekordy pojawią się po utworzeniu planów wdrożeniowych przez organizacje."
            />
          }
          rowDetails={{
            title: (row) => `${row.innovation_title} — ${row.organization_name}`,
            description: (row) =>
              `${row.user_email} · aktualizacja ${formatDateTime(row.updated_at)}`,
            render: (row) => (
              <TransferVerificationForm
                key={row.plan_id}
                row={row}
                onVerify={onVerifyTransfer}
              />
            ),
          }}
        />
      </CardSurface>
    </div>
  );
}
