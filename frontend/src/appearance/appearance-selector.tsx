"use client";

import { useId, useState, useTransition } from "react";
import { useTranslations } from "@/i18n/provider";
import { saveAppearance } from "./actions";
import { isAppearance } from "./appearance";
import { useAppearance } from "./provider";

export type AppearanceSelectorProps = {
  hideLabel?: boolean;
  className?: string;
};

export function AppearanceSelector({
  hideLabel = false,
  className,
}: AppearanceSelectorProps = {}) {
  const appearance = useAppearance();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const selectId = useId();
  const errorId = useId();

  return (
    <div className={["inline-flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      <div className="inline-flex items-center gap-2">
        <label
          htmlFor={selectId}
          className={
            hideLabel
              ? "sr-only"
              : "text-sm font-medium text-[var(--color-text-muted)]"
          }
        >
          {t("Appearance")}
        </label>
        <select
          id={selectId}
          value={appearance}
          disabled={pending}
          aria-invalid={failed || undefined}
          aria-describedby={failed ? errorId : undefined}
          onChange={(event) => {
            const value = event.target.value;
            if (!isAppearance(value) || value === appearance) return;
            setFailed(false);
            startTransition(async () => {
              try {
                await saveAppearance(value);
              } catch {
                setFailed(true);
              }
            });
          }}
          className="min-h-11 cursor-pointer rounded-md border-2 border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value="light">{t("Light")}</option>
          <option value="dark">{t("Dark")}</option>
          <option value="system">{t("System")}</option>
        </select>
      </div>
      {pending ? (
        <p className="text-xs text-[var(--color-text-muted)]" role="status">
          {t("Saving…")}
        </p>
      ) : null}
      {failed ? (
        <p id={errorId} className="text-xs font-medium text-[var(--color-error-text)]" role="alert">
          {t("The appearance could not be saved. Try again.")}
        </p>
      ) : null}
    </div>
  );
}
