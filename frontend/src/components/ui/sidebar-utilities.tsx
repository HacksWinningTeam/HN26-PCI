"use client";

import { useState } from "react";
import { AccessibilityIcon } from "@/components/accessibility/AccessibilityIcon";
import { AccessibilityPreferencesControls } from "@/components/accessibility/AccessibilityPreferencesControls";
import { useTranslations } from "@/i18n/provider";
import { SettingsIcon } from "./icons";
import { Sheet } from "./sheet";
import styles from "./sidebar.module.css";

/** Sidebar entry points for the application settings sheets. */
export function SidebarUtilities({ collapsed = false }: { collapsed?: boolean }) {
  const t = useTranslations();
  const [panel, setPanel] = useState<"settings" | "accessibility" | null>(null);

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
              title={collapsed ? t("Settings") : undefined}
              onClick={() => setPanel("settings")}
            >
              <SettingsIcon size={20} className={styles.icon} />
              <span className={collapsed ? "sr-only" : undefined}>{t("Settings")}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={styles.item}
              aria-haspopup="dialog"
              aria-expanded={panel === "accessibility"}
              title={collapsed ? t("Accessibility") : undefined}
              onClick={() => setPanel("accessibility")}
            >
              <AccessibilityIcon className="h-5 w-5 shrink-0" />
              <span className={collapsed ? "sr-only" : undefined}>{t("Accessibility")}</span>
            </button>
          </li>
        </ul>
      </nav>
      <Sheet
        open={panel !== null}
        title={panel === "settings" ? t("Settings") : t("Accessibility")}
        onClose={() => setPanel(null)}
      >
        {panel === "accessibility" ? <AccessibilityPreferencesControls layout="settings" /> : null}
      </Sheet>
    </>
  );
}
