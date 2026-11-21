"use client";

import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { useTranslations } from "@/i18n/provider";
import {
  filterGallerySections,
  gallerySectionForHash,
  gallerySections,
  revealGalleryTarget,
  type GalleryGroup,
} from "./gallery-navigation";

const groupOrder: readonly GalleryGroup[] = [
  "Library",
  "Foundations",
  "Controls",
  "Data display",
  "Feedback",
  "Overlays",
  "Navigation",
];

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

export default function GalleryShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  const selected = gallerySectionForHash(hash) ?? gallerySections[0];
  const [query, setQuery] = useState("");

  useLayoutEffect(() => {
    revealGalleryTarget(hash);
  }, [hash]);

  const matching = filterGallerySections(query);
  const grouped = groupOrder
    .map((group) => ({
      group,
      items: matching.filter((section) => section.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  function handleNavigate(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    ) {
      return;
    }

    const anchor =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>("a[href]")
        : null;
    if (
      !anchor ||
      (anchor.target && anchor.target !== "_self") ||
      anchor.hasAttribute("download")
    ) {
      return;
    }

    const target = new URL(anchor.href);
    if (
      target.origin !== window.location.origin ||
      target.pathname.replace(/\/$/, "") !==
        window.location.pathname.replace(/\/$/, "") ||
      target.search !== window.location.search ||
      !gallerySectionForHash(target.hash)
    ) {
      return;
    }

    event.preventDefault();
    if (target.href !== window.location.href) {
      window.history.pushState(null, "", target.href);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
    revealGalleryTarget(target.hash);
  }

  return (
    <div
      onClickCapture={handleNavigate}
      className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start"
    >
      <aside
        aria-label={t("Design system navigation")}
        className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 lg:sticky lg:top-6"
      >
        <div className="mb-4 flex items-baseline justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <div>
            <p className="text-sm font-bold tracking-tight text-[var(--color-text)]">
              {t("Design system")}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("Foundations & UI")}
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--color-accent-text)] underline decoration-2 underline-offset-2"
          >
            {t("Home")}
          </Link>
        </div>

        <div className="mb-4">
          <label htmlFor="design-system-search" className="sr-only">
            {t("Search sections")}
          </label>
          <input
            id="design-system-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Search sections")}
            className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          />
          {query && (
            <p
              className="mt-2 text-xs text-[var(--color-text-muted)]"
              role="status"
            >
              {matching.length
                ? t("Matching sections: {0}", { 0: matching.length })
                : t("No sections found.")}
            </p>
          )}
        </div>

        <nav aria-label={t("Design system sections")} className="space-y-4">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              {group !== "Library" && (
                <p className="mb-1.5 px-2 text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                  {group}
                </p>
              )}
              <ul className="space-y-1">
                {items.map((section) => {
                  const isActive = selected.id === section.id;
                  const href =
                    section.id === "overview"
                      ? "/design-system"
                      : `#${section.id}`;
                  return (
                    <li key={section.id}>
                      <a
                        href={href}
                        aria-current={isActive ? "location" : undefined}
                        className={`flex min-h-11 items-center rounded-lg px-2.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] ${
                          isActive
                            ? "bg-[var(--color-surface-raised)] font-semibold text-[var(--color-text)]"
                            : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]"
                        }`}
                      >
                        {section.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
