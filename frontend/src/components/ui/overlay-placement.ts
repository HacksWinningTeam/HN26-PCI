export type OverlayRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
};

export type OverlayViewport = {
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Fixed-position coordinates in the visual viewport, with an 8px safe edge. */
export function placeOverlay(
  anchor: OverlayRect,
  card: { width: number; height: number },
  viewport: OverlayViewport,
  preferTop = false,
) {
  const above = Math.max(0, anchor.top - viewport.top - 16);
  const below = Math.max(0, viewport.top + viewport.height - anchor.bottom - 16);
  const placeAbove = preferTop
    ? above >= card.height || above > below
    : below < card.height && above > below;

  return {
    left: Math.max(
      viewport.left + 8,
      Math.min(
        anchor.left + (preferTop ? (anchor.width - card.width) / 2 : 0),
        viewport.left + viewport.width - card.width - 8,
      ),
    ),
    top: Math.max(
      viewport.top + 8,
      Math.min(
        placeAbove ? anchor.top - card.height - 8 : anchor.bottom + 8,
        viewport.top + viewport.height - card.height - 8,
      ),
    ),
    maxHeight: Math.max(above, below),
  };
}
