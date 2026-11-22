import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import { ArrowDownIcon as PhosphorArrowDownIcon } from "@phosphor-icons/react/dist/ssr/ArrowDown";
import { ArrowLeftIcon as PhosphorArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon as PhosphorArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsDownUpIcon as PhosphorArrowsDownUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowsDownUp";
import { ArrowsLeftRightIcon as PhosphorArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { ArrowUpIcon as PhosphorArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { ArrowsClockwiseIcon as PhosphorArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { BuildingsIcon as PhosphorBuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { CaretDownIcon as PhosphorCaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon as PhosphorCaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon as PhosphorCaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ChartBarIcon as PhosphorChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { CheckIcon as PhosphorCheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircleIcon as PhosphorCheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleNotchIcon as PhosphorCircleNotchIcon } from "@phosphor-icons/react/dist/ssr/CircleNotch";
import { ClockIcon as PhosphorClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { DatabaseIcon as PhosphorDatabaseIcon } from "@phosphor-icons/react/dist/ssr/Database";
import { DotsThreeIcon as PhosphorDotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { EyeIcon as PhosphorEyeIcon } from "@phosphor-icons/react/dist/ssr/Eye";
import { FileCsvIcon as PhosphorFileCsvIcon } from "@phosphor-icons/react/dist/ssr/FileCsv";
import { FilePdfIcon as PhosphorFilePdfIcon } from "@phosphor-icons/react/dist/ssr/FilePdf";
import { FunnelIcon as PhosphorFunnelIcon } from "@phosphor-icons/react/dist/ssr/Funnel";
import { GaugeIcon as PhosphorGaugeIcon } from "@phosphor-icons/react/dist/ssr/Gauge";
import { GearSixIcon as PhosphorGearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { GitMergeIcon as PhosphorGitMergeIcon } from "@phosphor-icons/react/dist/ssr/GitMerge";
import { InfoIcon as PhosphorInfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { ListIcon as PhosphorListIcon } from "@phosphor-icons/react/dist/ssr/List";
import { ListBulletsIcon as PhosphorListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { LockSimpleIcon as PhosphorLockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { MagnifyingGlassIcon as PhosphorMagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MinusIcon as PhosphorMinusIcon } from "@phosphor-icons/react/dist/ssr/Minus";
import { PlusIcon as PhosphorPlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ShareNetworkIcon as PhosphorShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { ShieldCheckIcon as PhosphorShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { SidebarSimpleIcon as PhosphorSidebarSimpleIcon } from "@phosphor-icons/react/dist/ssr/SidebarSimple";
import { SignInIcon as PhosphorSignInIcon } from "@phosphor-icons/react/dist/ssr/SignIn";
import { SignOutIcon as PhosphorSignOutIcon } from "@phosphor-icons/react/dist/ssr/SignOut";
import { SlidersHorizontalIcon as PhosphorSlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { SparkleIcon as PhosphorSparkleIcon } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SquaresFourIcon as PhosphorSquaresFourIcon } from "@phosphor-icons/react/dist/ssr/SquaresFour";
import { StarIcon as PhosphorStarIcon } from "@phosphor-icons/react/dist/ssr/Star";
import { TargetIcon as PhosphorTargetIcon } from "@phosphor-icons/react/dist/ssr/Target";
import { UserIcon as PhosphorUserIcon } from "@phosphor-icons/react/dist/ssr/User";
import { WarningIcon as PhosphorWarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon as PhosphorWarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { XIcon as PhosphorXIcon } from "@phosphor-icons/react/dist/ssr/X";

export type { IconProps, IconWeight } from "@phosphor-icons/react";

type UIIconProps = PhosphorIconProps;

export function SettingsIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorGearSixIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

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

export function SortArrowsIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowsDownUpIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ArrowUpIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowUpIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ArrowDownIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowDownIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ChevronLeftIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorCaretLeftIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function FilterIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorFunnelIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function DrawerIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSidebarSimpleIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function EyeIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorEyeIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ShieldCheckIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorShieldCheckIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function GitMergeIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorGitMergeIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function DatabaseIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorDatabaseIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function BuildingsIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorBuildingsIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function RefreshIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowsClockwiseIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function SignInIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSignInIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function SignOutIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSignOutIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function UserIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorUserIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ArrowLeftIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorArrowLeftIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function StarIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorStarIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function StarSlashedIcon({ size = 16, className }: Pick<UIIconProps, "size" | "className">) {
  const numericSize = typeof size === "number" ? size : 16;
  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d="M12 3.4l2.45 4.96 5.47.8-3.96 3.86.93 5.45L12 15.9l-4.89 2.57.93-5.45L4.08 9.16l5.47-.8L12 3.4Z" />
      <path d="M3.5 3.5l17 17" />
    </svg>
  );
}

export function ShareIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorShareNetworkIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function GridViewIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorSquaresFourIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ListViewIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorListBulletsIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ChartBarIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorChartBarIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function GaugeIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorGaugeIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function TargetIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorTargetIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function ClockIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorClockIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}

export function LockIcon({ size = 16, weight = "regular", ...props }: UIIconProps) {
  return <PhosphorLockSimpleIcon size={size} weight={weight} aria-hidden="true" focusable="false" {...props} />;
}
