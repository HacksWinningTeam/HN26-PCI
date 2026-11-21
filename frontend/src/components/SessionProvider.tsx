"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAuthMe,
  logoutAccount,
  type AuthState,
  type MatchItem,
} from "@/lib/radar-api";
import type { OrgType } from "@/lib/radar-labels";

export interface SolvePrefillContext {
  problem_text: string;
  sector: string;
  beneficiary_groups: string[];
  organization_type: OrgType | "";
  deployment_location: string;
  problem_scale: string;
  preferred_maturity: string;
}

interface SessionContextValue {
  auth: AuthState;
  authLoaded: boolean;
  refreshAuth: () => Promise<AuthState>;
  logout: () => Promise<void>;
  compareSlugs: string[];
  toggleCompare: (slug: string) => void;
  setCompareSlugs: (slugs: string[]) => void;
  clearCompare: () => void;
  solveContext: SolvePrefillContext;
  setSolveContext: (ctx: SolvePrefillContext) => void;
  matchBySlug: Record<string, MatchItem>;
  setMatchResults: (items: MatchItem[]) => void;
}

const DEFAULT_SOLVE_CONTEXT: SolvePrefillContext = {
  problem_text: "",
  sector: "",
  beneficiary_groups: [],
  organization_type: "",
  deployment_location: "",
  problem_scale: "",
  preferred_maturity: "",
};

const COMPARE_STORAGE_KEY = "pci-compare-slugs";
const SOLVE_STORAGE_KEY = "pci-solve-context";
const MATCH_STORAGE_KEY = "pci-match-results";

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    user: null,
    profile: null,
  });
  const [authLoaded, setAuthLoaded] = useState(false);
  const [compareSlugs, setCompareSlugsState] = useState<string[]>([]);
  const [solveContext, setSolveContextState] = useState<SolvePrefillContext>(
    DEFAULT_SOLVE_CONTEXT,
  );
  const [matchBySlug, setMatchBySlug] = useState<Record<string, MatchItem>>({});

  const refreshAuth = useCallback(async () => {
    try {
      const next = await fetchAuthMe();
      setAuth(next);
      return next;
    } catch {
      const fallback: AuthState = {
        authenticated: false,
        user: null,
        profile: null,
      };
      setAuth(fallback);
      return fallback;
    } finally {
      setAuthLoaded(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchAuthMe()
      .then((next) => {
        if (active) setAuth(next);
      })
      .catch(() => {
        if (active) {
          setAuth({ authenticated: false, user: null, profile: null });
        }
      })
      .finally(() => {
        if (!active) return;
        try {
          const rawCompare = window.sessionStorage.getItem(COMPARE_STORAGE_KEY);
          if (rawCompare) {
            const parsed = JSON.parse(rawCompare) as string[];
            if (Array.isArray(parsed)) setCompareSlugsState(parsed.slice(0, 3));
          }
          const rawSolve = window.sessionStorage.getItem(SOLVE_STORAGE_KEY);
          if (rawSolve) {
            const parsed = JSON.parse(rawSolve) as SolvePrefillContext;
            if (parsed && typeof parsed === "object") setSolveContextState(parsed);
          }
          const rawMatches = window.sessionStorage.getItem(MATCH_STORAGE_KEY);
          if (rawMatches) {
            const parsed = JSON.parse(rawMatches) as Record<string, MatchItem>;
            if (parsed && typeof parsed === "object") setMatchBySlug(parsed);
          }
        } catch {
          // ignore storage parse failures
        }
        setAuthLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setCompareSlugs = useCallback((slugs: string[]) => {
    const clean = [...new Set(slugs)].slice(0, 3);
    setCompareSlugsState(clean);
    try {
      window.sessionStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      // ignore
    }
  }, []);

  const toggleCompare = useCallback(
    (slug: string) => {
      setCompareSlugs(
        compareSlugs.includes(slug)
          ? compareSlugs.filter((s) => s !== slug)
          : compareSlugs.length >= 3
            ? [...compareSlugs.slice(1), slug]
            : [...compareSlugs, slug],
      );
    },
    [compareSlugs, setCompareSlugs],
  );

  const clearCompare = useCallback(() => setCompareSlugs([]), [setCompareSlugs]);

  const setSolveContext = useCallback((ctx: SolvePrefillContext) => {
    setSolveContextState(ctx);
    try {
      window.sessionStorage.setItem(SOLVE_STORAGE_KEY, JSON.stringify(ctx));
    } catch {
      // ignore
    }
  }, []);

  const setMatchResults = useCallback((items: MatchItem[]) => {
    const next: Record<string, MatchItem> = {};
    for (const item of items) {
      next[item.innovation.slug] = item;
    }
    setMatchBySlug(next);
    try {
      window.sessionStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutAccount();
    } finally {
      setAuth({ authenticated: false, user: null, profile: null });
      setAuthLoaded(true);
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      auth,
      authLoaded,
      refreshAuth,
      logout,
      compareSlugs,
      toggleCompare,
      setCompareSlugs,
      clearCompare,
      solveContext,
      setSolveContext,
      matchBySlug,
      setMatchResults,
    }),
    [
      auth,
      authLoaded,
      refreshAuth,
      logout,
      compareSlugs,
      toggleCompare,
      setCompareSlugs,
      clearCompare,
      solveContext,
      setSolveContext,
      matchBySlug,
      setMatchResults,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
