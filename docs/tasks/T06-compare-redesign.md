# `T06` — Redesign Innovation Comparison Screen (`/compare`)

- **Status:** `VERIFIED`
- **Layer:** `Frontend`
- **UI Design Required:** `Yes`
- **Depends On:** None — refactor of existing `/compare` screen and existing APIs
- **Traces To:** REQ-05, REQ-06, REQ-13, DEC-004, DEC-005, DEC-014, DEC-023, DEC-024, DEC-025

## Goal & User Outcome

Użytkownik może czytelnie zestawić 2–3 wybrane innowacje obok siebie w spójnym wizualnie i dostępnym interfejsie, szybko wychwycić kluczowe różnice, ocenić wiarygodność źródeł oraz dopasowanie 40/20/20/20, wyeksportować zestawienie (CSV/PDF) lub zapisać je na koncie i przejść bezpośrednio do szczegółów oraz planu wdrożenia.

## Scope & Non-Goals

- **In Scope:**
  - Zastąpienie surowych kontrolek HTML na `/compare` komponentami z `@/components/ui` (`Dropdown`, `Button`, `IconButton`, `Badge`, `StatusIndicator`, `Banner`, `CardSurface`, `Switch`, `LoadingState`, `EmptyState`, `ErrorState`).
  - Przebudowa paska wyboru 2–3 slotów innowacji (wyszukiwalne `Dropdown`, blokowanie duplikatów między slotami, pojedyncze i grupowe czyszczenie, szybkie ładowanie przykładu).
  - Dodanie czytelnych stanów ładowania i błędu (z ponowną próbą) przy pobieraniu katalogu i szczegółów.
  - Wyraźne podsumowanie kluczowych różnic (`Banner`) oraz opcjonalny przełącznik „Pokaż tylko różnice”.
  - Uporządkowana, podzielona na sekcje matryca porównawcza z wyróżnieniem najwyższych ocen za pomocą tekstu/ikony i koloru (WCAG 2.2 AA), skalą 0–5 + `%` (`scoreToFiveScale`), rozbiciem dopasowania 40/20/20/20 (gdy aktywne), rozdzieleniem obszaru od lokalizacji pochodzenia oraz czytelną obsługą wydruku/PDF.
- **Out of Scope:**
  - Zmiany w backendzie, modelach, migracjach czy kontraktach API (`/api/innovations/`, `/api/comparisons/`).
  - Dodawanie nowych prymitywów do `docs/02-ui-system.md` lub `frontend/src/components/ui/`.
  - Zmiana limitu porównywanych innowacji (pozostaje 2–3) ani mechanizmu `SessionProvider` (`compareSlugs`).

## UI Design (Per-Task)

- **Approved:** 2026-11-22 02:44 (user approved: "zatawierdzam projekt ez")
- **Route(s):** `/compare` (wewnątrz `AppShell`; tytuł `Porównanie innowacji`, okruszki `Praktoteka / Porównanie`).
- **Reference Sketch / Assets:** istniejące `frontend/src/app/compare/page.tsx`, `/innovations`, `/innovations/[id]`, `/workspace` oraz `/design-system`. Brak dodatkowych plików w `docs/inputs/ui/`.
- **Layout & Information Hierarchy:**
  ```text
  AppShell (Sidebar + NavBar: Porównanie innowacji)
  ├── Pasek akcji i kontekstu (CardSurface subtle)
  │   ├── Krótka instrukcja + granica konta (publiczne porównanie/eksport vs zapis po zalogowaniu)
  │   └── [Switch: Tylko różnice] [Eksportuj CSV] [Eksportuj PDF] [Zapisz porównanie / Zaloguj się]
  ├── Błędy / potwierdzenie zapisu (Banner tinted polite/assertive, link do /workspace)
  ├── Wybór innowacji do porównania (CardSurface outline, print:hidden)
  │   ├── Nagłówek: ikona wagi + „Wybrane innowacje (n/3)” + [Załaduj przykład] / [Wyczyść]
  │   └── Siatka 3 slotów (1 col mobile / 3 col md+): Dropdown(searchable) + opcja usunięcia slotu
  └── Główny obszar zestawienia:
      ├── Loading -> LoadingState (aria-busy)
      ├── Error (błąd pobrania katalogu/wszystkich szczegółów) -> ErrorState z przyciskiem [Spróbuj ponownie]
      ├── Empty (< 2 wybrane innowacje) -> EmptyState z BrandScalesIcon, info o ew. 1 wybranej karcie,
      │   [Załaduj przykładowe porównanie (2 innowacje)] oraz link [Przeglądaj katalog innowacji]
      └── Matrix (2 lub 3 innowacje):
          ├── Banner (tone="info"): Kluczowe różnice (obszar, poziom wdrożenia, TRL, wiarygodność, lider dopasowania)
          └── Keyboard-scrollable region (role="region" tabIndex=0 aria-label="Tabela porównawcza innowacji")
              └── Semantic <table> (sticky col header / sticky first column na md+, Zebra + tokeny semantic)
                  ├── THEAD: [Kryterium] | Kolumny 1..3: Badge obszaru + StatusIndicator weryfikacji +
                  │          Link tytułu (/innovations/[slug]) + Organizacja · Lokalizacja + [Usuń z porównania]
                  ├── Sekcja 1: Dopasowanie do potrzeby (zgodność %, powód główny, rozbicie 40/20/20/20 lub CTA do /innovations?mode=problem)
                  ├── Sekcja 2: Zakres i dojrzałość (problem, obszar vs charakter, branża, beneficjenci, poziom wdrożenia, TRL)
                  ├── Sekcja 3: Ocena systemu (Innowacyjność, Potencjał zastosowania, Możliwość transferu, Wiarygodność — skala 0–5 + % + pasek + Badge „Najwyższy”)
                  └── Sekcja 4: Źródła, ryzyka i kolejny krok (jakość źródeł + rejestry + metoda, mocne strony, ryzyka, wymagane zasoby, braki, następny krok, CTA [Szczegóły i plan →])
  ```
- **Components (Reused vs. New):**
  - **Reused (`@/components/ui` & app components):** `CardSurface`, `Button`, `IconButton`, `Dropdown` (`searchable`), `Badge`, `StatusIndicator`, `Banner`, `Switch`, `LoadingState`, `EmptyState`, `ErrorState`, `BrandScalesIcon`, `BrandBookmarkIcon`, `CheckCircleIcon`, `CloseIcon`, `CsvIcon`, `PdfIcon`, `ArrowRightIcon`, `SparkleIcon`, `ShieldCheckIcon`.
  - **Reused helpers:** `useSession`, `fetchInnovations`, `fetchInnovationDetail`, `saveComparison`, `downloadCsvFile`, `formatComparisonCsv`, `scoreToFiveScale`, etykiety z `radar-labels.ts`.
  - **New (page-local / helper only if needed):** ewentualny czysty helper porównujący wiersze (wykrywanie różnic i obliczanie podsumowania różnic) w `frontend/src/lib/` z testem jednostkowym `node --test` oraz lokalne komponenty prezentacyjne w `frontend/src/app/compare/page.tsx`. Bez zmian w globalnych prymitywach.
- **Interactive States:**
  - **Loading:** `LoadingState` przy pierwszym ładowaniu listy innowacji lub szczegółów wybranych slotów (`aria-busy="true"`). Przyciski eksportu i zapisu zablokowane, dopóki wczytanych szczegółów jest `< 2`.
  - **Empty (`< 2` innowacje):** `EmptyState` z czytelną informacją, ile pozycji wybrano (0 lub 1 z nazwą wybranej innowacji), przyciskiem szybkiego załadowania 2 przykładowych rekordów oraz linkiem do `/innovations`.
  - **Error:** pełnoekranowy `ErrorState` z akcją `Spróbuj ponownie` przy błędzie pobrania katalogu; `Banner` `tone="error"` przy błędzie zapisu porównania lub problemie z wczytaniem pojedynczego slota (z możliwością usunięcia uszkodzonego slota).
  - **Success:** `Banner` `tone="success"` (`announcement="polite"`) po zapisaniu porównania na koncie, z linkiem do `/workspace`; stan ładowania na przycisku zapisu (`loading={saving}`) zapobiegający wielokrotnemu wysłaniu.
- **API Fields & Contracts Consumed (same-origin `/api/...`):**
  - `GET /api/innovations/` (`InnovationSummary[]`): `slug`, `title_pl`, `organization_name`, `primary_area` do wypełnienia list wyboru oraz przykładowego porównania.
  - `GET /api/innovations/{slug}/` (`InnovationDetail`): `slug`, `title_pl`, `organization_name`, `origin_location`, `problem_pl`, `primary_area`, `innovation_character`, `sectors`, `beneficiary_groups`, `deployment_level`, `trl`, `verification_status`, `verification_method`, `sources` (`registry`), `scores` (`innovativeness`, `application_potential`, `transferability`, `credibility`), `strengths`, `risks`, `required_resources`, `missing_info`, `suggested_next_step`.
  - `POST /api/comparisons/` (`saveComparison`): `title`, `innovation_slugs`, `query_context` (`solveContext`).
  - Kontekst z `SessionProvider`: `compareSlugs`, `setCompareSlugs`, `clearCompare`, `matchBySlug` (`overall_score`, `problem_score`, `sector_score`, `beneficiary_score`, `organization_fit_score`, `primary_reason`), `solveContext`, `auth.authenticated`.
- **WCAG 2.2 AA Checks:**
  - Semantyczne tokeny motywu (jasny bazowy + obsługa wszystkich 5 wariantów motywów z `globals.css`), kontrast tekstu `>= 4.5:1`, obramowań i kontrolek `>= 3:1`.
  - Wszystkie przyciski, linki akcji i kontrolki mają wysokość/cel min. `44px` (`min-h-11`), widoczny `:focus-visible`.
  - Wyróżnienie najwyższego wyniku nie polega wyłącznie na kolorze — każda komórka lidera ma tekstowy i ikonowy wskaźnik (`Badge` z `CheckCircleIcon` i etykietą `Najwyższy`).
  - Region przewijania tabeli ma `role="region"`, `tabIndex={0}` i opisowy `aria-label`; wiersze używają `<th scope="row">`, kolumny `<th scope="col">`.
  - Komunikaty statusu zapisu i błędów ogłaszane przez `Banner` (`role="status"` / `role="alert"`).
  - Weryfikacja klawiatury, szerokości `320px` i powiększenia `200%` (brak nakładania się etykiet i brak wymuszonego przewijania całej strony).

## Technical Implementation Plan

- **Backend:** bez zmian.
- **Frontend:**
  1. Wydzielić/opracować czyste funkcje pomocnicze (np. wykrywanie identyczności wierszy dla filtra „Tylko różnice” i budowanie różnic) z testami jednostkowymi `*.test.mjs`, jeśli logika jest nietrywialna.
  2. Przebudować `frontend/src/app/compare/page.tsx` z wykorzystaniem komponentów `@/components/ui` zgodnie z powyższą specyfikacją.
  3. Zachować kompatybilność z `formatComparisonCsv`, `SessionProvider` oraz stylami wydruku (`print:hidden`, czytelny PDF).
- **Config / Env:** bez zmian.

## Acceptance Criteria

- [x] Użytkownik zatwierdził projekt UI (`DESIGN_READY`) przed implementacją.
- [x] Wybór 2–3 innowacji działa płynnie bez możliwości zdublowania tego samego rekordu w dwóch slotach, z wyszukiwaniem w `Dropdown` oraz czyszczeniem slotów.
- [x] Stany ładowania, błędu i pustego porównania używają wspólnych komponentów i dają jasną ścieżkę dalszego działania.
- [x] Matryca prezentuje wszystkie dotychczasowe kryteria plus lokalizację pochodzenia, zasoby oraz rozbicie dopasowania 40/20/20/20 (gdy dostępny jest opis problemu), a przełącznik „Tylko różnice” poprawnie filtruje identyczne kryteria.
- [x] Najwyższe oceny mają wskaźnik nieoparty wyłącznie na kolorze; eksport CSV, wydruk PDF i zapis porównania (z bramką logowania dla gościa) działają bez regresji.
- [x] Przechodzi `typecheck`, `lint`, testy jednostkowe, build produkcyjny i weryfikacja ręczna na desktopie/mobile/200% zoom.

## Verification Checklist

### Automated Checks

- [x] `npm run typecheck`, `npm run lint`, `npm test` (47/47 przeszły; w tym 4 nowe testy w `frontend/src/lib/compare-helpers.test.mjs`; istniejące ostrzeżenia Node `MODULE_TYPELESS_PACKAGE_JSON`), lokalny `npm run build -- --webpack` oraz `git diff --check`.
- [x] Testy jednostkowe dla nowej/wydzielonej logiki porównywarki (`frontend/src/lib/compare-helpers.test.mjs`).
- `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`: **nieuruchomione** — polecenie `docker` jest niedostępne w środowisku piaskownicy (`operation not permitted: docker`); nie wprowadzono żadnych zmian backendowych, schematu ani migracji.

### Manual Verification

1. Otwórz `/compare` z pustym koszykiem porównania — sprawdź `EmptyState`, załaduj przykładowe porównanie i sprawdź przejście do widoku 2 innowacji.
2. Dodaj 3. innowację przez wyszukiwalny `Dropdown`, sprawdź blokadę duplikatów między slotami oraz usuwanie pojedynczego slota i czyszczenie całego zestawienia.
3. Włącz „Tylko różnice” i zweryfikuj ukrywanie identycznych wierszy.
4. Przejdź ze ścieżki z opisem problemu (`/innovations?mode=problem`) do `/compare` i sprawdź widoczność wyniku oraz rozbicia 40/20/20/20.
5. Sprawdź eksport CSV, podgląd wydruku (`Eksportuj PDF`) oraz zapis porównania jako gość (przekierowanie na `/login?next=/compare`) i jako zalogowany użytkownik (potwierdzenie + link do `/workspace`).
6. Sprawdź obsługę klawiaturą (w tym focus regionu tabeli), szerokość `320px`, zoom `200%` oraz przełączanie motywów/języka.

### Sign-Off

- **Verified By:** User (manual confirmation: "dobra siedzi commitujemy", 2026-11-22 02:49)
- **Notes / Follow-Ups:** Uproszczono układ i dopracowano spójność wizualną z resztą aplikacji Praktoteka zgodnie z `DEC-024` oraz ukryto przycisk logowania do zapisu dla gości (`DEC-025`). Zatwierdzone do lokalnego commita `T06`.
