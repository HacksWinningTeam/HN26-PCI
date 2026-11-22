"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { useSession } from "@/components/SessionProvider";
import { ArrowRightIcon, Banner } from "@/components/ui";
import { loginAccount } from "@/lib/radar-api";

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/workspace";
  const { refreshAuth } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function doLogin(eMail: string, pass: string) {
    setLoading(true);
    setError("");
    try {
      await loginAccount(eMail, pass);
      await refreshAuth();
      router.push(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd logowania.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="login"
      title="Dobrze Cię znowu widzieć"
      subtitle="Zaloguj się, aby wrócić do zapisanych projektów i zarządzać planem wdrożenia w swojej organizacji."
      highlights={[
        "Wrócisz bezpośrednio do wybranej innowacji i porównań",
        "Odblokujesz pełny plan wdrożenia w 5 fazach",
        "Sprawdzisz zweryfikowane dane kontaktowe i postęp kroków",
      ]}
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Zaloguj się
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Podaj adres e-mail i hasło powiązane z Twoją organizacją.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void doLogin(email, password);
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]"
            >
              Adres e-mail
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="imie@organizacja.pl"
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <div>
            <label
              htmlFor="login-pass"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]"
            >
              Hasło
            </label>
            <input
              id="login-pass"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Wpisz hasło"
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          {error ? (
            <Banner tone="error" appearance="tinted" announcement="assertive">
              {error}
            </Banner>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--color-promo-navy-border)] bg-[var(--color-promo-navy-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--color-promo-navy-fg)] transition-colors hover:border-[var(--color-accent)] disabled:opacity-60"
          >
            <span>{loading ? "Logowanie…" : "Zaloguj się"}</span>
            <ArrowRightIcon size={16} weight="bold" />
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-4 text-sm text-[var(--color-text-muted)]">
          <p>
            Nie masz jeszcze konta?{" "}
            <Link
              href={`/register?next=${encodeURIComponent(nextUrl)}`}
              className="font-semibold text-[var(--color-accent-text)] hover:underline"
            >
              Załóż konto
            </Link>
          </p>

          <button
            type="button"
            disabled={loading}
            title="Zaloguj się na konto demonstracyjne"
            onClick={() => void doLogin("soltys@trzebownisko.pl", "demo1234")}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3.5 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface)] disabled:opacity-60"
          >
            Demo
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-[var(--color-text-muted)]">Ładowanie…</p>}>
      <LoginFormInner />
    </Suspense>
  );
}
