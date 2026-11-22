"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import {
  ArrowRightIcon,
  Badge,
  BrandScalesIcon,
  Button,
} from "@/components/ui";

export function CompareTray() {
  const { compareSlugs, clearCompare } = useSession();

  if (compareSlugs.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Wybrane innowacje do porównania"
      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-info-border)]/60 bg-[var(--color-info-bg)] px-4 py-3 text-xs text-[var(--color-info-text)] shadow-xs print:hidden"
    >
      <div className="flex flex-wrap items-center gap-2.5 font-semibold">
        <BrandScalesIcon size={24} className="shrink-0" />
        <span>Wybrano do porównania</span>
        <Badge tone="info" variant="solid" size="compact">
          {compareSlugs.length}/3
        </Badge>
        {compareSlugs.length < 2 ? (
          <span className="font-normal text-[var(--color-text-muted)]">
            Dodaj co najmniej 2 karty, aby porównać
          </span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/compare"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-xs font-bold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          <span>Przejdź do porównania</span>
          <ArrowRightIcon size={14} weight="bold" />
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={clearCompare}
        >
          Wyczyść
        </Button>
      </div>
    </div>
  );
}
