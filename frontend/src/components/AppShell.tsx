"use client";

import type { ReactNode } from "react";
import { AccessibilityMenu } from "@/components/accessibility/AccessibilityMenu";
import { useTranslations } from "@/i18n/provider";

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-md focus:bg-[var(--color-accent)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-on-accent)] focus:shadow-md"
      >
        {t("Skip to main content")}
      </a>

      <main id="main-content" className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        {children}
      </main>

      <AccessibilityMenu />
    </>
  );
}
