import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-6">
      <section className="space-y-4">
        <h1 className="sr-only">Praktoteka</h1>
        <BrandLogo size="lg" />
        <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
          Katalog, wyszukiwarka, karty innowacji i porównanie są dostępne bez logowania.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-2" aria-label="Sposób rozpoczęcia pracy">
        <Link
          href="/solve"
          className="flex flex-col justify-between rounded-xl border-2 border-[var(--color-accent)] bg-[var(--color-surface)] p-6 transition-colors hover:bg-[var(--color-surface-raised)]"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Szukam rozwiązania problemu
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Dla osoby, która wie, jaki problem chce rozwiązać, ale nie zna dostępnych innowacji.
            </p>
          </div>
          <span className="mt-6 inline-flex min-h-11 items-center self-start rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)]">
            Opisz problem →
          </span>
        </Link>

        <Link
          href="/innovations"
          className="flex flex-col justify-between rounded-xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)]"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Przeglądam innowacje
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Dla osoby, która chce zobaczyć istniejące projekty, przejrzeć kategorie albo znaleźć konkretną innowację.
            </p>
          </div>
          <span className="mt-6 inline-flex min-h-11 items-center self-start rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-2 text-sm font-semibold text-[var(--color-text)]">
            Otwórz katalog →
          </span>
        </Link>
      </section>
    </div>
  );
}
