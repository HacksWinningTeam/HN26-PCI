"use client";

import { useState } from "react";
import AppShellExamples from "./app-shell-examples";
import PublicNavBarExamples from "./public-nav-bar-examples";
import {
  AlertDialog,
  AppFooter,
  Banner,
  Breadcrumbs,
  Button,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  SegmentedControl,
  UnsavedChangesDialog,
} from "@/components/ui";

export function BannerExamples() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Banner tone="info" title="Dane demonstracyjne i źródła">
          Wynik procentowy oznacza dopasowanie do potrzeb użytkownika, a nie gwarancję sukcesu wdrożenia.
        </Banner>
        <Banner tone="success" title="Dane kontaktowe odblokowane">
          Dostęp do kontaktu z jednostką wdrażającą jest aktywny dla zalogowanego konta.
        </Banner>
        <Banner tone="warning" title="Wykryto brakujące informacje">
          Karta nie zawiera jeszcze szacunku kosztów utrzymania po 12 miesiącach.
        </Banner>
        <Banner tone="error" title="Wykryto sprzeczność w źródłach">
          Różne rejestry podają odmienny poziom TRL — rekord wymaga decyzji operatora PCI.
        </Banner>
      </div>

      {dismissed ? (
        <Button size="compact" variant="outline" onClick={() => setDismissed(false)}>
          Przywróć baner z akcją i zamykaniem
        </Button>
      ) : (
        <Banner
          tone="info"
          title="Porównanie gotowe (2/3 innowacji)"
          onDismiss={() => setDismissed(true)}
          actions={[
            <Button key="compare" size="compact" variant="outline">
              Przejdź do porównania
            </Button>,
          ]}
        >
          Możesz dodać jeszcze jedną innowację lub otworzyć tabelę porównawczą.
        </Banner>
      )}
    </div>
  );
}

export function EmptyStateExamples() {
  return (
    <EmptyState
      title="Brak wyników dla wybranych kryteriów"
      description="Usuń część filtrów (np. wymagany poziom TRL lub lokalizację) albo zapisz powiadomienie e-mail."
      actions={
        <>
          <Button variant="outline" size="compact">
            Wyczyść wszystkie filtry
          </Button>
          <Button size="compact">Powiadom mnie</Button>
        </>
      }
    />
  );
}

export function LoadingStateExamples() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <LoadingState
        label="Wyszukiwanie pasujących innowacji…"
        description="Analizujemy opis problemu, branżę i beneficjentów."
        rows={3}
      />
      <LoadingState
        label="Generowanie planu wdrożeniowego…"
        description="Wariant ze wskaźnikiem bez pasków szkieletowych."
        rows={0}
      />
    </div>
  );
}

export function ErrorStateExamples() {
  return (
    <ErrorState
      title="Nie udało się połączyć z usługą dopasowania"
      message="Serwer nie odpowiedział w oczekiwanym czasie. Twoje dane formularza zostały zachowane."
      onRetry={() => {}}
    />
  );
}

export function DialogExamples() {
  const [openDialog, setOpenDialog] = useState<
    null | "alert" | "confirm" | "destructive" | "unsaved"
  >(null);
  const [result, setResult] = useState("");

  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-muted)]">
        Natywny element &lt;dialog&gt; z showModal(), pułapką fokusu, Escape oraz opcjonalnym wpisaniem potwierdzenia przy akcjach nieodwracalnych.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setOpenDialog("alert")}>
          Alert informacyjny
        </Button>
        <Button variant="outline" onClick={() => setOpenDialog("confirm")}>
          Potwierdzenie scalenia
        </Button>
        <Button
          variant="outline"
          tone="destructive"
          onClick={() => setOpenDialog("destructive")}
        >
          Akcja wysokiego ryzyka
        </Button>
        <Button variant="outline" onClick={() => setOpenDialog("unsaved")}>
          Niezapisane zmiany (3 akcje)
        </Button>
      </div>

      {result ? (
        <p className="text-xs font-semibold text-[var(--color-text-muted)]" role="status">
          {result}
        </p>
      ) : null}

      <AlertDialog
        open={openDialog === "alert"}
        title="Informacja o wyliczeniu dopasowania"
        description="Wynik procentowy uwzględnia opis problemu (40%), branżę (20%), beneficjentów (20%) oraz typ organizacji (20%)."
        closeOnBackdrop
        onClose={() => setOpenDialog(null)}
      />

      <ConfirmationDialog
        open={openDialog === "confirm"}
        title="Scalić duplikat z rekordem głównym?"
        description="Źródła duplikatu zostaną przeniesione do rekordu głównego, a powielony wpis zostanie ukryty w katalogu."
        details={[
          { label: "Duplikat", value: "Asystent Seniora v1 (kopia)" },
          { label: "Rekord główny", value: "Asystent e-Usług dla Seniorów" },
        ]}
        confirmLabel="Scal rekordy"
        onConfirm={() => {
          setResult("Demo: rekordy scalone.");
          setOpenDialog(null);
        }}
        onClose={() => setOpenDialog(null)}
      />

      <ConfirmationDialog
        open={openDialog === "destructive"}
        tone="danger"
        title="Usunąć plan wdrożenia?"
        description="Ta operacja trwale usunie pięciofazowy plan i zapisany postęp checklisty."
        confirmationText="USUŃ PLAN"
        confirmLabel="Usuń trwale"
        onConfirm={() => {
          setResult("Demo: usunięto plan.");
          setOpenDialog(null);
        }}
        onClose={() => setOpenDialog(null)}
      />

      <UnsavedChangesDialog
        open={openDialog === "unsaved"}
        title="Zapisać zmiany w rekordzie PCI?"
        description="Zmodyfikowałeś pola weryfikacji rekordu. Wybierz, co chcesz zrobić przed zamknięciem edytora."
        onSave={() => {
          setResult("Demo: zapisano zmiany.");
          setOpenDialog(null);
        }}
        onDiscard={() => {
          setResult("Demo: odrzucono zmiany.");
          setOpenDialog(null);
        }}
        onClose={() => setOpenDialog(null)}
      />
    </div>
  );
}

export function NavigationExamples() {
  const [widthMode, setWidthMode] = useState("wide");

  return (
    <div className="space-y-8">
      <AppShellExamples />
      <PublicNavBarExamples />

      {/* Breadcrumbs Showcase */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Breadcrumbs (ścieżka nawigacji)
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Breadcrumbs automatycznie zwijają nadrzędne elementy do przycisku menu („…”), gdy zabraknie miejsca w poziomie.
            </p>
          </div>
          <SegmentedControl
            label="Szerokość podglądu okruszków"
            value={widthMode}
            onValueChange={setWidthMode}
            options={[
              { value: "wide", label: "Pełna szerokość" },
              { value: "narrow", label: "Wąski ekran (260px)" },
            ]}
          />
        </div>

        <div
          className={[
            "rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 transition-all",
            widthMode === "narrow" ? "max-w-[260px]" : "w-full",
          ].join(" ")}
        >
          <Breadcrumbs
            items={[
              { label: "Start", href: "/" },
              { label: "Katalog innowacji", href: "/innovations" },
              { label: "Administracja publiczna", href: "/innovations" },
              { label: "Asystent e-Usług dla Seniorów" },
            ]}
          />
        </div>
      </div>

      {/* Footer Showcase */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Footer (stopka aplikacji)
          </h3>
          <p className="text-xs text-[var(--color-text-muted)]">
            Spójna stopka główna z oznaczeniem projektu Praktoteka i odnośnikiem do panelu operatora PCI (ukrywana przy druku).
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-5">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
