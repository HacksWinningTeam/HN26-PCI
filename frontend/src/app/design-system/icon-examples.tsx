"use client";

import { useState } from "react";
import {
  ArrowRightIcon,
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

export default function IconExamples() {
  const [weight, setWeight] = useState<IconWeight>("regular");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-text-muted)]">
          Zestaw <code>@phosphor-icons/react</code> (licencja MIT, zgodna z EUPL-1.2) owinięty w{" "}
          <code>@/components/ui/icons</code> z domyślnym <code>aria-hidden=&quot;true&quot;</code>.
        </p>

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
  );
}
