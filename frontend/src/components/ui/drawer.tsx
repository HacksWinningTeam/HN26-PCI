"use client";

import { ModalSurface, type ModalSurfaceProps } from "./modal-surface";

export type DrawerProps = Omit<
  ModalSurfaceProps,
  "presentation" | "confirmAction" | "detents" | "initialDetent"
>;

/** Right-edge drawer on desktop (480px wide), falling back to a full-width bottom sheet on mobile. */
export function Drawer({ closeLabel = "Zamknij panel boczny", ...props }: DrawerProps) {
  return (
    <ModalSurface
      {...props}
      presentation="drawer"
      closeLabel={closeLabel}
    />
  );
}
