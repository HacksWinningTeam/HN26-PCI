"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/AuthShell";
import { useSession } from "@/components/SessionProvider";
import { ArrowRightIcon, Banner } from "@/components/ui";
import { registerAccount } from "@/lib/radar-api";
import { sanitizeNextUrl } from "@/lib/route-access";

function RegisterFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextUrl = sanitizeNextUrl(rawNext, "/workspace");
  const { refreshAuth, solveContext } = useSession();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await registerAccount({
        email,
        password,
        full_name: fullName,
        organization_type: solveContext.organization_type || "public_institution",
        deployment_location: solveContext.deployment_location || "",
      });
      const nextAuth = await refreshAuth();
      const target = sanitizeNextUrl(
        rawNext,
        "/workspace",
        Boolean(nextAuth.user?.is_pci_admin),
      );
      router.replace(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rejestracja nie powiodła się.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="register"
      title="Załóż konto i otrzymaj spersonalizowany plan wdrożenia"
      subtitle="Po utworzeniu konta wrócisz w wybrane miejsce i odblokujesz pełne wsparcie wdrożeniowe."
      highlights={[
        "Dopasujemy rozwiązania do Twojej organizacji",
        "Przygotujemy plan w 5 przejrzystych fazach",
        "Udostępnimy dane kontaktowe i zapiszemy Twój postęp",
      ]}
    >
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
            Utwórz konto
          </h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            Wystarczą podstawowe dane, aby zapisać porównania i uruchomić checklistę.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="reg-fullname"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]"
            >
              Imię i nazwisko
            </label>
            <input
              id="reg-fullname"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Jan Kowalski"
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]"
            >
              Adres e-mail
            </label>
            <input
              id="reg-email"
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
              htmlFor="reg-password"
              className="mb-1.5 block text-xs font-semibold text-[var(--color-text)]"
            >
              Hasło (min. 6 znaków)
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 znaków"
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
            <span>{loading ? "Tworzenie konta…" : "Utwórz konto"}</span>
            <ArrowRightIcon size={16} weight="bold" />
          </button>
        </form>

        <p className="border-t border-[var(--color-border-subtle)] pt-4 text-sm text-[var(--color-text-muted)]">
          Masz już konto?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(nextUrl)}`}
            className="font-semibold text-[var(--color-accent-text)] hover:underline"
          >
            Zaloguj się
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-[var(--color-text-muted)]">Ładowanie…</p>}>
      <RegisterFormInner />
    </Suspense>
  );
}
