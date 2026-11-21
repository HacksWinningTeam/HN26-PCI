"use client";

import Image, { type ImageProps } from "next/image";
import { useId } from "react";
import { BrandCyanBurstIcon, BrandLimeBurstIcon } from "./brand-icons";

const SHAPES = {
  pebble: "M.04 .42C.07 .17 .3 .1 .57 .03C.82 -.02 .96 .12 .99 .44C1 .72 .89 .97 .66 .98C.42 1 .15 .99 .06 .8C.01 .69 .01 .54 .04 .42Z",
  arch: "M.01 .55C.02 .26 .13 .08 .37 .03C.61 -.03 .87 .11 .97 .4C1 .5 1 .66 .97 .79C.91 .98 .69 .99 .47 .99C.22 .99 .01 .97 .01 .76Z",
  hillside: "M.02 .39C.07 .16 .29 .13 .5 .07C.74 -.01 .86 .02 .94 .23C1 .42 1 .65 .94 .82C.87 1 .65 .99 .43 .99C.22 1 .04 .93 .02 .74C0 .63 0 .49 .02 .39Z",
} as const;

export type BrandPhotoProps = {
  src: ImageProps["src"];
  alt: string;
  shape?: keyof typeof SHAPES;
  accent?: "cyan" | "lime" | "none";
  accentPosition?: "top-right" | "bottom-left";
  objectPosition?: string;
  sizes?: string;
  className?: string;
};

/** Organic photo crop; accents stay outside the mask and inherit theme tokens. */
export function BrandPhoto({
  src,
  alt,
  shape = "pebble",
  accent = "cyan",
  accentPosition = "top-right",
  objectPosition = "center",
  sizes = "(max-width: 767px) 100vw, 33vw",
  className,
}: BrandPhotoProps) {
  const clipId = `brand-photo-${useId().replace(/:/g, "")}`;
  const Burst = accent === "lime" ? BrandLimeBurstIcon : BrandCyanBurstIcon;

  return (
    <div className={["relative isolate w-full", className].filter(Boolean).join(" ")}>
      <svg width="0" height="0" className="absolute" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="objectBoundingBox">
            <path d={SHAPES[shape]} />
          </clipPath>
        </defs>
      </svg>
      <div
        className="relative aspect-[1.85] w-full bg-[var(--color-surface-raised)]"
        style={{ clipPath: `url(#${clipId})` }}
      >
        <Image src={src} alt={alt} fill sizes={sizes} className="brand-photo-image object-cover" style={{ objectPosition }} />
      </div>
      {accent !== "none" && (
        <Burst
          size={56}
          className={[
            "pointer-events-none absolute h-auto w-[18%]",
            accentPosition === "top-right"
              ? "-top-[4%] -right-[3%] rotate-45"
              : "-bottom-[2%] -left-[6%] -rotate-[65deg]",
          ].join(" ")}
        />
      )}
    </div>
  );
}
