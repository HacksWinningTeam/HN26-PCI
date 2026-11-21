"use client";

import { useState } from "react";
import {
  AppShellLayout,
  AppFooter,
  BrandBinocularsIcon,
  Button,
  CheckCircleIcon,
  CompareIcon,
  MenuIcon,
  NavBar,
  PlusIcon,
  SearchIcon,
  Sidebar,
  Switch,
} from "@/components/ui";

const sections = [
  { id: "catalog", label: "Katalog innowacji", icon: <MenuIcon size={20} /> },
  { id: "solve", label: "Szukaj rozwiązania", icon: <SearchIcon size={20} /> },
  { id: "compare", label: "Porównanie", icon: <CompareIcon size={20} /> },
  { id: "workspace", label: "Moje wdrożenia", icon: <CheckCircleIcon size={20} /> },
] as const;

export default function AppShellExamples() {
  const [active, setActive] = useState<string>("catalog");
  const [showActions, setShowActions] = useState(true);
  const [notice, setNotice] = useState("");
  const selected = sections.find((section) => section.id === active) ?? sections[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-[var(--color-text)]">Sidebar + App shell</h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Jasny, neutralny sidebar z logo. Po prawej navbar z breadcrumbs, tytułem i opcjonalnymi akcjami.
          </p>
        </div>
        <Switch label="Przyciski w navbarze" checked={showActions} onChange={(event) => setShowActions(event.target.checked)} />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--color-border-subtle)]">
        <AppShellLayout
          layout="desktop"
          style={{ height: 540, minWidth: 640 }}
          footer={<AppFooter />}
          sidebar={
            <Sidebar
              label="Nawigacja boczna — podgląd"
              items={sections.map((section) => ({
                ...section,
                active: section.id === active,
                onSelect: () => { setActive(section.id); setNotice(""); },
              }))}
            />
          }
          navbar={
            <NavBar
              title={selected.label}
              titleAs="h4"
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
