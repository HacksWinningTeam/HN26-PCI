"use client";

import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { Banner, Button, TextInput } from "@/components/ui";
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
      <Banner tone="success" appearance="tinted" announcement="polite">
        Powiadomienie zapisane. Wyślemy wiadomość na{" "}
        <strong>{auth.authenticated && auth.user ? auth.user.email : email}</strong>, gdy pojawią się pasujące innowacje.
      </Banner>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {auth.authenticated && auth.user ? (
        <p className="text-xs text-[var(--color-text-muted)]">
          Powiadomienie zostanie wysłane na adres konta:{" "}
          <strong className="text-[var(--color-text)]">{auth.user.email}</strong>
        </p>
      ) : (
        <TextInput
          id="notify-email"
          label="Adres e-mail"
          type="email"
          required
          value={email}
          disabled={status === "saving"}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="twoj@email.pl"
          className="min-w-56 flex-1"
        />
      )}

      <Button type="submit" loading={status === "saving"}>
        {status === "saving" ? "Zapisywanie…" : "Powiadom mnie"}
      </Button>

      {status === "error" ? (
        <p role="alert" className="w-full text-xs font-semibold text-[var(--color-error-text)]">
          {errorMsg}
        </p>
      ) : null}
    </form>
  );
}
