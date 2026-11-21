"use client";

import { ModalSurface, type ModalSurfaceProps } from "./modal-surface";

export type { SheetDetent } from "./sheet-detents";
export type { SheetConfirmAction } from "./modal-surface";

export type SheetProps = Omit<
  ModalSurfaceProps,
  "presentation" | "headerAccessory" | "contentKey" | "returnFocus" | "aria-describedby"
>;

/** Centered modal sheet on desktop (640x640px) and bottom sheet with optional detents on mobile. */
export function Sheet(props: SheetProps) {
  return <ModalSurface {...props} />;
}
