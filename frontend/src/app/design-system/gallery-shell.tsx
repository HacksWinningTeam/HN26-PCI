"use client";

import { useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MouseEvent, ReactNode } from "react";
import { useTranslations } from "@/i18n/provider";
import { AppFooter, AppShellLayout, CloseIcon, IconButton, MenuIcon, NavBar, Sidebar } from "@/components/ui";
import {
  filterGallerySections,
  gallerySectionForHash,
  gallerySections,
  revealGalleryTarget,
} from "./gallery-navigation";
import { GallerySectionIcon } from "./gallery-section-icons";

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
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  const selected = gallerySectionForHash(hash) ?? gallerySections[0];
  const [query, setQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navigationRequest, setNavigationRequest] = useState(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const navigationId = useId();
  const matching = filterGallerySections(query);

  useLayoutEffect(() => {
    if (!mobileMenuOpen) revealGalleryTarget(hash);
  }, [hash, mobileMenuOpen, navigationRequest]);

  function handleNavigate(event: MouseEvent<HTMLDivElement>) {
    if (
      event.defaultPrevented || event.button !== 0 || event.metaKey ||
      event.ctrlKey || event.altKey || event.shiftKey
    ) return;

    const anchor = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement>("a[href]")
      : null;
    if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;

    const target = new URL(anchor.href);
    if (
      target.origin !== window.location.origin ||
      target.pathname.replace(/\/$/, "") !== window.location.pathname.replace(/\/$/, "") ||
      target.search !== window.location.search || !gallerySectionForHash(target.hash)
    ) return;

    event.preventDefault();
    setMobileMenuOpen(false);
    setNavigationRequest((request) => request + 1);
    if (target.href !== window.location.href) {
      window.history.pushState(null, "", target.href);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-lg focus:bg-[var(--color-accent)] focus:px-4 focus:text-sm focus:font-semibold focus:text-[var(--color-on-accent)]"
      >
        {t("Skip to main content")}
      </a>
      <AppShellLayout
        contentAs="main"
        contentId="main-content"
        navigationId={navigationId}
        mobileMenuOpen={mobileMenuOpen}
        onClickCapture={handleNavigate}
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileMenuOpen) {
            setMobileMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
        sidebar={
          <Sidebar
            label={t("Design system sections")}
            items={matching.map((section) => ({
              id: section.id,
              label: section.name,
              href: section.id === "overview" ? "/design-system" : `#${section.id}`,
              active: selected.id === section.id,
              current: "location" as const,
              icon: <GallerySectionIcon id={section.id} />,
            }))}
          />
        }
        navbar={
          <header>
            <NavBar
              title={selected.id === "overview" ? t("Design system") : selected.name}
              breadcrumbs={[
                { label: t("Home"), href: "/" },
                { label: t("Design system"), ...(selected.id !== "overview" ? { href: "/design-system" } : {}) },
                ...(selected.id !== "overview" ? [{ label: selected.name }] : []),
              ]}
              leading={
                <IconButton
                  ref={menuButton}
                  variant="outline"
                  className="md:hidden"
                  aria-label={t("Design system navigation")}
                  aria-expanded={mobileMenuOpen}
                  aria-controls={navigationId}
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                </IconButton>
              }
              actions={
                <div className="w-56 max-w-full">
                  <label htmlFor="design-system-search" className="sr-only">{t("Search sections")}</label>
                  <input
                    id="design-system-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={t("Search sections")}
                    className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
                  />
                </div>
              }
            />
            {query && (
              <p role="status" className="pt-2 text-xs text-[var(--color-text-muted)]">
                {matching.length ? t("Matching sections: {0}", { 0: matching.length }) : t("No sections found.")}
              </p>
            )}
          </header>
        }
        footer={<AppFooter />}
      >
        {children}
      </AppShellLayout>
    </>
  );
}
