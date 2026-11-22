"use client";

import { useId, useState } from "react";
import { AppearanceSelector } from "@/appearance/appearance-selector";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  Banner,
  Button,
  DefinitionList,
} from "@/components/ui";
import { LanguageSelector } from "@/i18n/language-selector";
import { useTranslations } from "@/i18n/provider";

/** Shared settings content used inside PublicNavBar and SidebarUtilities sheets. */
export function SettingsPanel() {
  const t = useTranslations();
  const id = useId();
  const { auth, compareSlugs, clearCompare, solveContext, setSolveContext } =
    useSession();
  const [cleared, setCleared] = useState(false);

  const hasLocalDraft =
    compareSlugs.length > 0 ||
    Boolean(
      solveContext.problem_text ||
        solveContext.sector ||
        solveContext.deployment_location ||
        solveContext.organization_type ||
        solveContext.beneficiary_groups.length > 0,
    );

  function handleClearLocalSession() {
    clearCompare();
    setSolveContext({
      problem_text: "",
      sector: "",
      beneficiary_groups: [],
      organization_type: "",
      deployment_location: "",
      problem_scale: "",
      preferred_maturity: "",
    });
    setCleared(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${id}-prefs`} className="space-y-2.5">
        <h3
          id={`${id}-prefs`}
          className="text-xs font-bold tracking-wide text-[var(--color-text-muted)] uppercase"
        >
          {t("Preferences")}
        </h3>
        <DefinitionList
          items={[
            {
              id: "language",
              label: t("Language"),
              value: <LanguageSelector hideLabel className="w-52 max-w-full" />,
            },
            {
              id: "appearance",
              label: t("Appearance"),
              value: <AppearanceSelector hideLabel className="w-52 max-w-full" />,
            },
          ]}
        />
      </section>

      <section aria-labelledby={`${id}-session`} className="space-y-2.5">
        <h3
          id={`${id}-session`}
          className="text-xs font-bold tracking-wide text-[var(--color-text-muted)] uppercase"
        >
          {t("Session and local data")}
        </h3>
        <DefinitionList
          items={[
            {
              id: "session",
              label: t("Browser session"),
              value: (
                <Badge
                  tone={auth.authenticated ? "info" : "neutral"}
                  size="compact"
                >
                  {auth.authenticated && auth.user
                    ? auth.user.email
                    : t("Public mode")}
                </Badge>
              ),
            },
            {
              id: "compare",
              label: t("Comparison tray: {0}", { 0: compareSlugs.length }),
              value: (
                <Button
                  variant="outline"
                  disabled={!hasLocalDraft}
                  onClick={handleClearLocalSession}
                >
                  {t("Clear local draft")}
                </Button>
              ),
            },
          ]}
        />

        {cleared ? (
          <Banner
            tone="success"
            appearance="tinted"
            announcement="polite"
            onDismiss={() => setCleared(false)}
          >
            {t("Local draft cleared")}
          </Banner>
        ) : null}
      </section>

      <footer className="border-t border-[var(--color-border-subtle)] pt-4 text-center text-xs leading-relaxed text-[var(--color-text-muted)]">
        {t("Created by Jakub Milcarz, Kamila Stachowiak, Marcin Gieroń for HackNation 2026")}
      </footer>
    </div>
  );
}
