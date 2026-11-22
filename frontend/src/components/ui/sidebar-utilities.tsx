"use client";

import { useState } from "react";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AccessibilityIcon } from "@/components/accessibility/AccessibilityIcon";
import { AccessibilityPreferencesControls } from "@/components/accessibility/AccessibilityPreferencesControls";
import { useTranslations } from "@/i18n/provider";
import { SettingsIcon, SignOutIcon, UserIcon } from "./icons";
import { Sheet } from "./sheet";
import styles from "./sidebar.module.css";

export type SidebarUtilitiesProps = {
  onLogout?: () => void | Promise<void>;
  logoutLabel?: string;
  /** Compact footer row with user name + destructive icon logout button (omitted in Admin where full-width button is kept). */
  userName?: string;
};

/** Sidebar footer: compact Settings & Accessibility icon row plus user/sign-out controls. */
export function SidebarUtilities({
  onLogout,
  logoutLabel,
  userName,
}: SidebarUtilitiesProps) {
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
            <span className={styles.utilityLabel}>{t("Settings")}</span>
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
            <span className={styles.utilityLabel}>{t("Accessibility")}</span>
          </button>
        </div>

        {onLogout && userName ? (
          <div className={styles.accountRow}>
            <div className={styles.accountMeta}>
              <UserIcon size={18} className={styles.icon} />
              <span className={styles.accountName} title={userName}>
                {userName}
              </span>
            </div>
            <div className={styles.accountLogoutWrap}>
              <button
                type="button"
                aria-label={signOutText}
                title={signOutText}
                className={styles.accountLogoutButton}
                onClick={() => void onLogout()}
              >
                <SignOutIcon size={18} className={styles.icon} />
                <span className={styles.accountLogoutLabel}>{signOutText}</span>
              </button>
            </div>
          </div>
        ) : onLogout ? (
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
        {panel === "settings" ? <SettingsPanel /> : null}
        {panel === "accessibility" ? <AccessibilityPreferencesControls layout="settings" /> : null}
      </Sheet>
    </>
  );
}
