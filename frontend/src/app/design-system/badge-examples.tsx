export default function BadgeExamples() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-success-text)]">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-[var(--color-success-badge)]"
        />
        PASS · Verified evidence
      </span>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-error-border)] bg-[var(--color-error-bg)] px-3 py-1 text-xs font-semibold text-[var(--color-error-text)]">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-[var(--color-error-badge)]"
        />
        FAIL · Missing evidence
      </span>

      <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--color-text)]">
        Synthetic demo
      </span>

      <span className="inline-flex items-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-muted)]">
        Planned
      </span>
    </div>
  );
}
