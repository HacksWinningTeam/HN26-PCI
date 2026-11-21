export type SheetDetent = "small" | "medium" | "large";

const orderedDetents: readonly SheetDetent[] = ["small", "medium", "large"];

/** Keep only supplied stops, in height order, without duplicates. */
export function resolveSheetDetents(
  detents: readonly SheetDetent[] = [],
): SheetDetent[] {
  return orderedDetents.filter((detent) => detents.includes(detent));
}

/** Use measured CSS heights so snapping respects safe areas and short viewports. */
export function nearestSheetDetent(
  height: number,
  stops: readonly { detent: SheetDetent; height: number }[],
): SheetDetent {
  return stops.reduce((nearest, stop) =>
    Math.abs(stop.height - height) < Math.abs(nearest.height - height)
      ? stop
      : nearest,
  ).detent;
}

export function sheetDetentForKey(
  key: string,
  current: SheetDetent,
  detents: readonly SheetDetent[],
): SheetDetent | undefined {
  const index = detents.indexOf(current);
  switch (key) {
    case "ArrowUp":
    case "ArrowRight":
      return detents[Math.min(index + 1, detents.length - 1)];
    case "ArrowDown":
    case "ArrowLeft":
      return detents[Math.max(index - 1, 0)];
    case "Home":
      return detents[0];
    case "End":
      return detents[detents.length - 1];
    default:
      return undefined;
  }
}
