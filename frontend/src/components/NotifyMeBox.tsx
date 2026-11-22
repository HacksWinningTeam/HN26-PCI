"use client";

import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { createMatchNotification } from "@/lib/radar-api";

export function NotifyMeBox({
  problemText,
  filtersSnapshot = {},
}: {
  problemText: string;
  filtersSnapshot?: Record<string, unknown>;
}) {
  const { auth } = useSession();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      await createMatchNotification({
        email: auth.authenticated ? undefined : email,
        problem_text: problemText,
        filters_snapshot: filtersSnapshot,
      });
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Nie udało się zapisać powiadomienia.",
      );
    }
  }

  if (status === "saved") {
    return (
      <p
        role="status"
        className="rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm font-semibold text-[var(--color-success-text)]"
      >
        Powiadomienie zapisane. Wyślemy wiadomość na{" "}
        {auth.authenticated && auth.user ? auth.user.email : email}, gdy pojawią się pasujące innowacje.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      {auth.authenticated && auth.user ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Powiadomienie zostanie wysłane na adres konta:{" "}
          <strong className="text-[var(--color-text)]">{auth.user.email}</strong>
        </p>
      ) : (
        <div>
          <label htmlFor="notify-email" className="mb-1 block text-xs font-semibold">
            Adres e-mail
          </label>
          <input
            id="notify-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="twoj@email.pl"
            className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
          />
        </div>
      )}

      <button
        type="submit"
        disabled={status === "saving"}
        className="min-h-11 cursor-pointer rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-on-accent)] disabled:opacity-60"
      >
        {status === "saving" ? "Zapisywanie…" : "Powiadom mnie"}
      </button>

      {status === "error" ? (
        <p role="alert" className="w-full text-xs font-semibold text-[var(--color-error-text)]">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}
