import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import BadgeExamples from "./badge-examples";
import ButtonExamples from "./button-examples";
import {
  CardExamples,
  ListExamples,
  ScoringBreakdownExamples,
  TableExamples,
} from "./data-display-examples";
import {
  BannerExamples,
  DialogExamples,
  EmptyStateExamples,
  ErrorStateExamples,
  LoadingStateExamples,
  NavigationExamples,
} from "./feedback-overlay-examples";
import GalleryShell from "./gallery-shell";
import IconExamples from "./icon-examples";
import InputExamples from "./input-examples";
import SheetExamples from "./sheet-examples";

export const metadata: Metadata = {
  title: "Design system · Praktoteka",
  description:
    "Typography, colors, spacing, and UI component patterns for Praktoteka.",
};

const typeScale = [
  {
    token: "text-3xl",
    size: "30px",
    use: "Page title",
    sample: "Praktoteka",
    className: "text-3xl font-bold tracking-tight",
  },
  {
    token: "text-2xl",
    size: "24px",
    use: "Section heading",
    sample: "Explainable scoring & criteria",
    className: "text-2xl font-semibold tracking-tight",
  },
  {
    token: "text-lg",
    size: "18px",
    use: "Subheading",
    sample: "Evidence, declarations, and gaps",
    className: "text-lg font-semibold",
  },
  {
    token: "text-base",
    size: "16px",
    use: "Body",
    sample:
      "Each innovation moves from structured submission through transparent assessment to a concrete next step.",
    className: "text-base leading-relaxed",
  },
  {
    token: "text-sm",
    size: "14px",
    use: "Interface",
    sample: "Type, maturity stage, organization, and sector tags",
    className: "text-sm leading-normal",
  },
  {
    token: "text-xs",
    size: "12px",
    use: "Caption",
    sample: "Assessment v1 · Synthetic demo record",
    className: "text-xs leading-normal",
  },
] as const;

type ColorToken = {
  name: string;
  token: string;
  usage: string;
};

const brandColors: readonly ColorToken[] = [
  { name: "Brand Lime", token: "--color-brand-lime", usage: "#c4ee2a · Wyróżnienia, sukces i paski postępu (z tekstem #072141)" },
  { name: "Brand Cyan", token: "--color-brand-cyan", usage: "#06bcf9 · Główny akcent akcji i aktywnych stanów (--color-accent)" },
  { name: "Brand Navy", token: "--color-brand-navy", usage: "#072141 · Główny tekst (light) i tekst na Lime/Cyan (--color-on-accent)" },
];

const semanticColors: readonly ColorToken[] = [
  { name: "Info", token: "--color-info-border", usage: "Kontekst i wskazówki (pochodna Brand Cyan)" },
  { name: "Success", token: "--color-success-badge", usage: "PASS / ukończone (Brand Lime #c4ee2a)" },
  { name: "Warning", token: "--color-warn-badge", usage: "Ostrzeżenia / braki informacyjne" },
  { name: "Error", token: "--color-error-badge", usage: "FAIL / sprzeczności i błędy" },
];

const neutralColors: readonly ColorToken[] = [
  { name: "Canvas", token: "--color-canvas", usage: "App background" },
  { name: "Surface", token: "--color-surface", usage: "Cards, header, footer, sidebar" },
  { name: "Raised surface", token: "--color-surface-raised", usage: "Secondary controls & active nav" },
  { name: "Primary text", token: "--color-text", usage: "Headings & body copy" },
  { name: "Muted text", token: "--color-text-muted", usage: "Secondary labels & captions" },
  { name: "Border", token: "--color-border", usage: "Interactive control outlines (>= 3:1)" },
  { name: "Subtle border", token: "--color-border-subtle", usage: "Card & section dividers" },
  { name: "Focus", token: "--color-focus", usage: "Visible :focus-visible outline" },
];

const spacingScale = [
  { step: 1, px: "4px", use: "Fine adjustments" },
  { step: 2, px: "8px", use: "Icon and label gaps" },
  { step: 3, px: "12px", use: "Related elements" },
  { step: 4, px: "16px", use: "Content groups & card padding" },
  { step: 6, px: "24px", use: "Page gutters & section spacing" },
  { step: 8, px: "32px", use: "Major subsections" },
  { step: 11, px: "44px", use: "Minimum interactive target (WCAG 2.2 AA)" },
] as const;

const futureSections: readonly { id: string; name: string; scope: string }[] = [] as const;

function DesignSection({
  id,
  title,
  planned = false,
  defaultOpen = false,
  children,
}: {
  id: string;
  title: string;
  planned?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
}) {
  return (
    <details
      className="group border-t border-[var(--color-border-subtle)] py-6"
      data-design-section={id}
      open={defaultOpen || undefined}
      suppressHydrationWarning
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] [&::-webkit-details-marker]:hidden">
        <h2
          id={id}
          className="text-xl font-semibold tracking-tight text-[var(--color-text)]"
        >
          {title}
        </h2>
        <span className="flex shrink-0 items-center gap-3">
          {planned && (
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
              Planned
            </span>
          )}
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4 text-[var(--color-text-muted)] transition-transform duration-150 group-open:rotate-90"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function Palette({ colors }: { colors: readonly ColorToken[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {colors.map(({ name, token, usage }) => (
        <li
          key={token}
          className="flex items-center gap-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3"
        >
          <div
            aria-hidden="true"
            className="h-10 w-10 shrink-0 rounded-md border border-[var(--color-border)]"
            style={{ background: `var(${token})` }}
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--color-text)]">{name}</p>
            <p className="truncate font-mono text-xs text-[var(--color-text-muted)]">
              {token}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{usage}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function DesignSystemPage() {
  return (
    <GalleryShell>
      <div className="space-y-4">
        <header className="space-y-2 pb-4">
          <p className="max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)]">
            Fundamenty oraz gotowe, dostępne komponenty strukturalne dla{" "}
            <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-xs">
              @/components/ui
            </code>
            . Każdy komponent dziedziczy tokeny z{" "}
            <code className="rounded bg-[var(--color-surface-raised)] px-1.5 py-0.5 font-mono text-xs">
              globals.css
            </code>{" "}
            (WCAG 2.2 AA, tryb jasny, ciemny i wysokiego kontrastu).
          </p>
        </header>

        <DesignSection id="typography" title="Typography" defaultOpen>
          <div className="space-y-4">
            <div className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4">
              {typeScale.map(({ token, size, use, sample, className }) => (
                <div
                  key={token}
                  className="grid gap-3 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-center"
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-[var(--color-text)]">
                      {use}
                    </p>
                    <p className="font-mono text-xs text-[var(--color-text-muted)]">
                      {token} · {size}
                    </p>
                  </div>
                  <p className={`${className} text-[var(--color-text)]`}>
                    {sample}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text)]">
                  Tabular numerals
                </h3>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Equal-width digits keep numbers and timestamps aligned.
                </p>
              </div>
              <p className="font-mono text-xl font-semibold tabular-nums text-[var(--color-text)]">
                84 / 100
              </p>
            </div>
          </div>
        </DesignSection>

        <DesignSection id="colors" title="Colors" defaultOpen>
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Brand identity & source colors
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Logo Praktoteki oraz kolory bazowe (#c4ee2a, #06bcf9, #072141), z których wyliczono kontrastowe tokeny jasne i neutralnie ciemnoszary dark mode.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2 rounded-xl border border-[#e4e4e7] bg-[#ffffff] p-4">
                  <span className="text-xs font-semibold text-[#52525b]">
                    Wersja jasna (transparent SVG)
                  </span>
                  <BrandLogo size="lg" variant="light" />
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-[#34343a] bg-[#1d1d20] p-4">
                  <span className="text-xs font-semibold text-[#b8b8c0]">
                    Wersja ciemna (transparent SVG)
                  </span>
                  <BrandLogo size="lg" variant="dark" />
                </div>
              </div>
              <Palette colors={brandColors} />
            </div>

            <div className="space-y-3">
              <h3
                id="semantic-colors"
                className="text-sm font-semibold text-[var(--color-text)]"
              >
                Semantic colors
              </h3>
              <p className="text-sm text-[var(--color-text-muted)]">
                Semantic tokens automatically adapt across light, dark, high
                contrast, and grayscale modes.
              </p>
              <Palette colors={semanticColors} />
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                App neutrals
              </h3>
              <Palette colors={neutralColors} />
            </div>
          </div>
        </DesignSection>

        <DesignSection id="spacing" title="Spacing">
          <ul className="space-y-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4">
            {spacingScale.map(({ step, px, use }) => (
              <li
                key={step}
                className="grid grid-cols-[72px_64px_minmax(0,1fr)] items-center gap-3 text-sm"
              >
                <code className="font-mono text-xs text-[var(--color-text-muted)]">
                  space-{step}
                </code>
                <span className="font-mono text-xs text-[var(--color-text)]">
                  {px}
                </span>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 rounded-sm bg-[var(--color-accent)]"
                    style={{ width: px }}
                  />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {use}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </DesignSection>

        <DesignSection id="icons" title="Icons" defaultOpen>
          <IconExamples />
        </DesignSection>

        <DesignSection id="buttons" title="Buttons" defaultOpen>
          <ButtonExamples />
        </DesignSection>

        <DesignSection id="forms" title="Forms and controls" defaultOpen>
          <InputExamples />
        </DesignSection>

        <DesignSection id="lists" title="Lists">
          <ListExamples />
        </DesignSection>

        <DesignSection id="scoring-breakdown" title="Scoring breakdown">
          <ScoringBreakdownExamples />
        </DesignSection>

        <DesignSection id="tables" title="Tables" defaultOpen>
          <TableExamples />
        </DesignSection>

        <DesignSection id="cards-metrics" title="Cards and metrics">
          <CardExamples />
        </DesignSection>

        <DesignSection id="banners" title="Banners">
          <BannerExamples />
        </DesignSection>

        <DesignSection id="badges-status" title="Badges and status indicators">
          <BadgeExamples />
        </DesignSection>

        <DesignSection id="empty-states" title="Empty states">
          <EmptyStateExamples />
        </DesignSection>

        <DesignSection id="loading-states" title="Loading states">
          <LoadingStateExamples />
        </DesignSection>

        <DesignSection id="error-states" title="Error states">
          <ErrorStateExamples />
        </DesignSection>

        <DesignSection id="dialogs" title="Dialogs and confirmations">
          <DialogExamples />
        </DesignSection>

        <DesignSection id="sheets-modals" title="Sheets and drawers">
          <SheetExamples />
        </DesignSection>

        <DesignSection id="navigation-bars" title="Navigation bars">
          <NavigationExamples />
        </DesignSection>

        {futureSections.map(({ id, name, scope }) => (
          <DesignSection key={id} id={id} title={name} planned>
            <p className="text-sm text-[var(--color-text-muted)]">{scope}</p>
          </DesignSection>
        ))}
      </div>
    </GalleryShell>
  );
}
