"use client";

import { useState, useTransition } from "react";
import { Dropdown } from "@/components/ui";
import { saveLocale } from "./actions";
import { isLocale } from "./locale";
import { useLocale, useTranslations } from "./provider";

export type LanguageSelectorProps = {
  hideLabel?: boolean;
  className?: string;
};

export function LanguageSelector({
  hideLabel = false,
  className,
}: LanguageSelectorProps = {}) {
  const locale = useLocale();
  const t = useTranslations();
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);

  return (
    <Dropdown
      label={t("Language")}
      hideLabel={hideLabel}
      value={locale}
      disabled={pending}
      hint={pending ? t("Saving…") : undefined}
      error={failed ? t("The language could not be saved. Try again.") : undefined}
      className={className}
      options={[
        { value: "en-US", label: "English (US)" },
        { value: "pl-PL", label: "Polski" },
      ]}
      onValueChange={(value) => {
        if (!isLocale(value) || value === locale) return;
        setFailed(false);
        startTransition(async () => {
          try {
            await saveLocale(value);
          } catch {
            setFailed(true);
          }
        });
      }}
    />
  );
}
