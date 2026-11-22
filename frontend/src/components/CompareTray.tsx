"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

export function CompareTray() {
  const { compareSlugs, clearCompare } = useSession();

  if (compareSlugs.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Wybrane innowacje do porównania"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-bg)] px-4 py-3 text-xs text-[var(--color-info-text)] print:hidden"
    >
      <div className="font-semibold">
        Wybrano do porównania: <span className="font-mono">{compareSlugs.length}/3</span>{" "}
        {compareSlugs.length < 2 ? "(dodaj co najmniej 2, aby porównać)" : ""}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/compare"
          className="inline-flex min-h-9 items-center rounded-lg bg-[var(--color-accent)] px-3 py-1.5 font-semibold text-[var(--color-on-accent)] hover:bg-[var(--color-accent-hover)]"
        >
          Przejdź do porównania →
        </Link>
        <button
          type="button"
          onClick={clearCompare}
          className="min-h-9 cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 font-semibold text-[var(--color-text)]"
        >
          Wyczyść
        </button>
      </div>
    </div>
  );
}
