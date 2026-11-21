"use client";

import { useState, type ComponentType } from "react";
import {
  ArrowRightIcon,
  BrandBinocularsIcon,
  BrandBlobCyanIcon,
  BrandBlobLimeIcon,
  BrandBlobSoftBlueIcon,
  BrandBookmarkIcon,
  BrandCardsIcon,
  BrandChecklistIcon,
  BrandCurveLimeIcon,
  BrandCyanBurstIcon,
  BrandLayersIcon,
  BrandLightbulbIcon,
  BrandLimeBurstIcon,
  BrandMagnifierIcon,
  BrandPillCheckIcon,
  BrandPillClockIcon,
  BrandPillDotsIcon,
  BrandPhoto,
  BrandRocketIcon,
  BrandScalesIcon,
  BrandSearchIdeaIcon,
  BrandSearchQuestionIcon,
  BrandSparklesIcon,
  BrandTargetIcon,
  BrandUserIcon,
  BrandVerifiedSealIcon,
  CheckCircleIcon,
  CompareIcon,
  CsvIcon,
  ErrorCircleIcon,
  PdfIcon,
  PlusIcon,
  SearchIcon,
  SegmentedControl,
  SlidersIcon,
  SparkleIcon,
  WarningIcon,
  type BrandIconProps,
  type IconWeight,
} from "@/components/ui";

const ICON_SAMPLES = [
  { name: "SearchIcon", Component: SearchIcon },
  { name: "SlidersIcon", Component: SlidersIcon },
  { name: "CompareIcon", Component: CompareIcon },
  { name: "SparkleIcon", Component: SparkleIcon },
  { name: "PdfIcon", Component: PdfIcon },
  { name: "CsvIcon", Component: CsvIcon },
  { name: "PlusIcon", Component: PlusIcon },
  { name: "ArrowRightIcon", Component: ArrowRightIcon },
  { name: "CheckCircleIcon", Component: CheckCircleIcon },
  { name: "WarningIcon", Component: WarningIcon },
  { name: "ErrorCircleIcon", Component: ErrorCircleIcon },
] as const;

type BrandIconEntry = {
  name: string;
  label: string;
  Component: ComponentType<BrandIconProps>;
};

const BRAND_ICON_GROUPS: readonly {
  title: string;
  items: readonly BrandIconEntry[];
}[] = [
  {
    title: "Odkrywanie i nawigacja",
    items: [
      { name: "BrandBinocularsIcon", label: "Przeglądaj radar", Component: BrandBinocularsIcon },
      { name: "BrandSearchIdeaIcon", label: "Szukaj rozwiązania", Component: BrandSearchIdeaIcon },
      { name: "BrandSearchQuestionIcon", label: "Opisz problem", Component: BrandSearchQuestionIcon },
      { name: "BrandTargetIcon", label: "Cel wdrożenia", Component: BrandTargetIcon },
      { name: "BrandLayersIcon", label: "Poziomy informacji", Component: BrandLayersIcon },
      { name: "BrandMagnifierIcon", label: "Lupa", Component: BrandMagnifierIcon },
    ],
  },
  {
    title: "Funkcje i proces wdrożenia",
    items: [
      { name: "BrandScalesIcon", label: "Porównanie", Component: BrandScalesIcon },
      { name: "BrandRocketIcon", label: "Start wdrożenia", Component: BrandRocketIcon },
      { name: "BrandBookmarkIcon", label: "Zapisane", Component: BrandBookmarkIcon },
      { name: "BrandUserIcon", label: "Profil organizacji", Component: BrandUserIcon },
      { name: "BrandLightbulbIcon", label: "Innowacja", Component: BrandLightbulbIcon },
      { name: "BrandChecklistIcon", label: "Plan pięciofazowy", Component: BrandChecklistIcon },
      { name: "BrandCardsIcon", label: "Karty innowacji", Component: BrandCardsIcon },
      { name: "BrandVerifiedSealIcon", label: "Zweryfikowano PCI", Component: BrandVerifiedSealIcon },
    ],
  },
  {
    title: "Pigułki statusów i akcenty dekoracyjne",
    items: [
      { name: "BrandPillCheckIcon", label: "Ukończono", Component: BrandPillCheckIcon },
      { name: "BrandPillClockIcon", label: "W trakcie", Component: BrandPillClockIcon },
      { name: "BrandPillDotsIcon", label: "Więcej", Component: BrandPillDotsIcon },
      { name: "BrandLimeBurstIcon", label: "Akcent Lime", Component: BrandLimeBurstIcon },
      { name: "BrandCyanBurstIcon", label: "Akcent Cyan", Component: BrandCyanBurstIcon },
      { name: "BrandSparklesIcon", label: "Iskry", Component: BrandSparklesIcon },
      { name: "BrandBlobSoftBlueIcon", label: "Plama błękitna", Component: BrandBlobSoftBlueIcon },
      { name: "BrandBlobLimeIcon", label: "Plama Lime", Component: BrandBlobLimeIcon },
      { name: "BrandBlobCyanIcon", label: "Plama Cyan", Component: BrandBlobCyanIcon },
      { name: "BrandCurveLimeIcon", label: "Podkreślenie Lime", Component: BrandCurveLimeIcon },
    ],
  },
];

type PreviewAppearance = "active" | "light" | "dark" | "hc-black-white" | "hc-black-yellow" | "grayscale";

export default function IconExamples() {
  const [weight, setWeight] = useState<IconWeight>("regular");
  const [brandSize, setBrandSize] = useState<"36" | "48" | "64">("48");
  const [previewAppearance, setPreviewAppearance] = useState<PreviewAppearance>("active");

  return (
    <div className="space-y-8">
      {/* Custom Brand SVG Set */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Zestaw custom ikon Praktoteki (Light / Dark / High Contrast)
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              24 wektorowe ikony i akcenty SVG sterowane tokenami <code>--brand-icon-*</code> w{" "}
              <code>globals.css</code> — automatycznie adaptują się do aktywnego trybu (Light, Dark, HC B&amp;W, HC B&amp;Y, Grayscale).
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <SegmentedControl
              label="Podgląd wariantu"
              value={previewAppearance}
              onValueChange={(val) => setPreviewAppearance(val as PreviewAppearance)}
              options={[
                { value: "active", label: "Aktywny" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "hc-black-white", label: "HC B&W" },
                { value: "hc-black-yellow", label: "HC B&Y" },
                { value: "grayscale", label: "Grayscale" },
              ]}
            />
            <SegmentedControl
              label="Rozmiar ikon"
              value={brandSize}
              onValueChange={(val) => setBrandSize(val as "36" | "48" | "64")}
              options={[
                { value: "36", label: "36 px" },
                { value: "48", label: "48 px" },
                { value: "64", label: "64 px" },
              ]}
            />
          </div>
        </div>

        <div
          data-icon-preview={previewAppearance === "active" ? undefined : previewAppearance}
          className={[
            "space-y-6",
            previewAppearance !== "active" &&
              "rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-canvas)] p-4",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {BRAND_ICON_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2.5">
              <h4 className="text-xs font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
                {group.title}
              </h4>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.items.map(({ name, label, Component }) => (
                  <li
                    key={name}
                    className="flex flex-col items-center justify-between gap-2.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-center"
                  >
                    <div className="flex min-h-16 items-center justify-center">
                      <Component size={Number(brandSize)} />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-semibold text-[var(--color-text)]">
                        {label}
                      </p>
                      <code className="block font-mono text-[10px] text-[var(--color-text-muted)]">
                        {name}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-[var(--color-text)]">Organiczne ramki na zdjęcia</h4>
            <div className="grid gap-8 px-4 py-6 md:grid-cols-3">
              <figure className="space-y-4">
                <BrandPhoto src="/design-system/technology.jpg" alt="Zbliżenie na układy elektroniczne" shape="pebble" accent="cyan" accentPosition="bottom-left" />
                <figcaption className="text-center text-xs text-[var(--color-text-muted)]">Pebble · Cyan</figcaption>
              </figure>
              <figure className="space-y-4">
                <BrandPhoto src="/design-system/workplace.jpg" alt="Jasna przestrzeń biurowa z roślinami" shape="arch" accent="lime" />
                <figcaption className="text-center text-xs text-[var(--color-text-muted)]">Arch · Lime</figcaption>
              </figure>
              <figure className="space-y-4">
                <BrandPhoto src="/design-system/team.jpg" alt="Zespół współpracujący przy stole" shape="hillside" accent="cyan" />
                <figcaption className="text-center text-xs text-[var(--color-text-muted)]">Hillside · Cyan</figcaption>
              </figure>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">Zdjęcia demonstracyjne: Unsplash. Ramki przycinają obraz; akcenty dopasowują się do wybranego motywu.</p>
          </div>
        </div>
      </div>

      {/* Phosphor UI icons */}
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Ikony interfejsu (@phosphor-icons/react)
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Zestaw <code>@phosphor-icons/react</code> (licencja MIT, zgodna z EUPL-1.2) owinięty w{" "}
              <code>@/components/ui/icons</code> z domyślnym <code>aria-hidden=&quot;true&quot;</code>.
            </p>
          </div>

          <SegmentedControl
            label="Grubość linii ikon Phosphor"
            value={weight}
            onValueChange={(val) => setWeight(val as IconWeight)}
            options={[
              { value: "light", label: "Light" },
              { value: "regular", label: "Regular" },
              { value: "bold", label: "Bold" },
              { value: "duotone", label: "Duotone" },
            ]}
          />
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {ICON_SAMPLES.map(({ name, Component }) => (
            <li
              key={name}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-center"
            >
              <Component size={24} weight={weight} className="text-[var(--color-text)]" />
              <code className="font-mono text-[11px] text-[var(--color-text-muted)]">
                {name}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
