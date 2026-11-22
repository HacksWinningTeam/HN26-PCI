export interface RouteRedirectInput {
  pathname: string;
  search?: string;
  authenticated: boolean;
  isPciAdmin: boolean;
}

export interface MainAppPageMeta {
  title: string;
  breadcrumbs: Array<{ label: string; href?: string }>;
}

export function normalizePathname(pathname: string): string {
  if (!pathname) return "/";
  const trimmed = pathname.trim();
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

export function isMainAppRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === "/workspace" ||
    path.startsWith("/workspace/") ||
    path === "/solve" ||
    path === "/innovations" ||
    path.startsWith("/innovations/") ||
    path === "/compare"
  );
}

export function isProtectedRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return (
    path === "/workspace" ||
    path.startsWith("/workspace/") ||
    path === "/admin" ||
    path.startsWith("/admin/")
  );
}

export function isGuestOnlyRoute(pathname: string): boolean {
  const path = normalizePathname(pathname);
  return path === "/" || path === "/login" || path === "/register";
}

export function sanitizeNextUrl(
  rawNext: string | null | undefined,
  fallback = "/workspace",
  allowAdmin = true,
): string {
  if (!rawNext) return fallback;
  const trimmed = rawNext.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  const pathnamePart = normalizePathname(trimmed.split(/[?#]/)[0] || "/");
  if (isGuestOnlyRoute(pathnamePart)) {
    return fallback;
  }
  if (!allowAdmin && (pathnamePart === "/admin" || pathnamePart.startsWith("/admin/"))) {
    return fallback;
  }

  return trimmed;
}

export function getRouteRedirect({
  pathname,
  search = "",
  authenticated,
  isPciAdmin,
}: RouteRedirectInput): string | null {
  const path = normalizePathname(pathname);
  const normalizedSearch = search
    ? search.startsWith("?")
      ? search
      : `?${search}`
    : "";
  const fullPath = `${path}${normalizedSearch}`;

  if (!authenticated) {
    if (isProtectedRoute(path)) {
      return `/login?next=${encodeURIComponent(fullPath)}`;
    }
    return null;
  }

  if (path === "/") {
    return "/workspace";
  }

  if (path === "/login" || path === "/register") {
    const params = new URLSearchParams(normalizedSearch);
    return sanitizeNextUrl(params.get("next"), "/workspace", isPciAdmin);
  }

  if ((path === "/admin" || path.startsWith("/admin/")) && !isPciAdmin) {
    return "/workspace";
  }

  return null;
}

export function getMainAppPageMeta(
  pathname: string,
  authenticated: boolean,
): MainAppPageMeta {
  const path = normalizePathname(pathname);
  const homeCrumb = authenticated
    ? { label: "Praktoteka", href: "/workspace" }
    : { label: "Praktoteka", href: "/" };

  if (path === "/workspace") {
    return {
      title: "Moje wdrożenia",
      breadcrumbs: [{ label: "Praktoteka" }, { label: "Moje wdrożenia" }],
    };
  }

  if (path.startsWith("/workspace/plans/")) {
    return {
      title: "Plan wdrożenia",
      breadcrumbs: [
        { label: "Praktoteka", href: "/workspace" },
        { label: "Moje wdrożenia", href: "/workspace" },
        { label: "Plan wdrożenia" },
      ],
    };
  }

  if (path === "/solve" || path === "/innovations") {
    return {
      title: "Szukaj innowacji",
      breadcrumbs: [homeCrumb, { label: "Szukaj innowacji" }],
    };
  }

  if (path.startsWith("/innovations/")) {
    return {
      title: "Szczegóły innowacji",
      breadcrumbs: [
        homeCrumb,
        { label: "Szukaj innowacji", href: "/innovations" },
        { label: "Szczegóły" },
      ],
    };
  }

  if (path === "/compare") {
    return {
      title: "Porównanie innowacji",
      breadcrumbs: [homeCrumb, { label: "Porównanie" }],
    };
  }

  return {
    title: "Praktoteka",
    breadcrumbs: [homeCrumb],
  };
}
