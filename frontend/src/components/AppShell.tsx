"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { useSession } from "@/components/SessionProvider";
import { SkipToContentLink } from "@/components/SkipToContentLink";
import {
  AppFooter,
  AppShellLayout,
  Badge,
  CheckCircleIcon,
  CloseIcon,
  CompareIcon,
  IconButton,
  LoadingState,
  MenuIcon,
  NavBar,
  SearchIcon,
  ShieldCheckIcon,
  Sidebar,
  SidebarUtilities,
  SignInIcon,
  type SidebarItem,
} from "@/components/ui";
import {
  getMainAppPageMeta,
  getRouteRedirect,
  isGuestOnlyRoute,
  isMainAppRoute,
  isProtectedRoute,
} from "@/lib/route-access";
import { useNavBarOverride } from "@/lib/navbar-override";

function ShellSearchForm({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = pathname === "/innovations" ? (searchParams.get("q") ?? "") : "";
  const routeKey = `${pathname}?${urlQuery}`;
  const [draft, setDraft] = useState<{ key: string; value: string } | null>(null);
  const value = draft && draft.key === routeKey ? draft.value : urlQuery;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = value.trim();
    onNavigate?.();
    router.push(trimmed ? `/innovations?q=${encodeURIComponent(trimmed)}` : "/innovations");
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <label htmlFor={id} className="sr-only">
        Szukaj innowacji w katalogu
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => setDraft({ key: routeKey, value: event.target.value })}
        placeholder="Szukaj w katalogu…"
        className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
      />
    </form>
  );
}

function ShellAuthButtons({
  pathname,
  mobile = false,
}: {
  pathname: string;
  mobile?: boolean;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const nextPath = query ? `${pathname}?${query}` : pathname;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const registerHref = `/register?next=${encodeURIComponent(nextPath)}`;

  if (mobile) {
    return (
      <Link
        href={loginHref}
        aria-label="Zaloguj się"
        title="Zaloguj się"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-[var(--color-accent)] text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        <SignInIcon size={20} />
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge tone="neutral" size="compact">
        Tryb publiczny
      </Badge>
      <Link
        href={registerHref}
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        Załóż konto
      </Link>
      <Link
        href={loginHref}
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--color-on-accent)] transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
      >
        Zaloguj się
      </Link>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { auth, authLoaded, isLoggingOut, logout, compareSlugs } = useSession();
  const [menuOpenPath, setMenuOpenPath] = useState<string | null>(null);
  const mobileMenuOpen = menuOpenPath === pathname;
  const navigationId = useId();
  const searchId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const navBarOverride = useNavBarOverride(pathname);

  const isAuthenticated = Boolean(auth.authenticated && auth.user);
  const isPciAdmin = Boolean(isAuthenticated && auth.user?.is_pci_admin);

  useEffect(() => {
    if (!authLoaded || isLoggingOut) return;
    const search = typeof window !== "undefined" ? window.location.search : "";
    const target = getRouteRedirect({
      pathname,
      search,
      authenticated: isAuthenticated,
      isPciAdmin,
    });
    if (target) {
      router.replace(target);
    }
  }, [authLoaded, isAuthenticated, isLoggingOut, isPciAdmin, pathname, router]);

  const sidebarItems = useMemo<SidebarItem[]>(() => {
    const items: SidebarItem[] = [];

    if (isAuthenticated) {
      items.push({
        id: "workspace",
        label: "Moje wdrożenia",
        href: "/workspace",
        icon: <CheckCircleIcon size={20} />,
        active: pathname === "/workspace" || pathname.startsWith("/workspace/"),
        current: "page",
        onSelect: () => setMenuOpenPath(null),
      });
    }

    items.push(
      {
        id: "innovations",
        label: "Szukaj innowacji",
        href: "/innovations",
        icon: <SearchIcon size={20} />,
        active: pathname === "/solve" || pathname === "/innovations" || pathname.startsWith("/innovations/"),
        current: "page",
        onSelect: () => setMenuOpenPath(null),
      },
      {
        id: "compare",
        label:
          compareSlugs.length > 0
            ? `Porównanie (${compareSlugs.length})`
            : "Porównanie",
        href: "/compare",
        icon: <CompareIcon size={20} />,
        active: pathname === "/compare",
        current: "page",
        onSelect: () => setMenuOpenPath(null),
      },
    );

    if (isPciAdmin) {
      items.push({
        id: "admin",
        label: "Panel PCI",
        href: "/admin",
        icon: <ShieldCheckIcon size={20} />,
        active: pathname === "/admin" || pathname.startsWith("/admin/"),
        current: "page",
        onSelect: () => setMenuOpenPath(null),
      });
    }

    return items;
  }, [compareSlugs.length, isAuthenticated, isPciAdmin, pathname]);

  const isWaitingForAuthOnProtected = !authLoaded && isProtectedRoute(pathname);
  const isBlockedProtected =
    authLoaded &&
    !isLoggingOut &&
    isProtectedRoute(pathname) &&
    (!isAuthenticated || (pathname.startsWith("/admin") && !isPciAdmin));
  const isRedirectingAuthenticatedGuestOnly =
    authLoaded && isAuthenticated && isGuestOnlyRoute(pathname);

  if (isWaitingForAuthOnProtected || isBlockedProtected || isRedirectingAuthenticatedGuestOnly) {
    return (
      <>
        <SkipToContentLink />
        <main
          id="main-content"
          className="flex min-h-screen flex-1 items-center justify-center bg-[var(--color-canvas)] px-4 py-12"
        >
          <div className="w-full max-w-md">
            <LoadingState
              label={
                isRedirectingAuthenticatedGuestOnly
                  ? "Przekierowywanie do panelu…"
                  : "Sprawdzanie dostępu…"
              }
              description="Chwilę, trwa weryfikacja sesji i uprawnień."
            />
          </div>
        </main>
      </>
    );
  }

  if (!isMainAppRoute(pathname)) {
    return children;
  }

  const pageMeta = getMainAppPageMeta(pathname, isAuthenticated);
  const userDisplayName =
    auth.user?.full_name || auth.user?.email || "";

  return (
    <>
      <SkipToContentLink />

      <AppShellLayout
        viewport
        contentAs="main"
        contentId="main-content"
        navigationId={navigationId}
        mobileMenuOpen={mobileMenuOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape" && mobileMenuOpen) {
            setMenuOpenPath(null);
            menuButton.current?.focus();
          }
        }}
        sidebar={
          <Sidebar
            label="Nawigacja główna"
            mobileSearch={pathname === "/innovations" || pathname === "/solve" ? undefined : (
              <Suspense fallback={null}>
                <ShellSearchForm
                  id={`${searchId}-mobile`}
                  onNavigate={() => setMenuOpenPath(null)}
                />
              </Suspense>
            )}
            brand={
              <Link
                href={isAuthenticated ? "/workspace" : "/"}
                onClick={() => setMenuOpenPath(null)}
                aria-label={
                  isAuthenticated
                    ? "Praktoteka — Moje wdrożenia"
                    : "Praktoteka — strona główna"
                }
                className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-sidebar-focus)]"
              >
                <BrandLogo />
              </Link>
            }
            items={sidebarItems}
            footer={
              <SidebarUtilities
                onLogout={isAuthenticated ? logout : undefined}
                userName={isAuthenticated ? userDisplayName : undefined}
              />
            }
          />
        }
        navbar={
          <header>
            <NavBar
              title={navBarOverride?.title ?? pageMeta.title}
              truncateTitle={navBarOverride?.truncateTitle}
              breadcrumbs={pageMeta.breadcrumbs}
              leading={
                <IconButton
                  ref={menuButton}
                  variant="outline"
                  className="md:hidden"
                  aria-label={
                    mobileMenuOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"
                  }
                  aria-expanded={mobileMenuOpen}
                  aria-controls={navigationId}
                  onClick={() =>
                    setMenuOpenPath((prev) => (prev === pathname ? null : pathname))
                  }
                >
                  {mobileMenuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                </IconButton>
              }
              search={
                (pathname === "/innovations" || pathname === "/solve" || navBarOverride?.hideSearch) ? undefined : (
                  <Suspense fallback={null}>
                    <ShellSearchForm id={`${searchId}-desktop`} />
                  </Suspense>
                )
              }
              actions={
                navBarOverride?.actions !== undefined ? (
                  navBarOverride.actions
                ) : !authLoaded || isAuthenticated ? undefined : (
                  <Suspense fallback={null}>
                    <ShellAuthButtons pathname={pathname} />
                  </Suspense>
                )
              }
              mobileActions={
                navBarOverride?.mobileActions !== undefined ? (
                  navBarOverride.mobileActions
                ) : !authLoaded || isAuthenticated ? undefined : (
                  <Suspense fallback={null}>
                    <ShellAuthButtons pathname={pathname} mobile />
                  </Suspense>
                )
              }
            />
          </header>
        }
        footer={<AppFooter />}
      >
        {children}
      </AppShellLayout>
    </>
  );
}
