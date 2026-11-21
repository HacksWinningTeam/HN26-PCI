"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { IconButton } from "./button";
import { CheckIcon, CloseIcon } from "./icons";
import { resolveSheetDetents, type SheetDetent } from "./sheet-detents";
import { SheetResizeHandle } from "./sheet-resize-handle";
import styles from "./sheet.module.css";

export type SheetConfirmAction = {
  label: string;
  /** Submit a form inside the sheet body, preserving native validation. */
  form?: string;
  onSelect?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export type ModalSurfaceProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Optional contextual navigation beneath the drawer heading. */
  headerAccessory?: ReactNode;
  confirmAction?: SheetConfirmAction;
  /** Optional mobile-only heights; multiple stops enable the drag handle. */
  detents?: readonly SheetDetent[];
  initialDetent?: SheetDetent;
  presentation?: "sheet" | "drawer";
  "aria-describedby"?: string;
  closeLabel?: string;
  /** Reset body scroll when displayed record changes. */
  contentKey?: string | number;
  /** Fallback focus target when opener was removed or disabled. */
  returnFocus?: () => void;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  /** Prevent dismissal while saving. */
  busy?: boolean;
};

export function ModalSurface({
  open,
  title,
  children,
  headerAccessory,
  confirmAction,
  detents,
  initialDetent,
  onClose,
  closeOnBackdrop = true,
  busy = false,
  presentation = "sheet",
  "aria-describedby": describedBy,
  closeLabel,
  contentKey,
  returnFocus,
}: ModalSurfaceProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const restoreFocus = useRef(returnFocus);
  useLayoutEffect(() => {
    restoreFocus.current = returnFocus;
  }, [returnFocus]);
  const pointerStartedOutside = useRef(false);
  const titleId = useId();
  const availableDetents = resolveSheetDetents(detents);

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    if (!element.open) {
      element.showModal();
    }
    document.body.style.overflow = "hidden";
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && element.contains(focused)) {
      focused.blur();
    }
    return () => {
      if (element.open) element.close();
      document.body.style.overflow = overflow;
      pointerStartedOutside.current = false;
      if (
        opener instanceof HTMLElement &&
        opener.isConnected &&
        !opener.matches(":disabled")
      ) {
        opener.focus({ preventScroll: true });
      } else {
        restoreFocus.current?.();
      }
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !dialog.current?.open) return;
    body.current?.scrollTo(0, 0);
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      dialog.current.contains(focused) &&
      focused.matches(":disabled")
    ) {
      focused.blur();
    }
  }, [open, contentKey]);

  function outside(x: number, y: number) {
    const rect = dialog.current?.getBoundingClientRect();
    if (!rect) return false;
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  }

  return (
    <dialog
      ref={dialog}
      className={styles.sheet}
      data-presentation={presentation}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      aria-busy={busy || undefined}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onClose();
      }}
      onPointerDown={(event) => {
        pointerStartedOutside.current =
          event.target === event.currentTarget &&
          outside(event.clientX, event.clientY);
      }}
      onPointerCancel={() => {
        pointerStartedOutside.current = false;
      }}
      onClick={(event) => {
        const dismiss =
          pointerStartedOutside.current &&
          event.target === event.currentTarget &&
          outside(event.clientX, event.clientY);
        pointerStartedOutside.current = false;
        if (dismiss && closeOnBackdrop && !busy) onClose();
      }}
    >
      {open && presentation === "sheet" && availableDetents.length > 0 ? (
        <SheetResizeHandle
          key={`${availableDetents.join(",")}:${initialDetent ?? ""}`}
          dialogRef={dialog}
          detents={availableDetents}
          initialDetent={initialDetent}
          busy={busy}
        />
      ) : null}

      <header
        className={[
          styles.header,
          presentation === "sheet" ? styles.sheetHeader : styles.drawerHeader,
        ].join(" ")}
      >
        {presentation === "sheet" ? (
          <IconButton
            variant="ghost"
            size="compact"
            aria-label={closeLabel ?? "Zamknij arkusz"}
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </IconButton>
        ) : null}

        <div className={styles.heading}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>

        {presentation === "sheet" && confirmAction ? (
          <div className={styles.confirmAction}>
            <IconButton
              variant="filled"
              size="compact"
              aria-label={confirmAction.label}
              type={confirmAction.form ? "submit" : "button"}
              form={confirmAction.form}
              disabled={busy || confirmAction.disabled}
              loading={confirmAction.loading}
              onClick={confirmAction.onSelect}
            >
              <CheckIcon size={16} />
            </IconButton>
          </div>
        ) : null}

        {presentation === "drawer" ? (
          <IconButton
            variant="ghost"
            size="compact"
            aria-label={closeLabel ?? "Zamknij panel boczny"}
            disabled={busy}
            onClick={onClose}
          >
            <CloseIcon size={16} />
          </IconButton>
        ) : null}

        {presentation === "drawer" && headerAccessory ? (
          <div className={styles.headerAccessory}>{headerAccessory}</div>
        ) : null}
      </header>

      <div ref={body} className={styles.body}>
        {children}
      </div>
    </dialog>
  );
}
