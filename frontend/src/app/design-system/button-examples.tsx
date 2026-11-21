"use client";

import { useState } from "react";

export default function ButtonExamples() {
  const [clicks, setClicks] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setClicks((count) => count + 1)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Primary action
        </button>

        <button
          type="button"
          onClick={() => setClicks(0)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          Secondary action
        </button>

        <button
          type="button"
          disabled
          className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-[var(--color-text-muted)] opacity-60"
        >
          Disabled
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-muted)]" role="status">
        Interactive clicks: <span className="font-semibold tabular-nums">{clicks}</span>
      </p>
    </div>
  );
}
