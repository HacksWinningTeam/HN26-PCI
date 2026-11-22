"use client";

import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { useTranslations } from "@/i18n/provider";

export function AppFooter({ fullWidth = false }: { fullWidth?: boolean }) {
  const t = useTranslations();
  const { auth } = useSession();
  const isPciAdmin = Boolean(auth.authenticated && auth.user?.is_pci_admin);

  return (
    <footer
      className={[
        "shrink-0 border-t border-[var(--color-border-subtle)] py-3 text-xs text-[var(--color-text-muted)] print:hidden",
        fullWidth ? "bg-[var(--color-surface)]" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "flex flex-wrap items-center justify-between gap-x-6 gap-y-2",
          fullWidth
            ? "mx-auto w-full max-w-6xl px-4 sm:px-6"
            : "mx-auto w-full max-w-[var(--app-shell-content-max-width,none)]",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span>{t("Praktoteka © 2026 • Created for HackNation 2026")}</span>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/design-system" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
            {t("Design system")}
          </Link>
          {isPciAdmin ? (
            <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-[var(--color-text)] hover:underline">
              {t("Admin Panel")}
            </Link>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
