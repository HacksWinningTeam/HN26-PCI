"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@/i18n/provider";
import { IconButton } from "./button";
import { CloseIcon } from "./icons";
import { placeOverlay } from "./overlay-placement";

const MOBILE_QUERY = "(max-width: 600px)";

function subscribeMobile(callback: () => void) {
  const media = matchMedia(MOBILE_QUERY);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

export type PopoverProps = {
  title: string;
  trigger: (props: ComponentPropsWithRef<"button">) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  width?: number;
  closeButton?: boolean;
  mobileModal?: boolean;
  className?: string;
  style?: CSSProperties;
};

/** Anchored floating card with viewport clamping, Escape/outside dismissal, and optional mobile modal. */
export function Popover({
  title,
  trigger: renderTrigger,
  children,
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  width = 320,
  closeButton = false,
  mobileModal = false,
  className,
  style,
}: PopoverProps) {
  const t = useTranslations();
  const [internal, setInternal] = useState(defaultOpen);
  const open = controlled ?? internal;
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setInternal(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );

  const anchor = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const skipRestore = useRef(false);
  const [host, setHost] = useState<Element | null>(null);
  const small = useSyncExternalStore(
    subscribeMobile,
    () => matchMedia(MOBILE_QUERY).matches,
    () => false,
  );
  const modal = mobileModal && small;
  const id = useId();

  const close = useCallback(() => setOpen(false), [setOpen]);
  const dismiss = useCallback(
    (restore = true) => {
      skipRestore.current = !restore;
      close();
      if (restore) anchor.current?.focus();
    },
    [close],
  );

  useLayoutEffect(() => {
    if (!open || modal) return;
    const element = layer.current;
    const trigger = anchor.current;
    if (!element || !trigger || !host) return;

    function position() {
      if (!element || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0;
      const top = viewport?.offsetTop ?? 0;
      const vw = viewport?.width ?? window.innerWidth;
      const vh = viewport?.height ?? window.innerHeight;
      element.style.width = `${Math.min(width, vw - 16)}px`;
      element.style.maxWidth = `${vw - 16}px`;
      const above = Math.max(0, rect.top - top - 16);
      const below = Math.max(0, top + vh - rect.bottom - 16);
      element.style.maxHeight = `${Math.max(above, below)}px`;
      const bounds = element.getBoundingClientRect();
      const placement = placeOverlay(rect, bounds, {
        left,
        top,
        width: vw,
        height: vh,
      });
      element.style.left = `${placement.left}px`;
      element.style.top = `${placement.top}px`;
      element.style.visibility = "visible";
    }

    position();
    const observer = new ResizeObserver(position);
    observer.observe(trigger);
    observer.observe(element);
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
    window.visualViewport?.addEventListener("resize", position);
    window.visualViewport?.addEventListener("scroll", position);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", position, true);
      window.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("resize", position);
      window.visualViewport?.removeEventListener("scroll", position);
    };
  }, [open, modal, host, width]);

  useLayoutEffect(() => {
    if (!open || !host) return;
    skipRestore.current = false;
    const opener = anchor.current;
    const modalElement = dialog.current;
    const element = modal ? modalElement : layer.current;
    if (modal && modalElement && !modalElement.open) {
      modalElement.showModal();
    }
    (
      element?.querySelector<HTMLElement>(
        "input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
      ) ??
      element?.querySelector<HTMLElement>("button:not(:disabled), [href]") ??
      element
    )?.focus({ preventScroll: true });

    return () => {
      const restore =
        element?.contains(document.activeElement) ||
        document.activeElement === document.body;
      if (modal && modalElement?.open) modalElement.close();
      if (restore && !skipRestore.current) opener?.focus();
    };
  }, [open, host, modal]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      const element = modal ? dialog.current : layer.current;
      const bounds = element?.getBoundingClientRect();
      const backdrop =
        modal &&
        event.target === element &&
        bounds &&
        (event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom);
      if (
        event.target instanceof Element &&
        event.target.closest("[data-ui-dropdown-popup='true']")
      ) {
        return;
      }
      if (
        backdrop ||
        (event.target instanceof Node &&
          !element?.contains(event.target) &&
          !anchor.current?.contains(event.target))
      ) {
        dismiss(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector("[data-ui-dropdown-popup='true']")
      ) {
        event.preventDefault();
        dismiss();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape as unknown as EventListener);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape as unknown as EventListener);
    };
  }, [open, modal, dismiss]);

  function onSurfaceKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }
  }

  const content = (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div
          id={`${id}-title`}
          className="text-sm font-bold text-[var(--color-text)]"
        >
          {title}
        </div>
        {closeButton ? (
          <IconButton
            size="compact"
            variant="ghost"
            aria-label={t("Close card")}
            onClick={() => dismiss()}
            className="-my-1 -mr-1"
          >
            <CloseIcon size={16} />
          </IconButton>
        ) : null}
      </div>
      {typeof children === "function" ? children(close) : children}
    </>
  );

  return (
    <>
      {renderTrigger({
        ref: anchor,
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        "aria-controls": open ? id : undefined,
        onClick: () => {
          if (!open) {
            setHost(anchor.current?.closest("dialog[open]") ?? document.body);
          }
          setOpen(!open);
        },
      })}

      {open && host
        ? createPortal(
            modal ? (
              <dialog
                ref={dialog}
                id={id}
                aria-labelledby={`${id}-title`}
                style={style}
                onKeyDown={onSurfaceKeyDown}
                onCancel={(event) => {
                  event.preventDefault();
                  dismiss();
                }}
                className={[
                  "m-auto max-h-[calc(100dvh-2rem)] w-[min(27.5rem,calc(100vw-2rem))] overflow-auto overscroll-contain rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] shadow-xl backdrop:bg-black/30",
                  className,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {content}
              </dialog>
            ) : (
              <div
                ref={layer}
                id={id}
                tabIndex={-1}
                role="dialog"
                aria-labelledby={`${id}-title`}
                style={{ visibility: "hidden", ...style }}
                onKeyDown={onSurfaceKeyDown}
                className={[
                  "fixed inset-auto z-40 m-0 max-w-[calc(100vw-1rem)] overflow-auto overscroll-contain rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text)] shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]",
                  className,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {content}
              </div>
            ),
            host,
          )
        : null}
    </>
  );
}
