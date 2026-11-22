"use client";

import { useId, useRef, useState } from "react";
import {
  AppShellLayout,
  AppFooter,
  BrandBinocularsIcon,
  Button,
  CheckCircleIcon,
  CloseIcon,
  CompareIcon,
  CsvIcon,
  IconButton,
  MenuIcon,
  NavBar,
  PlusIcon,
  SearchIcon,
  SegmentedControl,
  Sidebar,
  Switch,
} from "@/components/ui";

const sections = [
  { id: "catalog", label: "Szukaj innowacji", icon: <SearchIcon size={20} /> },
  { id: "compare", label: "Porównanie", icon: <CompareIcon size={20} /> },
  { id: "workspace", label: "Moje wdrożenia", icon: <CheckCircleIcon size={20} /> },
] as const;

export default function AppShellExamples() {
  const [active, setActive] = useState<string>("catalog");
  const [showActions, setShowActions] = useState(true);
  const [notice, setNotice] = useState("");
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigationId = useId();
  const searchId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const selected = sections.find((section) => section.id === active) ?? sections[0];

  function searchField(id: string) {
    return (
      <div>
        <label className="sr-only" htmlFor={id}>Szukaj w menu podglądu</label>
        <input id={id} type="search" value={query} placeholder="Szukaj w menu…"
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">Sidebar + App shell</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Na mobile: menu, tytuł i akcje ikonowe w jednym rzędzie. Wyszukiwarka wewnątrz rozwijanego menu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl label="Układ app shella" value={mobile ? "mobile" : "responsive"}
            onValueChange={(value) => { setMobile(value === "mobile"); setMenuOpen(false); }}
            options={[{ value: "responsive", label: "Responsywny" }, { value: "mobile", label: "Mobile" }]} />
          <Switch label="Przyciski w navbarze" checked={showActions} onChange={(event) => setShowActions(event.target.checked)} />
        </div>
      </div>

      <div className={`overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] ${mobile ? "mx-auto max-w-[375px]" : "w-full"}`}>
        <AppShellLayout
          layout={mobile ? "mobile" : "responsive"}
          style={{ height: 620 }}
          navigationId={navigationId}
          mobileMenuOpen={menuOpen}
          onKeyDown={(event) => {
            if (event.key === "Escape" && menuOpen) {
              setMenuOpen(false);
              menuButton.current?.focus();
            }
          }}
          footer={<AppFooter />}
          sidebar={
            <Sidebar
              layout={mobile ? "mobile" : "responsive"}
              label="Nawigacja boczna — podgląd"
              mobileSearch={searchField(`${searchId}-mobile`)}
              items={sections.filter((section) => section.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).map((section) => ({
                ...section,
                active: section.id === active,
                onSelect: () => { setActive(section.id); setNotice(""); setMenuOpen(false); menuButton.current?.focus(); },
              }))}
            />
          }
          navbar={
            <NavBar
              title={selected.label}
              titleAs="h4"
              layout={mobile ? "mobile" : "responsive"}
              search={searchField(`${searchId}-desktop`)}
              leading={
                <IconButton ref={menuButton} variant="outline" className={mobile ? undefined : "md:hidden"}
                  aria-label={menuOpen ? "Zamknij menu podglądu" : "Otwórz menu podglądu"}
                  aria-expanded={menuOpen} aria-controls={navigationId}
                  onClick={() => setMenuOpen((open) => !open)}>
                  {menuOpen ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
                </IconButton>
              }
              breadcrumbs={[
                { label: "Praktoteka", href: "#navigation-bars" },
                { label: selected.label },
              ]}
              actions={showActions ? (
                <>
                  <Button variant="outline" onClick={() => setNotice("Demo: wybrano eksport.")}>Eksportuj</Button>
                  <Button leadingIcon={<PlusIcon />} onClick={() => setNotice("Demo: wybrano dodawanie.")}>Dodaj</Button>
                </>
              ) : undefined}
              mobileActions={showActions ? (
                <>
                  <IconButton variant="outline" aria-label="Eksportuj" onClick={() => setNotice("Demo: wybrano eksport.")}><CsvIcon size={20} /></IconButton>
                  <IconButton aria-label="Dodaj" onClick={() => setNotice("Demo: wybrano dodawanie.")}><PlusIcon size={20} /></IconButton>
                </>
              ) : undefined}
            />
          }
        >
          <div className="flex flex-col gap-5">
            <p className="text-xs text-[var(--color-text-muted)]">Podgląd komponentów · dane przykładowe</p>
            <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
              <BrandBinocularsIcon size={72} />
              <p className="mt-4 text-sm font-semibold text-[var(--color-text)]">{selected.label}</p>
              <p className="mt-2 max-w-60 text-xs leading-relaxed text-[var(--color-text-muted)]">
                Miejsce na treść widoku: listę, karty, tabelę lub formularz.
              </p>
            </div>
            <p aria-live="polite" className="min-h-5 text-xs text-[var(--color-text-muted)]">
              {notice || `Wybrana sekcja: ${selected.label}`}
            </p>
          </div>
        </AppShellLayout>
      </div>
    </div>
  );
}
