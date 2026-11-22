import type { ReactNode } from "react";
import { SkipToContentLink } from "@/components/SkipToContentLink";
import {
  AppFooter,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandChecklistIcon,
  BrandLightbulbIcon,
  BrandLimeBurstIcon,
  BrandRocketIcon,
  CheckIcon,
  PublicNavBar,
} from "@/components/ui";

export type AuthShellProps = {
  variant: "login" | "register";
  title: string;
  subtitle: string;
  highlights: readonly string[];
  children: ReactNode;
};

/** Shared public layout for login and registration: form-first on mobile, split view on desktop. */
export function AuthShell({
  variant,
  title,
  subtitle,
  highlights,
  children,
}: AuthShellProps) {
  return (
    <>
      <SkipToContentLink />
      <PublicNavBar variant={variant} />

      <main
        id="main-content"
        className="mx-auto flex w-full max-w-6xl flex-1 items-start px-4 py-5 sm:items-center sm:px-6 sm:py-12"
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-8">
          <section
            aria-label={variant === "login" ? "Formularz logowania" : "Formularz rejestracji"}
            className="flex flex-col justify-center rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 shadow-sm sm:p-8 lg:order-2 lg:col-span-6"
          >
            {children}
          </section>

          <section
            aria-labelledby="auth-intro-heading"
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5 sm:p-8 lg:order-1 lg:col-span-6"
          >
            <BrandBlobSoftBlueIcon
              size={180}
              className="pointer-events-none absolute -right-10 -bottom-10 opacity-70"
            />
            <BrandBlobLimeIcon
              size={140}
              className="pointer-events-none absolute right-14 -bottom-12 opacity-65"
            />

            <div className="relative space-y-5">
              <div className="space-y-2">
                <h2
                  id="auth-intro-heading"
                  className="text-xl font-extrabold tracking-tight text-[var(--color-text)] sm:text-2xl"
                >
                  {title}
                </h2>
                <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
                  {subtitle}
                </p>
              </div>

              <ul className="space-y-3">
                {highlights.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-[var(--color-text)]">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--color-accent-lime-border)] bg-[var(--color-accent-lime-bg)] text-[var(--color-accent-lime-text)]"
                    >
                      <CheckIcon size={14} weight="bold" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              aria-hidden="true"
              className="relative mt-6 hidden items-end justify-end gap-3 pt-4 sm:flex"
            >
              <BrandLimeBurstIcon size={28} className="mb-10 -rotate-45" />
              <div className="flex items-end gap-2 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] px-4 py-3 shadow-xs">
                <BrandLightbulbIcon size={40} />
                <BrandChecklistIcon size={40} />
                <BrandRocketIcon size={44} />
              </div>
            </div>
          </section>
        </div>
      </main>

      <AppFooter fullWidth />
    </>
  );
}
