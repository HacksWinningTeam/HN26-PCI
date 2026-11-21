"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { AccessibilityIcon } from "@/components/accessibility/AccessibilityIcon";
import { AccessibilityPreferencesControls } from "@/components/accessibility/AccessibilityPreferencesControls";
import { LanguageSelector } from "@/i18n/language-selector";
import { useTranslations } from "@/i18n/provider";
import { CloseIcon, MenuIcon, SettingsIcon } from "./icons";
import { Sheet } from "./sheet";
import styles from "./public-nav-bar.module.css";

export type PublicNavBarProps = {
  variant?: "landing" | "login" | "register";
  /** Force the compact presentation for design-system previews. */
  layout?: "responsive" | "mobile";
};

/** Public website header; account screens keep only the essentials. */
export function PublicNavBar({ variant = "landing", layout = "responsive" }: PublicNavBarProps) {
  const t = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panel, setPanel] = useState<"settings" | "accessibility" | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const id = useId();
  const authHref = variant === "login" ? "/register" : "/login";
  const authLabel = variant === "login" ? t("Create account") : t("Sign in");

  return (
    <>
      <header className={styles.header} data-layout={layout} data-menu-open={menuOpen || undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuOpen) {
            setMenuOpen(false);
            menuButton.current?.focus();
          }
        }}
      >
        <div className={styles.row}>
          <Link
            href="/"
            className={styles.brand}
            aria-label={`Praktoteka — ${t("Home")}`}
            onClick={() => setMenuOpen(false)}
          >
            <BrandLogo />
          </Link>
          <nav className={styles.navigation} aria-label={t("Public navigation")}>
            {variant === "landing" && (
              <div id={`${id}-links`} className={styles.links}>
                <Link
                  className={styles.link}
                  href="/innovations"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("Catalog")}
                </Link>
                <Link
                  className={styles.link}
                  href="/#jak-to-dziala"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("How it works?")}
                </Link>
                <Link
                  className={styles.link}
                  href="/#o-platformie"
                  onClick={() => setMenuOpen(false)}
                >
                  {t("About the platform")}
                </Link>
              </div>
            )}
            <div className={styles.actions}>
              <div className={styles.utilities}>
                <button type="button" className={styles.link} title={t("Settings")}
                  aria-label={t("Settings")} aria-haspopup="dialog" aria-expanded={panel === "settings"}
                  onClick={() => setPanel("settings")}>
                  <SettingsIcon size={20} />
                </button>
                <button type="button" className={styles.link} title={t("Accessibility")}
                  aria-label={t("Accessibility")} aria-haspopup="dialog" aria-expanded={panel === "accessibility"}
                  onClick={() => setPanel("accessibility")}>
                  <AccessibilityIcon className="h-5 w-5 shrink-0" />
                </button>
              </div>
              <div id={`${id}-auth`} className={styles.auth}>
                <Link href={authHref} className={styles.authLink}>{authLabel}</Link>
              </div>
            </div>
          </nav>
          <button ref={menuButton} type="button" className={styles.toggle}
            aria-label={menuOpen ? t("Close navigation") : t("Open navigation")}
            aria-expanded={menuOpen} aria-controls={variant === "landing" ? `${id}-links ${id}-auth` : `${id}-auth`}
            onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </header>
      <Sheet open={panel !== null} onClose={() => setPanel(null)}
        title={panel === "settings" ? t("Settings") : t("Accessibility")}>
        {panel === "settings" ? <LanguageSelector /> : null}
        {panel === "accessibility" ? <AccessibilityPreferencesControls layout="settings" /> : null}
      </Sheet>
    </>
  );
}
