"use client";

import { useEffect, useRef, useState } from "react";
import {
  Button,
  DefinitionList,
  Drawer,
  Sheet,
  TextArea,
  TextInput,
} from "@/components/ui";

type SheetExampleMode =
  | "details"
  | "edit"
  | "long"
  | "resizable"
  | "two-detents";

type DrawerExampleMode = "details" | "long";

export default function SheetExamples() {
  const [activeSheet, setActiveSheet] = useState<SheetExampleMode | null>(null);
  const [activeDrawer, setActiveDrawer] = useState<DrawerExampleMode | null>(null);
  const [titleDraft, setTitleDraft] = useState("Asystent e-Usług dla Seniorów");
  const [summaryDraft, setSummaryDraft] = useState(
    "Cyfrowy asystent wspierający seniorów w załatwianiu spraw urzędowych bez wizyty w urzędzie.",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const attempts = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHistory =
    activeSheet === "long" ||
    activeSheet === "resizable" ||
    activeSheet === "two-detents";

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function launchSheet(example: SheetExampleMode) {
    setTitleDraft("Asystent e-Usług dla Seniorów");
    setSummaryDraft(
      "Cyfrowy asystent wspierający seniorów w załatwianiu spraw urzędowych bez wizyty w urzędzie.",
    );
    setError("");
    setResult("");
    attempts.current = 0;
    setActiveSheet(example);
  }

  function saveSheet() {
    if (busy || timer.current) return;
    if (!titleDraft.trim()) {
      setError("Podaj nazwę innowacji.");
      return;
    }
    setBusy(true);
    setError("");
    timer.current = setTimeout(() => {
      timer.current = null;
      setBusy(false);
      if (attempts.current++ === 0) {
        setError(
          "Pierwsza próba zapisu (demo) nie powiodła się. Szkic pozostał — kliknij ponownie ✓.",
        );
      } else {
        setActiveSheet(null);
        setResult("Demo: zmiany rekordu zapisane poprawnie.");
      }
    }, 1000);
  }

  return (
    <div className="space-y-8">
      {/* Sheets */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Sheet (okno zadaniowe 640×640px na desktopie · bottom sheet z detentami na mobile)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Stały nagłówek (zamknij po lewej, opcjonalne potwierdzenie ✓ po prawej) oraz przewijalne wnętrze. Na ekranach &le; 600px obsługuje drag-handle (small / medium / large) i strzałki klawiatury.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => launchSheet("details")}>
            Podgląd innowacji
          </Button>
          <Button variant="outline" onClick={() => launchSheet("edit")}>
            Edycja rekordu (z ✓ i retry)
          </Button>
          <Button variant="outline" onClick={() => launchSheet("long")}>
            Długa treść (scroll)
          </Button>
          <Button variant="outline" onClick={() => launchSheet("resizable")}>
            3 detenty (small / medium / large)
          </Button>
          <Button variant="outline" onClick={() => launchSheet("two-detents")}>
            2 detenty (medium / large)
          </Button>
        </div>
        {result ? (
          <p className="text-xs font-semibold text-[var(--color-text-muted)]" role="status">
            {result}
          </p>
        ) : null}
      </div>

      {/* Drawers */}
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Drawer (panel boczny 480px po prawej na desktopie · bottom sheet na mobile)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Do podglądu szczegółów rekordu z tabeli lub szybkiej weryfikacji źródeł bez opuszczania listy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setActiveDrawer("details")}>
            Otwórz panel szczegółów
          </Button>
          <Button variant="outline" onClick={() => setActiveDrawer("long")}>
            Długa lista źródeł w panelu
          </Button>
        </div>
      </div>

      <Sheet
        open={activeSheet !== null}
        title={
          activeSheet === "edit"
            ? "Edycja karty innowacji"
            : showHistory
              ? "Historia weryfikacji i źródeł"
              : "Asystent e-Usług dla Seniorów"
        }
        busy={busy}
        closeOnBackdrop={activeSheet !== "edit"}
        onClose={() => setActiveSheet(null)}
        detents={
          activeSheet === "resizable"
            ? ["small", "medium", "large"]
            : activeSheet === "two-detents"
              ? ["medium", "large"]
              : undefined
        }
        initialDetent="medium"
        closeLabel={activeSheet === "edit" ? "Odrzuć zmiany" : undefined}
        confirmAction={
          activeSheet === "edit"
            ? { label: "Zapisz zmiany", form: "ds-sheet-edit-form", loading: busy }
            : undefined
        }
      >
        {activeSheet === "edit" ? (
          <form
            id="ds-sheet-edit-form"
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveSheet();
            }}
          >
            <TextInput
              label="Nazwa innowacji"
              value={titleDraft}
              required
              disabled={busy}
              onChange={(event) => setTitleDraft(event.target.value)}
            />
            <TextArea
              label="Krótkie podsumowanie"
              value={summaryDraft}
              disabled={busy}
              onChange={(event) => setSummaryDraft(event.target.value)}
            />
            {error ? (
              <p
                role="alert"
                className="rounded-lg border border-[var(--color-error-border)] bg-[var(--color-error-bg)] p-3 text-xs font-semibold text-[var(--color-error-text)]"
              >
                {error}
              </p>
            ) : null}
          </form>
        ) : showHistory ? (
          <div className="space-y-3">
            {Array.from({ length: 14 }, (_, index) => (
              <section
                key={index}
                className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs"
              >
                <h4 className="font-bold text-[var(--color-text)]">
                  Wpis weryfikacji #{index + 1}
                </h4>
                <p className="mt-1 text-[var(--color-text-muted)]">
                  Potwierdzono zgodność danych z rejestrem PARP oraz raportem z pilotażu gminnego.
                </p>
              </section>
            ))}
          </div>
        ) : (
          <DefinitionList
            items={[
              { id: "area", label: "Główny obszar", value: "Administracyjny" },
              { id: "char", label: "Charakter", value: "Produktowy, Społeczny" },
              { id: "lvl", label: "Poziom wdrożenia", value: "Pilotaż (TRL 7/9)" },
              { id: "loc", label: "Pochodzenie", value: "Gdynia, Pomorskie" },
            ]}
          />
        )}
      </Sheet>

      <Drawer
        open={activeDrawer !== null}
        title="Szczegóły rekordu z tabeli"
        onClose={() => setActiveDrawer(null)}
      >
        <DefinitionList
          items={[
            { id: "name", label: "Innowacja", value: "Asystent e-Usług dla Seniorów" },
            { id: "org", label: "Organizacja", value: "Fundacja Cyfrowa Gdynia" },
            { id: "status", label: "Status weryfikacji", value: "Zweryfikowany (PCI)" },
            ...(activeDrawer === "long"
              ? Array.from({ length: 16 }, (_, index) => ({
                  id: `src-${index}`,
                  label: `Źródło publiczne #${index + 1}`,
                  value: `Rejestr PARP · 2026-10-${String((index % 20) + 1).padStart(2, "0")}`,
                }))
              : []),
          ]}
        />
      </Drawer>
    </div>
  );
}
