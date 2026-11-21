"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";
import { ErrorCircleIcon } from "./icons";
import { TextInput } from "./input";

export type DialogDetail = {
  label: string;
  value: ReactNode;
};

type DialogProps = {
  open: boolean;
  title: string;
  description: string;
  tone?: "neutral" | "danger";
  onClose: () => void;
  closeOnBackdrop?: boolean;
  details?: readonly DialogDetail[];
};

export type AlertDialogProps = DialogProps & {
  acknowledgmentLabel?: string;
};

export type ConfirmationDialogProps = DialogProps & {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Exact case-sensitive string required to unlock destructive confirmation. */
  confirmationText?: string;
  loading?: boolean;
  error?: string;
};

export type UnsavedChangesDialogProps = Omit<DialogProps, "tone"> & {
  onDiscard: () => void;
  onSave?: () => void;
  saveLabel?: string;
  discardLabel?: string;
  keepEditingLabel?: string;
  pendingAction?: "save" | "discard";
  error?: string;
};

type SurfaceProps = DialogProps & {
  acknowledgmentLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  confirmationText?: string;
  secondaryAction?: { label: string; onSelect: () => void; loading: boolean };
  loading?: boolean;
  error?: string;
};

function DialogSurface({
  open,
  title,
  description,
  tone = "neutral",
  onClose,
  closeOnBackdrop = false,
  details,
  acknowledgmentLabel,
  confirmLabel,
  cancelLabel,
  onConfirm,
  confirmationText,
  secondaryAction,
  loading = false,
  error,
}: SurfaceProps) {
  const [typedText, setTypedText] = useState("");
  const canConfirm =
    confirmationText === undefined || typedText === confirmationText;
  const dialog = useRef<HTMLDialogElement>(null);
  const pointerStartedOutside = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const opener = document.activeElement;
    if (!element.open) {
      element.showModal();
    }
    (
      element.querySelector<HTMLButtonElement>(
        "[data-initial-focus]:not(:disabled)",
      ) ?? element
    ).focus();
    return () => {
      if (element.open) element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  useLayoutEffect(() => {
    const element = dialog.current;
    if (open && loading && element?.open) {
      element.focus();
    }
  }, [open, loading]);

  function outside(x: number, y: number) {
    const rect = dialog.current?.getBoundingClientRect();
    if (!rect) return false;
    return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
  }

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={loading || undefined}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onClose();
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
        if (dismiss && closeOnBackdrop && !loading) onClose();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-[var(--color-text)] shadow-2xl backdrop:bg-black/45"
    >
      <div className="space-y-3">
        <h2
          id={titleId}
          className="flex items-center gap-2 text-lg font-bold text-[var(--color-text)]"
        >
          {tone === "danger" ? (
            <ErrorCircleIcon
              size={20}
              className="shrink-0 text-[var(--color-error-text)]"
            />
          ) : null}
          <span>{title}</span>
        </h2>

        <p
          id={descriptionId}
          className="whitespace-pre-line text-sm leading-relaxed text-[var(--color-text-muted)]"
        >
          {description}
        </p>

        {details && details.length > 0 ? (
          <dl className="divide-y divide-[var(--color-border-subtle)] rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] px-3 py-1 text-xs">
            {details.map((detail, index) => (
              <div
                key={index}
                className="flex items-baseline justify-between gap-3 py-2"
              >
                <dt className="text-[var(--color-text-muted)]">
                  {detail.label}
                </dt>
                <dd className="font-semibold text-[var(--color-text)]">
                  {detail.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {confirmationText !== undefined ? (
          <TextInput
            label={`Wpisz „${confirmationText}”, aby potwierdzić`}
            hint="Wielkość liter ma znaczenie."
            value={typedText}
            onChange={(event) => setTypedText(event.target.value)}
            disabled={loading}
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="none"
          />
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-2.5 text-xs font-semibold text-[var(--color-error-text)]"
          >
            {error}
          </p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {onConfirm ? (
          <>
            <Button
              data-initial-focus
              variant="outline"
              disabled={loading}
              onClick={onClose}
            >
              {cancelLabel ?? "Anuluj"}
            </Button>
            {secondaryAction ? (
              <Button
                variant="outline"
                tone="destructive"
                disabled={loading}
                loading={secondaryAction.loading}
                onClick={() => {
                  if (!loading) secondaryAction.onSelect();
                }}
              >
                {secondaryAction.label}
              </Button>
            ) : null}
            <Button
              disabled={!canConfirm || loading}
              tone={tone === "danger" ? "destructive" : "neutral"}
              loading={loading && !secondaryAction?.loading}
              onClick={() => {
                if (!loading && canConfirm) onConfirm();
              }}
            >
              {confirmLabel ?? "Potwierdź"}
            </Button>
          </>
        ) : (
          <Button data-initial-focus onClick={onClose}>
            {acknowledgmentLabel ?? "Rozumiem"}
          </Button>
        )}
      </div>
    </dialog>
  );
}

export function AlertDialog(props: AlertDialogProps) {
  return props.open ? <DialogSurface {...props} /> : null;
}

export function ConfirmationDialog(props: ConfirmationDialogProps) {
  if (props.confirmationText !== undefined && !props.confirmationText.trim()) {
    throw new RangeError(
      "confirmationText must contain non-whitespace characters.",
    );
  }
  return props.open ? (
    <DialogSurface key={props.confirmationText} {...props} />
  ) : null;
}

export function UnsavedChangesDialog({
  onSave,
  onDiscard,
  saveLabel,
  discardLabel,
  keepEditingLabel,
  pendingAction,
  ...props
}: UnsavedChangesDialogProps) {
  return props.open ? (
    <DialogSurface
      {...props}
      tone={onSave ? "neutral" : "danger"}
      onConfirm={onSave ?? onDiscard}
      confirmLabel={
        onSave
          ? (saveLabel ?? "Zapisz zmiany")
          : (discardLabel ?? "Odrzuć zmiany")
      }
      cancelLabel={keepEditingLabel ?? "Kontynuuj edycję"}
      loading={pendingAction !== undefined}
      secondaryAction={
        onSave
          ? {
              label: discardLabel ?? "Odrzuć zmiany",
              onSelect: onDiscard,
              loading: pendingAction === "discard",
            }
          : undefined
      }
    />
  ) : null;
}
