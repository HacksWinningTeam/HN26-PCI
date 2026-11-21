"use client";

import { useId, type SVGProps } from "react";

export type BrandIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
};

const STROKE = "var(--brand-icon-stroke)";
const SURFACE = "var(--brand-icon-surface)";
const ICE = "var(--brand-icon-ice)";
const ICE_SOFT = "var(--brand-icon-ice-soft)";
const LIME = "var(--brand-icon-lime)";
const LIME_BORDER = "var(--brand-icon-lime-border)";
const LIME_SOFT = "var(--brand-icon-lime-soft)";
const LIME_SOFT_BORDER = "var(--brand-icon-lime-soft-border)";
const CYAN = "var(--brand-icon-cyan)";
const CYAN_FILL = "var(--brand-icon-cyan-fill)";
const BLOB_OUTLINE = "var(--brand-icon-blob-outline)";
const ON_ACCENT = "var(--brand-icon-on-accent)";
const ON_LIME_SOFT = "var(--brand-icon-on-lime-soft)";
const ON_BULB = "var(--brand-icon-on-bulb)";
const BULB_TOP = "var(--brand-icon-bulb-top)";
const BULB_BOTTOM = "var(--brand-icon-bulb-bottom)";
const PILL_INFO_BG = "var(--brand-icon-pill-info-bg)";
const PILL_INFO_BORDER = "var(--brand-icon-pill-info-border)";
const PILL_INFO_FG = "var(--brand-icon-pill-info-fg)";
const LINE_MUTED = "var(--brand-icon-line-muted)";
const HIGHLIGHT = "var(--brand-icon-highlight)";

function svgProps(
  size: number,
  viewBox: string,
  props: BrandIconProps,
): SVGProps<SVGSVGElement> {
  const { width, height, ...rest } = props;
  return {
    width: width ?? size,
    height: height ?? size,
    viewBox,
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

/** Discovery binoculars over soft accent blob with lime bursts. */
export function BrandBinocularsIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 80 72", props)}>
      <path
        d="M11 43c-5-11 2-25 14-31 11-5 24-1 32 7 9 9 11 24 2 34-8 9-22 12-34 8-7-2-11-9-14-18Z"
        fill={ICE}
      />
      <path
        d="M52 14l4-7M59 19l8-4M61 27l7 1"
        stroke={LIME}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M27 24h7l3 7h6l3-7h7"
        stroke={STROKE}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 31l6-7h10l-3 15H17l4-8Zm38 0l-6-7H43l3 15h17l-4-8Z"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <rect
        x="35"
        y="30"
        width="10"
        height="11"
        rx="3"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3"
      />
      <circle cx="24" cy="45" r="12" fill={SURFACE} stroke={STROKE} strokeWidth="3.2" />
      <circle cx="56" cy="45" r="12" fill={SURFACE} stroke={STROKE} strokeWidth="3.2" />
      <circle cx="24" cy="45" r="7.5" fill={ICE} stroke={STROKE} strokeWidth="2.2" />
      <circle cx="56" cy="45" r="7.5" fill={ICE} stroke={STROKE} strokeWidth="2.2" />
      <path
        d="M20.5 42.5a4.5 4.5 0 0 1 5-1.5M52.5 42.5a4.5 4.5 0 0 1 5-1.5"
        stroke={HIGHLIGHT}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Magnifying glass containing an idea bulb with cyan bursts. */
export function BrandSearchIdeaIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 80 72", props)}>
      <path
        d="M56 13l4-7M63 18l8-4M65 26l7 1"
        stroke={CYAN}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M23 48L11 60"
        stroke={STROKE}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="38" cy="34" r="21" fill={ICE_SOFT} stroke={STROKE} strokeWidth="3.4" />
      <path
        d="M38 18v3M27 23l2.2 2.2M49 23l-2.2 2.2M23 34h3M53 34h-3"
        stroke={LIME}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M38 24.5a7.5 7.5 0 0 0-4.6 13.4c.9.8 1.6 1.8 1.6 3.1v1h6v-1c0-1.3.7-2.3 1.6-3.1A7.5 7.5 0 0 0 38 24.5Z"
        fill={SURFACE}
        stroke={LIME}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M35.5 45.5h5M36.5 48.5h3"
        stroke={LIME}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Magnifying glass with a lime question mark. */
export function BrandSearchQuestionIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 72", props)}>
      <path
        d="M23 48L11 60"
        stroke={STROKE}
        strokeWidth="6.5"
        strokeLinecap="round"
      />
      <circle cx="39" cy="33" r="21" fill={ICE_SOFT} stroke={STROKE} strokeWidth="3.4" />
      <path
        d="M33.5 27.5c0-3.2 2.5-5.5 5.8-5.5 3.3 0 5.7 2.1 5.7 5 0 2.4-1.4 3.7-3.4 4.8-1.6.9-2.4 1.8-2.4 3.5v.8"
        stroke={LIME}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <circle cx="39.2" cy="42.5" r="2.4" fill={LIME} />
    </svg>
  );
}

/** Bullseye target with lime-fletched arrow. */
export function BrandTargetIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 72", props)}>
      <circle cx="34" cy="38" r="24" fill={STROKE} />
      <circle cx="34" cy="38" r="18" fill={SURFACE} />
      <circle cx="34" cy="38" r="12" fill={STROKE} />
      <circle cx="34" cy="38" r="6" fill={SURFACE} />
      <circle cx="34" cy="38" r="2.6" fill={LIME} />
      <path
        d="M34 38L56 16"
        stroke={SURFACE}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M52 12l3 8 8 3-7 7-8-3-3-8 7-7Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M34 38L56 16"
        stroke={STROKE}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Stacked surface, lime, and cyan isometric layers. */
export function BrandLayersIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 72", props)}>
      <path
        d="M36 37L12 48l24 11 24-11-24-11Z"
        fill={CYAN_FILL}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 25L12 36l24 11 24-11-24-11Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M36 13L12 24l24 11 24-11-24-11Z"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Classic magnifying glass. */
export function BrandMagnifierIcon({ size = 44, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 64 64", props)}>
      <path
        d="M41 41l13 13"
        stroke={STROKE}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="27" cy="27" r="17" fill={ICE_SOFT} stroke={STROKE} strokeWidth="3.4" />
      <path
        d="M19 21a10 10 0 0 1 11-3"
        stroke={HIGHLIGHT}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Comparison balance scales with lime pans. */
export function BrandScalesIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 64", props)}>
      <path
        d="M36 12v40M24 52h24M16 18h40"
        stroke={STROKE}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M16 18l-8 18h16l-8-18Zm40 0l-8 18h16l-8-18Z"
        stroke={STROKE}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 36a8.5 8.5 0 0 0 17 0h-17Zm40 0a8.5 8.5 0 0 0 17 0h-17Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Launch rocket with lime window and cyan smoke trail. */
export function BrandRocketIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 72", props)}>
      <path
        d="M13 58c1-5 5-8 10-7 2-4 7-6 11-4 4-3 10-2 12 3 4 0 7 4 6 8H13Z"
        fill={ICE}
      />
      <path
        d="M17 57c3-3 7-3 10-1 3-3 8-3 11 0"
        stroke={CYAN}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M27 42l-5 8 8-5"
        fill={LIME}
        stroke={LIME}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M33 27l-9 2 4 8M44 38l-2 9-8-4"
        fill={ICE}
        stroke={STROKE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M55 14c-11 1-20 8-26 19l9 9c11-6 18-15 19-26 0-1.1-.9-2-2-2Z"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M46 17c3.5 1.5 6.5 4.5 8 8"
        stroke={STROKE}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="42" cy="29" r="4.5" fill={LIME} stroke={STROKE} strokeWidth="2.6" />
    </svg>
  );
}

/** Double bookmark with lime accent sheet. */
export function BrandBookmarkIcon({ size = 44, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 64 64", props)}>
      <path
        d="M25 11h20a4 4 0 0 1 4 4v37l-12-8-12 8V15a4 4 0 0 1 4-4Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M15 15a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v37l-14-9-14 9V15Z"
        fill={ICE_SOFT}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** User avatar with cyan shoulders. */
export function BrandUserIcon({ size = 44, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 64 64", props)}>
      <circle cx="32" cy="21" r="10" fill={ICE_SOFT} stroke={STROKE} strokeWidth="3.2" />
      <path
        d="M14 51c0-9.9 8.1-17 18-17s18 7.1 18 17a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3Z"
        fill={CYAN_FILL}
        stroke={STROKE}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lit lightbulb with lime rays and cyan/lime base. */
export function BrandLightbulbIcon({ size = 48, ...props }: BrandIconProps) {
  const gradientId = `praktoteka-bulb-${useId().replace(/:/g, "")}`;
  return (
    <svg {...svgProps(size, "0 0 64 72", props)}>
      <defs>
        <linearGradient id={gradientId} x1="32" y1="16" x2="32" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={BULB_TOP} />
          <stop offset="100%" stopColor={BULB_BOTTOM} />
        </linearGradient>
      </defs>
      <path
        d="M32 6v6M17 12l4 4M47 12l-4 4M10 27h6M54 27h-6"
        stroke={LIME}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M32 16a14 14 0 0 0-8.6 25c1.8 1.5 2.6 3.1 2.6 5.5v1.5h12v-1.5c0-2.4.8-4 2.6-5.5A14 14 0 0 0 32 16Z"
        fill={`url(#${gradientId})`}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M29 48V34c0-2 2.5-2 3 0 .5-2 3-2 3 0v14"
        stroke={ON_BULB}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="26" y="48" width="12" height="5" rx="2" fill={LIME} stroke={STROKE} strokeWidth="2.6" />
      <rect x="27.5" y="53" width="9" height="4.5" rx="2" fill={CYAN_FILL} stroke={STROKE} strokeWidth="2.6" />
      <path d="M29.5 58h5" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Checklist clipboard with lime clip and three check rows. */
export function BrandChecklistIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 64 72", props)}>
      <rect
        x="13"
        y="14"
        width="38"
        height="48"
        rx="6"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3.2"
      />
      <path
        d="M25 12a7 7 0 0 1 14 0v4H25v-4Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M21 28l2.5 2.5 4.5-4.5M21 38l2.5 2.5 4.5-4.5M21 48l2.5 2.5 4.5-4.5"
        stroke={STROKE}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 28h12M32 38h12M32 48h10"
        stroke={LINE_MUTED}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Paired innovation cards with cyan back card and lime badge. */
export function BrandCardsIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 76 64", props)}>
      <rect
        x="22"
        y="12"
        width="42"
        height="34"
        rx="6"
        transform="rotate(-8 43 29)"
        fill={CYAN_FILL}
        stroke={STROKE}
        strokeWidth="3"
      />
      <rect
        x="10"
        y="18"
        width="44"
        height="34"
        rx="6"
        fill={SURFACE}
        stroke={STROKE}
        strokeWidth="3"
      />
      <rect x="16" y="25" width="11" height="10" rx="2.5" fill={LIME} />
      <path
        d="M32 27h16M32 33h14M16 42h28"
        stroke={LINE_MUTED}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Scalloped verification seal with contrasting checkmark. */
export function BrandVerifiedSealIcon({ size = 44, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 64 64", props)}>
      <path
        d="M32 8l5.2 3.8 6.4-.8 2.8 5.8 5.8 2.8-.8 6.4 3.8 5.2-3.8 5.2.8 6.4-5.8 2.8-2.8 5.8-6.4-.8L32 56l-5.2-3.8-6.4.8-2.8-5.8-5.8-2.8.8-6.4L8.8 32l3.8-5.2-.8-6.4 5.8-2.8 2.8-5.8 6.4.8L32 8Z"
        fill={LIME}
        stroke={STROKE}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="M23 32.5l6 6 12.5-13"
        stroke={ON_ACCENT}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Lime status pill with centered checkmark. */
export function BrandPillCheckIcon({ size = 48, ...props }: BrandIconProps) {
  const width = Math.round(size * 1.45);
  const height = Math.round(size * 0.725);
  return (
    <svg {...svgProps(size, "0 0 76 38", { ...props, width, height })}>
      <rect x="2" y="2" width="72" height="34" rx="17" fill={LIME} stroke={LIME_BORDER} strokeWidth="1.5" />
      <path
        d="M30.5 19.5l5 5 11-11.5"
        stroke={ON_ACCENT}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Info status pill with centered clock icon. */
export function BrandPillClockIcon({ size = 48, ...props }: BrandIconProps) {
  const width = Math.round(size * 1.45);
  const height = Math.round(size * 0.725);
  return (
    <svg {...svgProps(size, "0 0 76 38", { ...props, width, height })}>
      <rect x="2" y="2" width="72" height="34" rx="17" fill={PILL_INFO_BG} stroke={PILL_INFO_BORDER} strokeWidth="1.5" />
      <circle cx="38" cy="19" r="9" stroke={PILL_INFO_FG} strokeWidth="2.4" />
      <path
        d="M38 14.5V19l3.2 2"
        stroke={PILL_INFO_FG}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Soft lime status pill with three centered dots. */
export function BrandPillDotsIcon({ size = 48, ...props }: BrandIconProps) {
  const width = Math.round(size * 1.45);
  const height = Math.round(size * 0.725);
  return (
    <svg {...svgProps(size, "0 0 76 38", { ...props, width, height })}>
      <rect x="2" y="2" width="72" height="34" rx="17" fill={LIME_SOFT} stroke={LIME_SOFT_BORDER} strokeWidth="1.5" />
      <circle cx="27" cy="19" r="3" fill={ON_LIME_SOFT} />
      <circle cx="38" cy="19" r="3" fill={ON_LIME_SOFT} />
      <circle cx="49" cy="19" r="3" fill={ON_LIME_SOFT} />
    </svg>
  );
}

/** Three-ray lime burst accent. */
export function BrandLimeBurstIcon({ size = 40, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 48 40", props)}>
      <path
        d="M11 26L6 17M24 22V10M35 26l6-9"
        stroke={LIME}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Three-ray cyan burst accent. */
export function BrandCyanBurstIcon({ size = 40, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 48 40", props)}>
      <path
        d="M11 26L6 17M24 22V10M35 26l6-9"
        stroke={CYAN}
        strokeWidth="4.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Trio of lime and cyan 4-point sparkles. */
export function BrandSparklesIcon({ size = 44, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 56 48", props)}>
      <path
        d="M20 7l3.5 11.5L35 22l-11.5 3.5L20 37l-3.5-11.5L5 22l11.5-3.5L20 7Z"
        fill={LIME}
      />
      <path
        d="M42 9l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6ZM41 29l1.8 5.2L48 36l-5.2 1.8L41 43l-1.8-5.2L34 36l5.2-1.8L41 29Z"
        fill={CYAN}
      />
    </svg>
  );
}

/** Soft accent organic pebble blob (outlined in high-contrast modes). */
export function BrandBlobSoftBlueIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 48", props)}>
      <path
        d="M11 33c-5-7 0-18 10-22 10-5 24-7 34-2 10 4 13 16 7 24-7 9-20 11-32 10-9-1-15-4-19-10Z"
        fill={ICE}
        stroke={BLOB_OUTLINE}
        strokeWidth="2.5"
      />
    </svg>
  );
}

/** Lime organic kidney blob. */
export function BrandBlobLimeIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 48", props)}>
      <path
        d="M10 30c-3-8 4-19 14-21 11-3 22 4 32 7 9 3 13 13 7 21-6 8-19 9-31 6-10-2-19-5-22-13Z"
        fill={LIME}
      />
    </svg>
  );
}

/** Cyan organic pebble blob. */
export function BrandBlobCyanIcon({ size = 48, ...props }: BrandIconProps) {
  return (
    <svg {...svgProps(size, "0 0 72 48", props)}>
      <path
        d="M9 28c-2-10 7-19 19-21 12-3 26 0 33 8 6 8 3 20-7 25-10 4-24 5-35 1-6-2-9-7-10-13Z"
        fill={CYAN}
      />
    </svg>
  );
}

/** Lime curved underline accent. */
export function BrandCurveLimeIcon({ size = 56, ...props }: BrandIconProps) {
  const height = Math.round((size * 28) / 80);
  return (
    <svg {...svgProps(size, "0 0 80 28", { ...props, width: size, height })}>
      <path
        d="M6 21c21-10 45-12 68-7"
        stroke={LIME}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
