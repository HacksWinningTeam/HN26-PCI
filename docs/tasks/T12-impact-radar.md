# `T12` — Impact Radar w panelu PCI oraz zbieranie danych o wdrożeniach i efektach

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack`
- **UI Design Required:** `Yes`
- **Depends On:** `—` (istniejące modele `ImplementationPlan`/`ImplementationStep`, `/workspace/plans/[id]` i `/admin`)
- **Traces To:** `REQ-11`, `DEC-033`

## Goal & User Outcome

Operator PCI widzi w nowej głównej zakładce **Impact Radar** w `/admin` rzeczywisty, czterostopniowy lejek transferu innowacji (**Utworzone plany → Rozpoczęte pilotaże → Potwierdzone wdrożenia → Zweryfikowane efekty**) oraz tabelę aktywnych transferów, bez żadnych danych mockowych. Dane do radaru płyną bezpośrednio z realnej pracy organizacji na pięciofazowej checkliście oraz z formularza raportowania wdrożenia i efektów w `/workspace/plans/[id]`, które operator PCI może jednym ruchem potwierdzić lub odesłać do uzupełnienia.

## Scope & Non-Goals

- **In Scope:**
  - Rozszerzenie `ImplementationPlan` o pola raportowania wdrożenia/efektów przez organizację oraz weryfikacji transferu przez operatora PCI.
  - Automatyczne rejestrowanie `pilot_started_at`, gdy organizacja rozpoczyna Fazę 3 lub 4 (`in_progress` / `completed`) w checkliście `ImplementationStep`.
  - Rozszerzenie `PATCH /api/implementation-plans/{id}/` o zapis raportu wdrożeniowego organizacji.
  - Nowe endpointy operatorskie (`IsPCIAdmin`): `GET /api/admin/impact-radar/` (rzeczywisty lejek + aktywne transfery) oraz `POST /api/admin/implementations/{id}/verify-transfer/` (potwierdzenie wdrożenia, weryfikacja efektu lub prośba o uzupełnienie).
  - Nowa domyślna zakładka **Impact Radar** w `/admin` (KPI, lejek transferu, `DataTable` aktywnych transferów + `TableDetailDrawer` z panelem weryfikacji PCI).
  - Sekcja **„Raport z wdrożenia i efektów (Impact Radar PCI)”** w `/workspace/plans/[id]`.
  - Testy jednostkowe i API (`pytest`) oraz pełna weryfikacja `make test`, `make lint`, `make schema-check`, `make migrations-check`, `make build-prod`.
- **Out of Scope:**
  - Jakiekolwiek sztuczne/mockowane liczniki lub przełączniki danych demonstracyjnych.
  - Publiczna publikacja poufnych uwag organizacji w katalogu bez zgody.
  - Tworzenie osobnych kont dla twórców innowacji (nadal poza MVP).

## UI Design (Per-Task)

- **Approved:** `2026-11-22 07:48` (user approved UI design: „wyglada git lecimy dalej”)
- **Route(s):**
  - `/admin` (`frontend/src/app/admin/page.tsx`) — nowa główna zakładka `radar` (**Impact Radar**)
  - `/workspace/plans/[id]` (`frontend/src/app/workspace/plans/[id]/page.tsx`) — sekcja raportowania wdrożenia i efektów
- **Reference Sketch / Assets:** Zdjęcie dostarczone przez użytkownika w rozmowie (`3. Flagowy WOW: Impact Radar w panelu PCI`), zaadaptowane do spójnego systemu wizualnego Praktoteka (WCAG 2.2 AA, 5 motywów kolorystycznych).
- **Layout & Information Hierarchy:**

  1. **`/admin` — zakładka `Impact Radar` (domyślna zakładka panelu PCI):**
     ```text
     +--------------------------------------------------------------------+
     | NavBar: "Impact Radar" | Breadcrumbs: Praktoteka > Panel PCI > ... |
     +--------------------------------------------------------------------+
     | [Hero Banner] PRAKTOTEKA / Impact Radar           [Badge: Panel PCI]|
     | Podpis: Rzeczywiste dane z planów wdrożeń i weryfikacji PCI         |
     | [Odśwież radar]   [Oczekujące weryfikacje: N]                       |
     +--------------------------------------------------------------------+
     | [MetricCard 1]        [MetricCard 2]                               |
     | Utworzone plany       Rozpoczęte pilotaże                          |
     | N                     N (% z planów)                               |
     | [MetricCard 3]        [MetricCard 4]                               |
     | Potwierdzone wdroż.   Zweryfikowane efekty                         |
     | N (% z pilotaży)      N (% z wdrożeń) · N odbiorców                |
     +--------------------------------------------------------------------+
     | CardSurface: "Lejek transferu innowacji"                           |
     |  1. Utworzone plany        [====================]  N  (100%)       |
     |  2. Rozpoczęte pilotaże    [========            ]  N  (X%)         |
     |  3. Potwierdzone wdrożenia [====                ]  N  (X%)         |
     |  4. Zweryfikowane efekty   [==                  ]  N  (X%)         |
     +--------------------------------------------------------------------+
     | DataTable: "Aktywne transfery i weryfikacja PCI"                   |
     | Toolbar: wyszukiwarka + filtr Etapu + filtr Statusu PCI            |
     | Kolumny: Innowacja | Organizacja | Etap | Odbiorcy / Raport |      |
     |          Status PCI | Działania ("Szczegóły / Weryfikuj")          |
     +--------------------------------------------------------------------+
     | TableDetailDrawer (po kliknięciu wiersza / "Weryfikuj"):           |
     | - Podsumowanie organizacji, lokalizacji i postępu faz (X/5)        |
     | - Zgłoszony etap, data startu, objęci odbiorcy, efekty, link dowód |
     | - Pole notatki PCI (opcjonalne / wymagane przy "Do uzupełnienia")  |
     | - Akcje: [Potwierdź wdrożenie] [Zweryfikuj efekt] [Do uzupełnienia]|
     +--------------------------------------------------------------------+
     ```

  2. **`/workspace/plans/[id]` — sekcja raportowania wdrożenia i efektów:**
     ```text
     +--------------------------------------------------------------------+
     | Sekcja: "Raport z wdrożenia i efektów"  [Badge: Status PCI]        |
     | (wyświetla ewentualną uwagę PCI jeśli status = Do uzupełnienia)     |
     | - Dropdown: Etap realizacji w organizacji                          |
     |   (Planowanie / Trwa pilotaż / Wdrożono w praktyce / Wstrzymano)   |
     | - DateInput (type="date"): Data rozpoczęcia pilotażu lub wdrożenia |
     | - NumberInput: Liczba objętych odbiorców / użytkowników            |
     | - TextArea: Zmierzone efekty (odniesienie do mierników sukcesu)    |
     | - TextInput (type="url"): Link do potwierdzenia / raportu (opc.)   |
     | - Button: [Zapisz raport wdrożeniowy] + aria-live potwierdzenie    |
     +--------------------------------------------------------------------+
     ```

- **Components (Reused vs. New):**
  - Reused z `docs/02-ui-system.md` / `@/components/ui`:
    - `AppShellLayout`, `Sidebar`, `NavBar`, `CardSurface`, `MetricCard`, `Badge`, `Banner`, `Button`, `DataTable`, `TableDetailDrawer`, `DefinitionList`, `Dropdown`, `TextInput`, `NumberInput`, `TextArea`, `LoadingState`, `EmptyState`, `ErrorState`, `BrandBlobSoftBlueIcon`, `BrandBlobLimeIcon`, `BrandLimeBurstIcon`, `BrandVerifiedSealIcon`, `TargetIcon`, `CheckCircleIcon`, `ClockIcon`, `ChartBarIcon`, `RefreshIcon`.
  - New components (lokalne dla funkcji):
    - `ImpactRadarPanel` (`frontend/src/components/admin/ImpactRadarPanel.tsx`): renderuje hero radaru, siatkę 4 `MetricCard`, sekcję proporcjonalnego lejka transferu, `DataTable` aktywnych transferów oraz `TableDetailDrawer` z formularzem decyzji operatora PCI.
- **Interactive States:**
  - **Loading:** `LoadingState` dla całego panelu lub szkieletowe `MetricCard state="loading"` podczas odświeżania; przyciski akcji w drawerze pokazują `loading` i `disabled` w trakcie requestu.
  - **Empty:** Jeśli w bazie nie ma jeszcze wygenerowanych planów (`created_plans === 0`), wszystkie 4 liczniki i paski lejka pokazują uczciwe `0`, a tabela pokazuje `EmptyState` z informacją, że transfery pojawią się po utworzeniu pierwszego planu wdrożeniowego przez organizację.
  - **Error:** `ErrorState` z przyciskiem `Spróbuj ponownie` przy błędzie pobrania `/api/admin/impact-radar/`, oraz `Banner tone="error" announcement="assertive"` przy błędzie zapisu decyzji PCI lub raportu organizacji.
  - **Success:** Po zapisaniu raportu na `/workspace/plans/[id]` lub decyzji PCI w drawerze `/admin` następuje natychmiastowe odświeżenie lejka/tabeli i komunikat w `Banner tone="success" announcement="polite"`.
- **API Fields & Contracts Consumed (same-origin `/api/...`):**
  - `GET /api/admin/impact-radar/`:
    - `funnel`: `{ created_plans: number, started_pilots: number, confirmed_deployments: number, verified_effects: number, awaiting_pci_review: number, total_reached_beneficiaries: number }`
    - `transfers`: array of `{ plan_id, user_email, user_name, organization_name, organization_type, deployment_location, innovation_slug, innovation_title, primary_area, variant, stage_key, stage_label, current_phase, completed_steps_count, total_steps_count, pilot_started_at, adopter_deployment_status, deployment_started_on, reached_beneficiaries_count, outcome_summary, evidence_url, deployment_reported_at, pci_transfer_status, pci_transfer_note, pci_transfer_verified_at, awaiting_pci_review, updated_at }`
  - `POST /api/admin/implementations/{plan_id}/verify-transfer/`:
    - Request: `{ pci_transfer_status: "deployment_confirmed" | "effect_verified" | "needs_clarification", pci_transfer_note?: string }`
    - Response: zaktualizowany wiersz transferu (`AdminImpactTransferSerializer`).
  - `PATCH /api/implementation-plans/{plan_id}/`:
    - Request rozszerzony o opcjonalne: `{ user_reported_issues?, adopter_deployment_status?, deployment_started_on?, reached_beneficiaries_count?, outcome_summary?, evidence_url? }`
    - Response: zaktualizowany `ImplementationPlanSerializer` zawierający nowe pola raportu i status weryfikacji PCI.
- **WCAG 2.2 AA Checks:**
  - Pełna zgodność ze wszystkimi 5 motywami (`light`, `dark`, `hc-black-white`, `hc-black-yellow`, `grayscale`) przez tokeny `--color-*` (zero hardkodowanych kolorów tła/tekstu).
  - Kontrast tekstu `>= 4.5:1`, obramowań/pasków `>= 3:1`, wyraźne `:focus-visible`.
  - Wszystkie przyciski, pola formularza i wiersze klikalne `>= 44px` (`min-h-11`).
  - Lejek transferu posiada pełne etykiety tekstowe (nazwa etapu, liczba, procent konwersji) oraz `role="img"` / `aria-label` lub semantyczną listę `<ol>` z `<progress>`/paskiem o `aria-hidden="true"`, dzięki czemu nie polega na samym kolorze.
  - Statusy PCI i etapy transferu używają `Badge` z ikoną/tekstem, nigdy samego koloru.

## Technical Implementation Plan

- **Backend (`backend/`):**
  - Models / Migrations (`backend/apps/implementation/models.py`, `migrations/0003_...`):
    - Pola na `ImplementationPlan`: `pilot_started_at`, `adopter_deployment_status`, `deployment_started_on`, `reached_beneficiaries_count`, `outcome_summary`, `evidence_url`, `deployment_reported_at`, `pci_transfer_status`, `pci_transfer_note`, `pci_transfer_verified_at`, `pci_transfer_verified_by`.
  - Services / Views / Serializers (`backend/apps/implementation/`):
    - `serializers.py`: rozszerzenie `ImplementationPlanSerializer` i `ImplementationPlanUpdateSerializer`; dodanie `AdminImpactFunnelSerializer`, `AdminImpactTransferSerializer`, `AdminImpactRadarSerializer`, `AdminTransferVerifySerializer`.
    - `views.py`:
      - W `ImplementationStepUpdateView.patch`: automatyczne ustawienie `pilot_started_at` przy przejściu Fazy 3–5 w `in_progress` lub `completed`.
      - W `ImplementationPlanDetailView.patch`: zapis pól raportowania wdrożenia/efektów, walidacja i ustawienie `deployment_reported_at` (oraz reset `needs_clarification -> unverified` przy nowym raporcie).
      - Nowy `AdminImpactRadarView` (`GET /api/admin/impact-radar/`, `IsPCIAdmin`) z prawdziwą agregacją lejka i listy transferów.
      - Nowy `AdminTransferVerifyView` (`POST /api/admin/implementations/<int:pk>/verify-transfer/`, `IsPCIAdmin`) z walidacją przejść (np. `effect_verified` wymaga podanych efektów lub liczby odbiorców; `needs_clarification` wymaga notatki `pci_transfer_note`).
    - `urls.py`: dodanie ścieżek `admin/impact-radar/` i `admin/implementations/<int:pk>/verify-transfer/`.
  - Unit Tests (`backend/apps/implementation/tests.py`):
    - Automatyczne oznaczanie `pilot_started_at` przy aktualizacji Fazy 3/4.
    - Zapis raportu wdrożeniowego i efektów przez właściciela planu + blokada dostępu przez innego użytkownika.
    - Uprawnienia `IsPCIAdmin` dla `GET /api/admin/impact-radar/` i `POST /api/admin/implementations/<id>/verify-transfer/`.
    - Walidacja weryfikacji efektów (brak `outcome_summary`/odbiorców -> `400`, brak notatki dla `needs_clarification` -> `400`).
    - Poprawność zliczeń lejka `created_plans` / `started_pilots` / `confirmed_deployments` / `verified_effects` po kolejnych krokach.
- **Frontend (`frontend/`):**
  - `frontend/src/lib/radar-labels.ts`: etykiety dla `AdopterDeploymentStatus`, `PciTransferStatus`, `TransferStageKey`.
  - `frontend/src/lib/radar-api.ts`: rozszerzenie `ImplementationPlan` i `updateImplementationPlanReport`, dodanie `fetchAdminImpactRadar`, `verifyAdminTransfer`.
  - `frontend/src/components/admin/ImpactRadarPanel.tsx`: komponent zakładki Impact Radar (4 KPI, lejek transferu, `DataTable` + `TableDetailDrawer` z weryfikacją PCI).
  - `frontend/src/app/admin/page.tsx`: dodanie zakładki `"radar"` jako pierwszej i domyślnej zakładki w panelu PCI.
  - `frontend/src/app/workspace/plans/[id]/page.tsx`: sekcja formularza raportu wdrożenia i efektów z widocznym statusem weryfikacji PCI.
- **Config / Env:** Brak zmian.

## Acceptance Criteria

- [x] Nowa domyślna zakładka **Impact Radar** w `/admin` wyświetla 4 rzeczywiste liczniki KPI (`Utworzone plany`, `Rozpoczęte pilotaże`, `Potwierdzone wdrożenia`, `Zweryfikowane efekty`), proporcjonalny lejek transferu oraz tabelę aktywnych transferów.
- [x] Wszystkie liczby w radarze pochodzą wyłącznie z bazy danych (`ImplementationPlan` / `ImplementationStep`), bez jakichkolwiek danych mockowych.
- [x] Przejście Fazy 3 lub 4 w `/workspace/plans/[id]` na `Rozpoczęty`/`Ukończony` automatycznie zwiększa licznik `Rozpoczęte pilotaże` w Impact Radarze.
- [x] Organizacja może w `/workspace/plans/[id]` zgłosić status pilotażu/wdrożenia, datę startu, liczbę objętych odbiorców, zmierzone efekty i opcjonalny link dowodowy.
- [x] Operator PCI może w drawerze szczegółów na `/admin` potwierdzić wdrożenie (`Potwierdzone wdrożenia`), zweryfikować efekty (`Zweryfikowane efekty`) lub odesłać zgłoszenie do uzupełnienia z notatką.
- [ ] Wszystkie motywy WCAG 2.2 AA i responsywność na mobile/desktop działają poprawnie bez błędów konsoli. *(Oczekuje na ręczne potwierdzenie w przeglądarce.)*

## Verification Checklist

### Automated Checks
- [x] `make test` passes (75 passed in Docker PostgreSQL, w tym `test_impact_radar_real_collection_and_pci_verification`)
- [x] `make lint` passes (`ruff check .`, `npm run typecheck`, `npm run lint`)
- [x] `make schema-check` passes (`python manage.py spectacular --validate --fail-on-warn`)
- [x] `make migrations-check` passes (`No changes detected`); `implementation.0003` applied cleanly
- [x] `make build-prod` passes (`django-nextjs-backend:prod` + `django-nextjs-frontend:prod` with `npm run build`)
- [x] Frontend unit tests (`node --test ...`) pass (50/50)

### Manual Verification
1. Zaloguj się jako organizacja (np. `soltys@trzebownisko.pl`), otwórz plan w `/workspace/plans/[id]`, oznacz Fazę 3 jako `Rozpoczęty`, wypełnij raport wdrożenia (np. `Wdrożono w praktyce`, 85 odbiorców, opis efektu) i zapisz.
2. Zaloguj się jako operator PCI (`admin@pcinn.org`), otwórz `/admin` -> domyślna zakładka **Impact Radar**: sprawdź wzrost liczników `Utworzone plany` i `Rozpoczęte pilotaże`, otwórz wiersz w tabeli i kliknij **Potwierdź wdrożenie**, a następnie **Zweryfikuj efekt**.
3. Odśwież `/admin` i `/workspace/plans/[id]` — potwierdź trwałość danych w PostgreSQL, aktualizację słupków lejka oraz widoczność statusu weryfikacji PCI po stronie organizacji.

### Sign-Off
- **Verified By:** `<User>` on `<YYYY-MM-DD HH:MM>`
- **Notes / Follow-Ups:** `—`
