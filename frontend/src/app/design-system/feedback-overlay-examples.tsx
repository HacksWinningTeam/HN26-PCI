"use client";

import { useState } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  AlertDialog,
  Banner,
  Breadcrumbs,
  Button,
  CloseIcon,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  MenuIcon,
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

const NAV_PREVIEW_ITEMS = [
  { key: "solve", label: "Szukaj problemu" },
  { key: "innovations", label: "Katalog" },
  { key: "compare", label: "Porównanie (2)" },
  { key: "workspace", label: "Moje wdrożenia" },
] as const;

export function NavigationExamples() {
  const [activeNav, setActiveNav] = useState<(typeof NAV_PREVIEW_ITEMS)[number]["key"]>("innovations");
  const [navLayout, setNavLayout] = useState("desktop");
  const [navAuth, setNavAuth] = useState("guest");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(true);
  const [widthMode, setWidthMode] = useState("wide");

  return (
    <div className="space-y-8">
      {/* Main Top Navbar Showcase */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              Główny pasek nawigacji z logo Praktoteka
            </h3>
            <p className="text-xs text-[var(--color-text-muted)]">
              Nagłówek aplikacji z przezroczystym logo (auto Light/Dark), linkami sekcji, statusem sesji i menu mobilnym.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <SegmentedControl
              label="Układ paska"
              value={navLayout}
              onValueChange={setNavLayout}
              options={[
                { value: "desktop", label: "Desktop" },
                { value: "mobile", label: "Mobile" },
              ]}
            />
            <SegmentedControl
              label="Stan sesji"
              value={navAuth}
              onValueChange={setNavAuth}
              options={[
                { value: "guest", label: "Gość" },
                { value: "user", label: "Zalogowany" },
              ]}
            />
          </div>
        </div>

        <div
          className={[
            "overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xs transition-all",
            navLayout === "mobile" ? "mx-auto max-w-sm" : "w-full",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-4 py-3 sm:px-5">
            <a
              href="#navigation-bars"
              aria-label="Praktoteka — strona główna (podgląd)"
              className="inline-flex min-h-11 items-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
            >
              <BrandLogo size="sm" />
            </a>

            {navLayout === "desktop" ? (
              <>
                <nav
                  aria-label="Podgląd nawigacji głównej"
                  className="flex flex-wrap items-center gap-1"
                >
                  {NAV_PREVIEW_ITEMS.map((item) => {
                    const isActive = activeNav === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setActiveNav(item.key)}
                        className={`inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                            : "text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>

                <div className="flex items-center justify-end gap-2">
                  {navAuth === "user" ? (
                    <div className="flex items-center gap-2">
                      <span className="max-w-[160px] truncate text-xs font-medium text-[var(--color-text-muted)]">
                        jan.kowalski@gmina.pl
                      </span>
                      <button
                        type="button"
                        className="min-h-11 shrink-0 cursor-pointer rounded-md border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text)] transition-colors hover:border-[var(--color-accent)]"
                      >
                        Wyloguj
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex min-h-11 shrink-0 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-text)]">
                      Zaloguj się
                    </span>
                  )}
                </div>
              </>
            ) : (
              <button
                type="button"
                aria-expanded={mobileDrawerOpen}
                aria-label={mobileDrawerOpen ? "Zamknij menu podglądu" : "Otwórz menu podglądu"}
                onClick={() => setMobileDrawerOpen((v) => !v)}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-text)] hover:border-[var(--color-accent)]"
              >
                {mobileDrawerOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
              </button>
            )}
          </div>

          {navLayout === "mobile" && mobileDrawerOpen ? (
            <div className="bg-[var(--color-surface)] px-4 py-3">
              <nav aria-label="Podgląd nawigacji mobilnej" className="flex flex-col gap-1">
                {NAV_PREVIEW_ITEMS.map((item) => {
                  const isActive = activeNav === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setActiveNav(item.key)}
                      className={`inline-flex min-h-11 cursor-pointer items-center rounded-md px-3 py-2 text-left text-sm font-semibold transition-colors ${
                        isActive
                          ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                          : "text-[var(--color-text)] hover:bg-[var(--color-surface-raised)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="mt-3 border-t border-[var(--color-border-subtle)] pt-3">
                {navAuth === "user" ? (
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-xs font-medium text-[var(--color-text-muted)]">
                      jan.kowalski@gmina.pl
                    </span>
                    <button
                      type="button"
                      className="min-h-11 shrink-0 cursor-pointer rounded-md border border-[var(--color-border)] px-3 text-xs font-semibold text-[var(--color-text)]"
                    >
                      Wyloguj
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-3 text-sm font-semibold text-[var(--color-text)]">
                    Zaloguj się
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
            "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all",
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
    </div>
  );
}
