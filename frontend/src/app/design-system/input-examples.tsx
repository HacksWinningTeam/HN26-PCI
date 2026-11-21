"use client";

import { useEffect, useRef, useState } from "react";
import {
  Checkbox,
  CheckboxGroup,
  CompactSearch,
  Dropdown,
  MultiSelect,
  NumberInput,
  RadioGroup,
  SearchInput,
  SegmentedControl,
  Stepper,
  Switch,
  TextArea,
  TextInput,
  type DropdownOption,
} from "@/components/ui";

const SECTOR_OPTIONS: DropdownOption[] = [
  { value: "administracja", label: "Administracja publiczna i samorząd" },
  { value: "zdrowie", label: "Zdrowie i opieka senioralna" },
  { value: "edukacja", label: "Edukacja i kompetencje cyfrowe" },
  { value: "srodowisko", label: "Środowisko i energetyka" },
  { value: "transport", label: "Transport i mobilność" },
  { value: "bezpieczenstwo", label: "Bezpieczeństwo i zarządzanie kryzysowe" },
  { value: "archived", label: "Kategoria archiwalna (niedostępna)", disabled: true },
];

const BENEFICIARY_OPTIONS = [
  { value: "seniors_60_plus", label: "Seniorzy 60+" },
  { value: "children_0_12", label: "Dzieci 0–12" },
  { value: "disabilities_special_needs", label: "Osoby z niepełnosprawnościami" },
  { value: "public_orgs_communities", label: "Gminy i instytucje publiczne" },
  { value: "social_digital_exclusion", label: "Osoby zagrożone wykluczeniem" },
];

const SAMPLE_INNOVATIONS = [
  "Asystent e-Usług dla Seniorów (Gdynia)",
  "Cyfrowy Punkt Pomocy Gminnej (Trzebownisko)",
  "Czujnik Jakości Powietrza dla Szkół (Kraków)",
  "System Ostrzegania Hydrologicznego (Rzeszów)",
];

function AsyncSwitchDemo({ fail = false }: { fail?: boolean }) {
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Switch
      label={
        fail
          ? "Automatyczna synchronizacja (symulacja błędu)"
          : "Powiadomienia o nowych innowacjach"
      }
      checked={checked}
      pending={pending}
      error={error || undefined}
      hint={
        pending
          ? "Zapisywanie…"
          : saved
            ? "Zapisano ustawienie."
            : fail
              ? "Po 1s zapis się nie powiedzie i przywróci poprzedni stan."
              : "Symuluje zapis asynchroniczny i blokuje podwójne kliknięcia."
      }
      onChange={(event) => {
        if (pending) return;
        const previous = checked;
        setChecked(event.target.checked);
        setPending(true);
        setError("");
        setSaved(false);
        timer.current = setTimeout(() => {
          if (fail) {
            setChecked(previous);
            setError("Nie udało się zapisać ustawienia. Spróbuj ponownie.");
          } else {
            setSaved(true);
          }
          setPending(false);
          timer.current = null;
        }, 900);
      }}
    />
  );
}

export default function InputExamples() {
  const [location, setLocation] = useState("Gmina Trzebownisko");
  const [usersCount, setUsersCount] = useState("250");
  const [query, setQuery] = useState("");
  const [problemDesc, setProblemDesc] = useState(
    "Nasza gmina szuka rozwiązania ułatwiającego seniorom załatwianie spraw urzędowych online.",
  );
  const [sector, setSector] = useState("administracja");
  const [searchableSector, setSearchableSector] = useState("");
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<string[]>([
    "seniors_60_plus",
    "public_orgs_communities",
  ]);
  const [orgType, setOrgType] = useState("public_institution");
  const [viewMode, setViewMode] = useState("grid");
  const [historyFilter, setHistoryFilter] = useState(["verified"]);
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [trlMin, setTrlMin] = useState(5);
  const [indeterminateDemo, setIndeterminateDemo] = useState(true);

  const matches = SAMPLE_INNOVATIONS.filter((item) =>
    item.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <div className="space-y-8">
      {/* Text & Number Inputs */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          TextInput i NumberInput (stany i rozmiary)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Lokalizacja wdrożenia"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            hint="Powiat, gmina lub województwo."
          />
          <TextInput
            label="Pole kompaktowe (compact)"
            size="compact"
            placeholder="np. Podkarpackie"
          />
          <NumberInput
            label="Liczba potencjalnych użytkowników"
            value={usersCount}
            onChange={(e) => setUsersCount(e.target.value)}
            min={1}
            hint="Formatowanie tabular-nums."
          />
          <TextInput
            label="Pole wymagane z błędem"
            required
            defaultValue=""
            error="Podaj nazwę organizacji, aby wygenerować plan."
          />
          <TextInput
            label="Tylko do odczytu (read-only)"
            defaultValue="Rejestr UPRP"
            readOnly
          />
          <TextInput
            label="Zablokowane (disabled)"
            defaultValue="Niedostępne"
            disabled
          />
        </div>
      </div>

      {/* Search & CompactSearch */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          SearchInput oraz CompactSearch (rozwijana kapsuła)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <SearchInput
            label="Szukaj innowacji w katalogu"
            placeholder="np. seniorzy, Gdynia, powietrze…"
            value={query}
            onValueChange={setQuery}
            aria-controls="ds-search-results"
          />
          <div className="flex flex-col justify-end gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-text)]">
              CompactSearch (kliknij lupę, Escape zwija)
            </span>
            <CompactSearch
              label="Szybkie szukanie"
              placeholder="Filtruj listę…"
              value={query}
              onValueChange={setQuery}
              aria-controls="ds-search-results"
            />
          </div>
        </div>
        <div
          id="ds-search-results"
          className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-raised)] p-3 text-xs"
        >
          <p className="mb-1.5 font-semibold text-[var(--color-text-muted)]" role="status">
            Pasujące rekordy: {matches.length}
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-[var(--color-text)]">
            {matches.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* TextArea */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          TextArea (auto-grow 2–6 linii + warianty)
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <TextArea
            label="Opis problemu (autoGrow)"
            value={problemDesc}
            onChange={(e) => setProblemDesc(e.target.value)}
            autoGrow
            minRows={2}
            maxRows={6}
            resizable={false}
            maxLength={500}
            hint={`${problemDesc.length} / 500 znaków · Rozszerza się automatycznie (2–6 linii).`}
          />
          <TextArea
            label="Zgłoszone braki (błąd walidacji)"
            rows={2}
            required
            defaultValue=""
            error="Opisz brakującą informację przed wysłaniem."
          />
        </div>
      </div>

      {/* Dropdown & MultiSelect */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Dropdown i MultiSelect (z wyszukiwaniem i nawigacją klawiaturą)
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dropdown
            label="Branża lub sektor"
            options={SECTOR_OPTIONS}
            value={sector}
            onValueChange={setSector}
            hint="Obsługa strzałek i szybkiego wpisywania liter."
          />
          <Dropdown
            label="Branża (z wyszukiwarką)"
            options={SECTOR_OPTIONS}
            value={searchableSector}
            onValueChange={setSearchableSector}
            searchable
            placeholder="Wyszukaj branżę…"
            hint="Wewnętrzny SearchInput w portalu."
          />
          <MultiSelect
            label="Grupy beneficjentów"
            options={BENEFICIARY_OPTIONS}
            value={selectedBeneficiaries}
            onValueChange={setSelectedBeneficiaries}
            searchable
            hint="Wiele wyborów z licznikiem i przyciskiem Wyczyść."
          />
        </div>
      </div>

      {/* RadioGroup, SegmentedControl, CheckboxGroup */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[var(--color-text)]">
          Radio Picker, SegmentedControl i CheckboxGroup
        </h3>
        <div className="grid gap-6 md:grid-cols-2">
          <RadioGroup
            label="Typ organizacji (Radio Picker — karty z opisem)"
            layout="vertical"
            value={orgType}
            onValueChange={setOrgType}
            options={[
              {
                value: "public_institution",
                label: "Instytucja publiczna / gmina",
                description: "Urzędy, szkoły, jednostki samorządowe.",
              },
              {
                value: "ngo",
                label: "Organizacja społeczna (NGO)",
                description: "Fundacje, stowarzyszenia, koła lokalne.",
              },
              {
                value: "enterprise",
                label: "Przedsiębiorstwo",
                description: "MŚP oraz działy R&D.",
              },
            ]}
          />

          <div className="space-y-5">
            <SegmentedControl
              label="Tryb widoku katalogu (SegmentedControl)"
              value={viewMode}
              onValueChange={setViewMode}
              options={[
                { value: "grid", label: "Siatka kart" },
                { value: "table", label: "Tabela" },
              ]}
            />

            <SegmentedControl
              label="Wariant Brand Lime (SegmentedControl)"
              accent="lime"
              value={viewMode}
              onValueChange={setViewMode}
              options={[
                { value: "grid", label: "Siatka kart" },
                { value: "table", label: "Tabela" },
              ]}
            />

            <CheckboxGroup
              label="Beneficjenci (pigułki Brand Lime)"
              layout="pills"
              accent="lime"
              value={selectedBeneficiaries}
              onValueChange={setSelectedBeneficiaries}
              options={BENEFICIARY_OPTIONS}
            />

            <CheckboxGroup
              label="Źródła w analizie (CheckboxGroup)"
              value={historyFilter}
              onValueChange={setHistoryFilter}
              options={[
                {
                  value: "verified",
                  label: "Potwierdzone rejestry",
                  description: "UPRP, NCBR, PARP, PFR.",
                },
                {
                  value: "declared",
                  label: "Deklaracje opisowe",
                  description: "Dane wymagające weryfikacji PCI.",
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Standalone Checkbox, Switch & Stepper */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Checkbox (standardowy i indeterminate)
          </h3>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
            />
            <span>Tylko potwierdzone źródła</span>
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm">
            <Checkbox
              checked={false}
              indeterminate={indeterminateDemo}
              onChange={() => setIndeterminateDemo((v) => !v)}
            />
            <span>Stan częściowy (mixed)</span>
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Switch (z asynchronicznym pending i Brand Lime)
          </h3>
          <AsyncSwitchDemo />
          <Switch label="Tryb rekomendacji Brand Lime" accent="lime" defaultChecked />
          <AsyncSwitchDemo fail />
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[var(--color-text)]">
            Stepper (przytrzymaj + / − lub strzałki)
          </h3>
          <Stepper
            label="Minimalny poziom TRL"
            value={trlMin}
            onValueChange={setTrlMin}
            min={1}
            max={9}
            unit="TRL"
            hint="Zakres 1–9. Przytrzymanie przyspiesza zmianę."
          />
        </div>
      </div>
    </div>
  );
}
