"use client";

import { useAccessibilityPreferences } from "@/components/accessibility/AccessibilityProvider";
import { Dropdown } from "@/components/ui";
import { useTranslations } from "@/i18n/provider";
import { isAppearance } from "./appearance";

export type AppearanceSelectorProps = {
  hideLabel?: boolean;
  className?: string;
};

export function AppearanceSelector({
  hideLabel = false,
  className,
}: AppearanceSelectorProps = {}) {
  const { appearance, setAppearance } = useAccessibilityPreferences();
  const t = useTranslations();

  return (
    <Dropdown
      label={t("Appearance")}
      hideLabel={hideLabel}
      value={appearance}
      className={className}
      options={[
        { value: "system", label: t("System") },
        { value: "light", label: t("Light") },
        { value: "dark", label: t("Dark") },
        { value: "hc-black-white", label: t("High contrast: Black & White") },
        { value: "hc-black-yellow", label: t("High contrast: Black & Yellow") },
        { value: "grayscale", label: t("Grayscale") },
      ]}
      onValueChange={(value) => {
        if (!isAppearance(value) || value === appearance) return;
        setAppearance(value);
      }}
    />
  );
}
