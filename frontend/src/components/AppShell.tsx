"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { AccessibilityMenu } from "@/components/accessibility/AccessibilityMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { useSession } from "@/components/SessionProvider";
import { useTranslations } from "@/i18n/provider";

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const { auth, authLoaded, logout, compareSlugs } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuId = useId();
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const navItems = [
    { href: "/solve", label: "Szukaj problemu", active: pathname === "/solve" },
    {
      href: "/innovations",
      label: "Katalog",
      active: pathname.startsWith("/innovations"),
    },
    {
      href: "/compare",
      label: `Porównanie (${compareSlugs.length})`,
      active: pathname === "/compare",
    },
    {
      href: "/workspace",
      label: "Moje wdrożenia",
      active: pathname.startsWith("/workspace"),
    },
  ];

  function handleHeaderKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape" && mobileMenuOpen) {
      setMobileMenuOpen(false);
      toggleBtnRef.current?.focus();
    }
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-on-accent)] focus:shadow-md"
      >
        {t("Skip to main content")}
      </a>

      <header
        onKeyDown={handleHeaderKeyDown}
        className="border-b border-[var(--color-border)] bg-[var(--color-surface)] print:hidden"
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Praktoteka — strona główna"
            className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
          >
            <BrandLogo size="sm" />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Nawigacja główna" className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  item.active
                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden min-w-28 items-center justify-end gap-2 md:flex">
            {!authLoaded ? (
              <div className="min-h-11 w-24" aria-hidden="true" />
            ) : auth.authenticated && auth.user ? (
              <div className="flex items-center gap-2">
                <span className="max-w-[180px] truncate text-xs font-medium text-[var(--color-text-muted)]">
                  {auth.user.email}
                </span>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="min-h-11 shrink-0 cursor-pointer rounded-md border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
                >
                  Wyloguj
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
              >
                Zaloguj się
              </Link>
            )}
          </div>

          {/* Mobile hamburger button */}
          <button
            ref={toggleBtnRef}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
            aria-label={mobileMenuOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-accent)] md:hidden"
          >
            {mobileMenuOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen ? (
          <div
            id={mobileMenuId}
            className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-3 md:hidden"
          >
            <nav aria-label="Nawigacja mobilna" className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={item.active ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    item.active
                      ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
              {!authLoaded ? (
                <div className="min-h-11 w-full" aria-hidden="true" />
              ) : auth.authenticated && auth.user ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-medium text-[var(--color-text-muted)]">
                    {auth.user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      void logout();
                    }}
                    className="min-h-11 shrink-0 cursor-pointer rounded-md border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
                  >
                    Wyloguj
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-text)] hover:border-[var(--color-accent)]"
                >
                  Zaloguj się
                </Link>
              )}
            </div>
          </div>
        ) : null}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-surface)] py-5 text-xs text-[var(--color-text-muted)] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 sm:px-6">
          <span>Praktoteka © 2026 • Stworzone na HackNation 2026</span>
          <Link href="/admin" className="hover:underline">
            Panel Admina
          </Link>
        </div>
      </footer>

      <AccessibilityMenu />
    </>
  );
}
