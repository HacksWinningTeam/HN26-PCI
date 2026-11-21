import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import { ArrowRightIcon as PhosphorArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsLeftRightIcon as PhosphorArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { CaretDownIcon as PhosphorCaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon as PhosphorCaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckIcon as PhosphorCheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircleIcon as PhosphorCheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleNotchIcon as PhosphorCircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { DotsThreeIcon as PhosphorDotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { FileCsvIcon as PhosphorFileCsvIcon } from "@phosphor-icons/react/dist/ssr/FileCsv";
import { FilePdfIcon as PhosphorFilePdfIcon } from "@phosphor-icons/react/dist/ssr/FilePdf";
import { InfoIcon as PhosphorInfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { ListIcon as PhosphorListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { MagnifyingGlassIcon as PhosphorMagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MinusIcon as PhosphorMinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";
import { PlusIcon as PhosphorPlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { SlidersHorizontalIcon as PhosphorSlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { SparkleIcon as PhosphorSparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { WarningIcon as PhosphorWarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon as PhosphorWarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { XIcon as PhosphorXIcon } from "@phosphor-icons/react/dist/ssr/X";

export type { IconProps, IconWeight } from "@phosphor-icons/react";

type UIIconProps = PhosphorIconProps;

export function SearchIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorMagnifyingGlassIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function CloseIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorXIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ChevronDownIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorCaretDownIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ChevronRightIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorCaretRightIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function CheckIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorCheckIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function MinusIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorMinusIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function PlusIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorPlusIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ArrowRightIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowRightIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function InfoIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorInfoIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function CheckCircleIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorCheckCircleIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function WarningIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorWarningIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ErrorCircleIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorWarningCircleIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function SpinnerIcon({ size = 16, weight = "regular", className, ...props }: UIIconProps) {
  return (
    <PhosphorCircleNotchIcon
      size={size}
      weight={weight}
      aria-hidden="true"
      focusable="false"
      className={["animate-spin", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function DotsIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorDotsThreeIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function MenuIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorListIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function SparkleIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSparkleIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function SlidersIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSlidersHorizontalIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function CompareIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowsLeftRightIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function PdfIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorFilePdfIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function CsvIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorFileCsvIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}
