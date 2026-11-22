"use client";

import { useState } from "react";
import { AccessibilityIcon } from "@/components/accessibility/AccessibilityIcon";
import { AccessibilityPreferencesControls } from "@/components/accessibility/AccessibilityPreferencesControls";
import { LanguageSelector } from "@/i18n/language-selector";
import { useTranslations } from "@/i18n/provider";
import { SettingsIcon, SignOutIcon } from "./icons";
import { Sheet } from "./sheet";
import styles from "./sidebar.module.css";

export type SidebarUtilitiesProps = {
  onLogout?: () => void | Promise<void>;
  logoutLabel?: string;
};

/** Sidebar footer: compact Settings & Accessibility icon row plus optional full-width sign-out action. */
export function SidebarUtilities({ onLogout, logoutLabel }: SidebarUtilitiesProps) {
  const t = useTranslations();
  const [panel, setPanel] = useState<"settings" | "accessibility" | null>(null);
  const signOutText = logoutLabel ?? t("Log out");

  return (
    <>
      <nav aria-label={t("Settings")}>
        <div className={styles.utilityRow}>
          <button
            type="button"
            className={styles.utilityButton}
            aria-label={t("Settings")}
            aria-haspopup="dialog"
            aria-expanded={panel === "settings"}
            title={t("Settings")}
            onClick={() => setPanel("settings")}
          >
            <SettingsIcon size={20} className={styles.icon} />
          </button>
          <button
            type="button"
            className={styles.utilityButton}
            aria-label={t("Accessibility")}
            aria-haspopup="dialog"
            aria-expanded={panel === "accessibility"}
            title={t("Accessibility")}
            onClick={() => setPanel("accessibility")}
          >
            <AccessibilityIcon className="h-5 w-5 shrink-0" />
          </button>
        </div>

        {onLogout ? (
          <button
            type="button"
            className={`${styles.item} ${styles.logoutItem}`}
            title={signOutText}
            onClick={() => void onLogout()}
          >
            <SignOutIcon size={20} className={styles.icon} />
            <span className={styles.label}>{signOutText}</span>
          </button>
        ) : null}
      </nav>
      <Sheet
        open={panel !== null}
        title={panel === "settings" ? t("Settings") : t("Accessibility")}
        onClose={() => setPanel(null)}
      >
        {panel === "settings" ? <LanguageSelector /> : null}
        {panel === "accessibility" ? <AccessibilityPreferencesControls layout="settings" /> : null}
      </Sheet>
    </>
  );
}
