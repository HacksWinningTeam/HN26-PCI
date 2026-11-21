"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  Button,
  ButtonGroup,
  ButtonGroupSeparator,
  CheckIcon,
  DotsIcon,
  IconButton,
  PillSelection,
  PlusIcon,
} from "@/components/ui";

export default function ButtonExamples() {
  const [pillValue, setPillValue] = useState("all");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function saveExample() {
    if (timer.current !== null) return;
    setSaving(true);
    setMessage("");
    timer.current = setTimeout(() => {
      setSaving(false);
      setMessage("Zapis demonstracyjny zakończony.");
      timer.current = null;
    }, 1000);
  }

  return (
    <div className="space-y-8">
      {/* Variants & sizes */}
      <div className="grid gap-6 sm:grid-cols-3">
        {(["filled", "outline", "ghost"] as const).map((variant) => (
          <div key={variant} className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--color-text)] capitalize">
                {variant === "filled"
                  ? "Filled (główne)"
                  : variant === "outline"
                    ? "Outline (drugorzędne)"
                    : "Ghost (dyskretne)"}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Default 44px (WCAG AA) oraz Compact 36px
              </p>
            </div>
            {(["default", "compact"] as const).map((size) => (
              <div key={size} className="flex flex-wrap items-center gap-2">
                <span className="w-16 font-mono text-xs text-[var(--color-text-muted)]">
                  {size === "default" ? "44px" : "36px"}
                </span>
                <Button variant={variant} size={size}>
                  Akcja
                </Button>
                <IconButton
                  variant={variant}
                  size={size}
                  aria-label={`Dodaj (${variant}, ${size})`}
                >
                  <PlusIcon size={16} />
                </IconButton>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Icons, tones, disabled & loading */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Warianty Brand Lime + ikony, tony semantyczne i stany
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button tone="lime" leadingIcon={<PlusIcon size={16} />}>
            Dodaj (Brand Lime)
          </Button>
          <Button
            tone="lime"
            variant="outline"
            trailingIcon={<ArrowRightIcon size={16} />}
          >
            Otwórz plan (Lime)
          </Button>
          <Button tone="lime" variant="ghost">
            Subtelna akcja (Lime)
          </Button>
          <IconButton tone="lime" aria-label="Szybkie dodanie Lime">
            <PlusIcon size={18} />
          </IconButton>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button leadingIcon={<PlusIcon size={16} />}>
            Dodaj do porównania
          </Button>
          <Button variant="outline" trailingIcon={<ArrowRightIcon size={16} />}>
            Otwórz szczegóły
          </Button>
          <Button tone="success" variant="outline" leadingIcon={<CheckIcon size={16} />}>
            Zatwierdź rekord
          </Button>
          <Button tone="destructive" variant="outline">
            Odrzuć duplikat
          </Button>
          <Button disabled>Wyłączony</Button>
          <Button loading={saving} onClick={saveExample}>
            Symuluj zapis
          </Button>
        </div>
        {message ? (
          <p className="text-xs font-medium text-[var(--color-text-muted)]" role="status">
            {message}
          </p>
        ) : null}
      </div>

      {/* Button Groups */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Grupy przycisków (ButtonGroup)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Wariant połączony (joined), rozdzielony separatorem przed akcją destrukcyjną oraz osobne pigułki (separate).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ButtonGroup label="Akcje karty innowacji" layout="joined" variant="outline">
            <Button onClick={() => setGroupMessage("Wybrano: Porównaj")}>
              Porównaj
            </Button>
            <Button onClick={() => setGroupMessage("Wybrano: Eksport CSV")}>
              Eksport CSV
            </Button>
            <ButtonGroupSeparator />
            <IconButton
              aria-label="Więcej opcji"
              onClick={() => setGroupMessage("Wybrano: Więcej opcji")}
            >
              <DotsIcon size={16} />
            </IconButton>
          </ButtonGroup>

          <ButtonGroup label="Akcje edycji" layout="separate" variant="outline" size="compact">
            <Button onClick={() => setGroupMessage("Wybrano: Edytuj")}>
              Edytuj
            </Button>
            <Button tone="destructive" onClick={() => setGroupMessage("Wybrano: Usuń")}>
              Usuń
            </Button>
          </ButtonGroup>
        </div>
        {groupMessage ? (
          <p className="text-xs text-[var(--color-text-muted)]" role="status">
            {groupMessage}
          </p>
        ) : null}
      </div>

      {/* PillSelection */}
      <div className="space-y-2">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            PillSelection (nawigacja strzałkami / Home / End)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Jednokrotny wybór filtrów w formie pigułek z roving tabIndex.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <PillSelection
            label="Filtr widoku (Brand Cyan)"
            value={pillValue}
            onValueChange={setPillValue}
            options={[
              { value: "all", label: "Wszystkie" },
              { value: "verified", label: "Zweryfikowane" },
              { value: "pilot", label: "Pilotaże" },
              { value: "archived", label: "Archiwum", disabled: true },
            ]}
          />
          <PillSelection
            label="Filtr widoku (Brand Lime)"
            accent="lime"
            value={pillValue}
            onValueChange={setPillValue}
            options={[
              { value: "all", label: "Wszystkie" },
              { value: "verified", label: "Zweryfikowane" },
              { value: "pilot", label: "Pilotaże" },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
