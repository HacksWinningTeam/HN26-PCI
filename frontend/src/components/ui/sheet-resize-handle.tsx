"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  nearestSheetDetent,
  sheetDetentForKey,
  type SheetDetent,
} from "./sheet-detents";
import styles from "./sheet.module.css";

type Drag = {
  pointerId: number;
  startY: number;
  startHeight: number;
  stops: { detent: SheetDetent; height: number }[];
  moved: boolean;
};

function measureStops(
  element: HTMLDialogElement,
  detents: readonly SheetDetent[],
) {
  const probe = element.cloneNode(false) as HTMLDialogElement;
  probe.setAttribute("open", "");
  probe.setAttribute("inert", "");
  probe.setAttribute("aria-hidden", "true");
  probe.style.setProperty("visibility", "hidden");
  probe.style.setProperty("animation", "none");
  probe.style.setProperty("transition", "none");
  probe.style.removeProperty("--sheet-drag-height");
  element.append(probe);
  try {
    return detents.map((detent) => {
      probe.setAttribute("data-detent", detent);
      return { detent, height: probe.getBoundingClientRect().height };
    });
  } finally {
    probe.remove();
  }
}

const DETENT_LABELS: Record<SheetDetent, string> = {
  small: "Mały arkusz",
  medium: "Średni arkusz",
  large: "Duży arkusz",
};

/** Drag/tap/keyboard resize handle for mobile bottom sheets with detents. */
export function SheetResizeHandle({
  dialogRef,
  detents,
  initialDetent,
  busy,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  detents: readonly SheetDetent[];
  initialDetent?: SheetDetent;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<SheetDetent>(
    initialDetent && detents.includes(initialDetent)
      ? initialDetent
      : detents[0],
  );
  const handle = useRef<HTMLButtonElement>(null);
  const drag = useRef<Drag | null>(null);
  const suppressClick = useRef(false);

  const cancelDrag = useCallback(() => {
    if (drag.current?.moved) suppressClick.current = true;
    const pointerId = drag.current?.pointerId;
    drag.current = null;
    if (pointerId !== undefined && handle.current?.hasPointerCapture(pointerId)) {
      handle.current.releasePointerCapture(pointerId);
    }
    dialogRef.current?.style.removeProperty("--sheet-drag-height");
    dialogRef.current?.removeAttribute("data-resizing");
  }, [dialogRef]);

  useEffect(() => {
    const element = dialogRef.current;
    if (!element) return;
    element.setAttribute("data-detent", selected);
    if (detents.length > 1) element.setAttribute("data-resizable", "true");
    return () => {
      cancelDrag();
      element.removeAttribute("data-detent");
      element.removeAttribute("data-resizable");
    };
  }, [dialogRef, selected, detents.length, cancelDrag]);

  useEffect(() => {
    if (busy) cancelDrag();
    window.addEventListener("resize", cancelDrag);
    window.visualViewport?.addEventListener("resize", cancelDrag);
    return () => {
      window.removeEventListener("resize", cancelDrag);
      window.visualViewport?.removeEventListener("resize", cancelDrag);
    };
  }, [busy, cancelDrag]);

  function selectDetent(detent: SheetDetent) {
    dialogRef.current?.setAttribute("data-detent", detent);
    setSelected(detent);
  }

  function beginDrag(event: PointerEvent<HTMLButtonElement>) {
    const element = dialogRef.current;
    if (
      !element ||
      busy ||
      !event.isPrimary ||
      event.button !== 0 ||
      !window.matchMedia("(max-width: 600px)").matches
    ) {
      return;
    }
    suppressClick.current = false;
    const startHeight = element.getBoundingClientRect().height;
    element.setAttribute("data-resizing", "true");
    const stops = measureStops(element, detents);
    element.style.setProperty("--sheet-drag-height", `${startHeight}px`);
    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight,
      stops,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragHeight(event: PointerEvent<HTMLButtonElement>, gesture: Drag) {
    const delta = gesture.startY - event.clientY;
    gesture.moved ||= Math.abs(delta) > 4;
    return Math.max(
      gesture.stops[0].height,
      Math.min(
        gesture.stops[gesture.stops.length - 1].height,
        gesture.startHeight + delta,
      ),
    );
  }

  if (detents.length < 2) return null;

  return (
    <button
      ref={handle}
      type="button"
      role="slider"
      className={styles.resizeHandle}
      aria-label="Zmień rozmiar arkusza"
      aria-orientation="vertical"
      aria-valuemin={1}
      aria-valuemax={detents.length}
      aria-valuenow={detents.indexOf(selected) + 1}
      aria-valuetext={DETENT_LABELS[selected]}
      title="Przeciągnij, kliknij lub użyj strzałek, aby zmienić rozmiar arkusza."
      disabled={busy}
      onPointerDown={beginDrag}
      onPointerMove={(event) => {
        const gesture = drag.current;
        if (gesture?.pointerId !== event.pointerId) return;
        dialogRef.current?.style.setProperty(
          "--sheet-drag-height",
          `${dragHeight(event, gesture)}px`,
        );
      }}
      onPointerUp={(event) => {
        const gesture = drag.current;
        if (gesture?.pointerId !== event.pointerId) return;
        const height = dragHeight(event, gesture);
        suppressClick.current = gesture.moved;
        if (gesture.moved) {
          selectDetent(nearestSheetDetent(height, gesture.stops));
        }
        cancelDrag();
      }}
      onPointerCancel={() => {
        suppressClick.current = true;
        cancelDrag();
      }}
      onLostPointerCapture={() => {
        if (drag.current) {
          suppressClick.current = true;
          cancelDrag();
        }
      }}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        selectDetent(detents[(detents.indexOf(selected) + 1) % detents.length]);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && drag.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = true;
          cancelDrag();
          return;
        }
        const next = sheetDetentForKey(event.key, selected, detents);
        if (next) {
          event.preventDefault();
          cancelDrag();
          selectDetent(next);
        }
      }}
    >
      <span aria-hidden="true" />
    </button>
  );
}
