import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="shrink-0 border-t border-[var(--color-border-subtle)] py-3 text-xs text-[var(--color-text-muted)] print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span>Praktoteka © 2026 • Stworzone na HackNation 2026</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/design-system" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
            Design System
          </Link>
          <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
            Panel Admina
          </Link>
        </div>
      </div>
    </footer>
  );
}
