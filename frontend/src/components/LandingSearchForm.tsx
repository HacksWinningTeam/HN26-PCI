"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { SearchIcon } from "@/components/ui";

export function LandingSearchForm() {
  const router = useRouter();
  const inputId = useId();
  const [query, setQuery] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/innovations?q=${encodeURIComponent(trimmed)}` : "/innovations");
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Wyszukaj innowację w katalogu"
      className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-2 shadow-sm sm:flex-row sm:items-center"
    >
      <label htmlFor={inputId} className="sr-only">
        Wyszukaj rozwiązanie, obszar lub słowo kluczowe
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
        <SearchIcon size={20} className="shrink-0 text-[var(--color-text-muted)]" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Wyszukaj rozwiązanie, obszar lub słowo kluczowe…"
          className="min-h-11 w-full bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none"
        />
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Szukaj
      </button>
    </form>
  );
}
