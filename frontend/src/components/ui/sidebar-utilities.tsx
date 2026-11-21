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

/** Sidebar entry points for the application settings sheets and optional sign-out action. */
export function SidebarUtilities({ onLogout, logoutLabel }: SidebarUtilitiesProps) {
  const t = useTranslations();
  const [panel, setPanel] = useState<"settings" | "accessibility" | null>(null);
  const signOutText = logoutLabel ?? t("Log out");

  return (
    <>
      <nav aria-label={t("Settings")}>
        <ul className={styles.list}>
          <li>
            <button
              type="button"
              className={styles.item}
              aria-haspopup="dialog"
              aria-expanded={panel === "settings"}
              title={t("Settings")}
              onClick={() => setPanel("settings")}
            >
              <SettingsIcon size={20} className={styles.icon} />
              <span className={styles.label}>{t("Settings")}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              aria-haspopup="dialog"
              aria-expanded={panel === "accessibility"}
              title={t("Accessibility")}
              onClick={() => setPanel("accessibility")}
            >
              <AccessibilityIcon className="h-5 w-5 shrink-0" />
              <span className={styles.label}>{t("Accessibility")}</span>
            </button>
          </li>
          {onLogout ? (
            <li>
              <button
                type="button"
                className={styles.item}
                title={signOutText}
                onClick={() => void onLogout()}
              >
                <SignOutIcon size={20} className={styles.icon} />
                <span className={styles.label}>{signOutText}</span>
              </button>
            </li>
          ) : null}
        </ul>
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
