# Praktoteka — Radar Innowacji PCI

Radar Innowacji dla Podkarpackiego Centrum Innowacji (HackNation 2026). Aplikacja zbiera dane o polskich rozwiązaniach technologicznych, edukacyjnych i administracyjnych z publicznych źródeł, porządkuje je i prowadzi odbiorcę od opisu problemu lub katalogu, przez porównanie, aż po pięciofazowy plan wdrożenia.

Dodatkowe opisy dla oceniających:
- [`docs/USER_FLOW.md`](docs/USER_FLOW.md) — nawigacja krok po kroku, granice logowania, zmiana konta na operatora PCI i scenariusz demo.
- [`AI_USAGE.md`](AI_USAGE.md) — rola AI, obliczenia regułowe, dane wejściowe i interpretacja rekomendacji.
- [`DATA_SOURCES.md`](DATA_SOURCES.md) — lista źródeł, sposób cyklicznego pobierania, obsługa duplikatów/konfliktów i ochrona danych.

---

## Jak działa produkt

### Bez logowania (odkrywanie i porównanie)
- **Wspólne wyszukiwanie (`/innovations`):** katalog z filtrami i rozwijany opis problemu w jednym miejscu (dawny adres `/solve` przekierowuje tutaj z zachowaniem parametrów).
- **Dopasowanie 40 / 20 / 20 / 20:** zapytanie problemowe dostaje wynik rozbity na zbieżność opisu (40%), branżę (20%), grupy beneficjentów (20%) i typ organizacji (20%) wraz z oceną kompletności opisu.
- **Karta innowacji (`/innovations/[id]`):** opis rozwiązania, źródła, wyekstrahowane dowody, ocena kryteriów Oslo Manual 2018, wstępne indeksy jakości oraz oznaczenie pochodzenia wartości (ze źródła, potwierdzone przez PCI, szacunek regułowy lub AI).
- **Porównywarka 2–3 projektów (`/compare`):** zestawienie dojrzałości, TRL, składowych dopasowania, jakości dowodów i różnic między rozwiązaniami oraz eksport do JSON, Markdown i CSV.
- **„Powiadom mnie”:** zapis zapytania i kontaktu do osoby zainteresowanej rozwiązaniem — kolejny punkt kontaktu między potrzebami organizacji a rozwijającym się katalogiem innowacji.

### Po rejestracji (plan i realizacja)
- **Kontekst organizacji:** ankieta w panelu „Zaplanuj wdrożenie” na karcie innowacji (typ i nazwa instytucji, rola, lokalizacja, skala odbiorców, obecne podejście, zasoby, kompetencje, termin i ograniczenia). „Moje wdrożenia” (`/workspace`) zbiera zapisane innowacje, porównania i plany.
- **Plan wdrożeniowy (`/workspace/plans/[id]`):** system dobiera jeden z trzech wariantów (walidacja, pilotaż albo transfer/wdrożenie) i konkretną ścieżkę działania (np. kontakt z właścicielem IP przy aktywnym patencie, partnerstwo, pilotaż lub transfer). Plan ma pięć faz, blokery braków, ryzyka, mierniki sukcesu, interaktywną checklistę oraz dane kontaktowe ze źródła lub weryfikacji PCI. Gotowy plan można wyeksportować do JSON, Markdown i CSV.
- **Raportowanie efektów:** na końcu planu organizacja zgłasza przygotowania, rozpoczęcie pilotażu lub zakończenie wdrożenia; uzupełnia opis efektu, mierniki przed/po, liczbę odbiorców i preferencję widoczności podsumowania. Może dodać, pobrać lub usunąć jeden załącznik z wynikami (do 10 MB), przechowywany w PostgreSQL. Załącznik pobiera właściciel planu lub operator PCI.

### Panel operatora PCI (`/admin`)
- **Impact Radar:** lejek utworzonych planów, rozpoczętych pilotaży, wdrożeń i zweryfikowanych efektów oraz tabela transferów między organizacją wdrażającą i organizacją źródłową. Liczniki wynikają z zapisanych planów i raportów. Licznik wdrożeń obejmuje również zakończenia zgłoszone przez organizację; weryfikacja efektu wymaga osobnego potwierdzenia PCI.
- Weryfikacja raportów: potwierdzenie wdrożenia, zweryfikowanie efektu albo prośba o uzupełnienie z notatką operatora.
- Przegląd rekordów oczekujących na weryfikację (`pending_review`), oznaczonych konfliktem (`conflict`), nieaktualnych (`stale`) i niekompletnych w tabeli z sortowaniem, filtrowaniem i historią zmian (`InnovationAuditLog`).
- Edycja pól rekordu (w tym `deployment_level`, `trl`, `oslo_compliant`) z oznaczeniem `pci_verified`.
- Wykrywanie potencjalnych duplikatów (podobieństwo ≥ 72%) i scalanie rekordów bez utraty źródeł.
- Konfiguracja kanałów `SourceFeed`, uruchamianie synchronizacji oraz ręczny import pojedynczego adresu URL (HTML, JSON, XML/RSS/OAI-PMH, PDF).
- Podgląd planów wdrożeniowych organizacji, ich bieżącej fazy i zgłaszanych trudności.

### Dostępność i języki
- Pięć motywów (jasny, ciemny, dwa warianty wysokiego kontrastu, skala szarości), skalowanie tekstu 25%–200%, podkreślanie linków i odczyt na głos (`speechSynthesis`) w panelu „Dostępność”, otwieranym z górnej nawigacji publicznej lub panelu bocznego aplikacji.
- Wspólne komponenty korzystają z katalogu i18n w języku polskim (domyślnym) i angielskim. Opisy innowacji i treści domenowe prezentują kontekst polskiego ekosystemu innowacji.

---

## Architektura i technologie

```text
Przeglądarka (same-origin)
  └── Next.js 16 (App Router, src/proxy.ts / SSR przez API_INTERNAL_URL)
        └── Django 5.2 LTS + DRF + drf-spectacular
              ├── PostgreSQL 18 (dane + blokady pg_try_advisory_lock)
              ├── Worker pobierania (apps.ingestion -> API / RSS / OAI-PMH / PDF)
              └── Opcjonalnie: Google Gemini REST API (ekstrakcja, ocena jakości, stylizacja planu)
```

- **Backend:** Python 3.12, Django 5.2 LTS, Django REST Framework, `drf-spectacular`, `psycopg[binary]`, `pypdf`, Gunicorn + WhiteNoise (`prod`), zarządzane przez `uv`.
- **Baza danych:** PostgreSQL 18 (`postgres:18-alpine`).
- **Frontend:** Node 22, Next.js 16 (`output: "standalone"`), React 19, TypeScript, Tailwind CSS v4, `@phosphor-icons/react`, ESLint 9, zarządzane przez `npm`.
- **Konteneryzacja:** Docker Compose (`compose.yaml` lokalnie, `compose.prod.yaml` na produkcji z jednym wystawionym portem `FRONTEND_PORT`).

### Główne katalogi

- `backend/apps/accounts/` — konta, sesje, profil organizacji (`AdopterProfile`), uprawnienia PCI.
- `backend/apps/core/` — healthcheck API oraz klient Google Gemini (`gemini.py`).
- `backend/apps/discovery/` — wyszukiwanie problemowe 40/20/20/20, porównywarka, zapisane zestawy, alerty i anonimowa analityka.
- `backend/apps/implementation/` — logika planu wdrożeniowego, 5 faz, checklista i eksporty.
- `backend/apps/innovations/` — katalog, detale (poziom 2 i 3), oceny jakości (`assessment.py`), eksporty.
- `backend/apps/ingestion/` — adaptery źródeł, pipeline aktualizacji, klasyfikacja regułowa/AI, deduplikacja i audyt.
- `frontend/src/` — widoki App Router, biblioteka komponentów, motywów i i18n, proxy do backendu (`src/proxy.ts`).

---

## Uruchomienie lokalne (Docker Compose)

1. Opcjonalnie utwórz plik `.env` na bazie szablonu:

   ```bash
   cp .env.example .env
   ```

   Domyślna konfiguracja w `compose.yaml` uruchamia lokalny stos bez dodatkowych sekretów. Aby włączyć wsparcie Google Gemini, wpisz `GEMINI_API_KEY` w `.env`. Warstwa regułowa obsługuje wyszukiwanie, ranking, import, wiarygodność i plan bazowy. Gemini rozszerza ją o opracowanie tekstów, ocenę innowacyjności i potencjału zastosowania oraz personalizację działań. Szczegóły: [`AI_USAGE.md`](AI_USAGE.md).

2. Zbuduj i uruchom stos:

   ```bash
   make up
   # lub w tle:
   make up-d
   ```

   Opcjonalny worker cyklicznego pobierania w trybie deweloperskim:

   ```bash
   docker compose --profile ingestion up -d ingestion
   ```

   W `compose.prod.yaml` worker uruchamia się automatycznie co `INGESTION_INTERVAL_SECONDS` (domyślnie `3600` s, minimum `60` s).

3. Konta startowe tworzą się automatycznie podczas startu backendu z migracjami, gdy `BOOTSTRAP_DEMO_ACCOUNTS=true` (domyślnie w obu konfiguracjach Compose): operator `admin@pcinn.org`, organizacja demonstracyjna `soltys@trzebownisko.pl` i tester `tester@test.com`. Dane logowania i przykładowy profil są zdefiniowane w [`ensure_demo_accounts.py`](backend/apps/accounts/management/commands/ensure_demo_accounts.py). Polecenie tworzy brakujące konta; istniejących haseł i profili nie nadpisuje.

   `BOOTSTRAP_DEMO_ACCOUNTS=false` wyłącza tworzenie tych kont, zachowując już istniejące. Własnego operatora możesz utworzyć poleceniem:

   ```bash
   make createsuperuser
   ```

4. Dostępne adresy (wszystko przez jeden port proxy Next.js):

| Usługa | Adres przez proxy | Adres bezpośredni (dev) |
| --- | --- | --- |
| Aplikacja | http://localhost:3000 | — |
| Panel operatora PCI | http://localhost:3000/admin | — |
| Swagger UI | http://localhost:3000/api/docs/ | http://localhost:8000/api/docs/ |
| ReDoc | http://localhost:3000/api/redoc/ | http://localhost:8000/api/redoc/ |
| Schemat OpenAPI | http://localhost:3000/api/schema/ | http://localhost:8000/api/schema/ |
| Healthcheck | http://localhost:3000/api/health/ | http://localhost:8000/api/health/ |
| Django Admin | http://localhost:3000/django-admin/ | http://localhost:8000/django-admin/ |

Katalog zasilają kanały pobierania z publicznych źródeł. Pierwsze rekordy pojawiają się po zakończeniu synchronizacji.

---

## Polecenia operacyjne

Ręczna synchronizacja aktywnych źródeł:

```bash
docker compose exec -T backend python manage.py run_ingestion
```

Przeliczenie wstępnych ocen jakości (Innowacyjność, Potencjał zastosowania, Wiarygodność) dla zapisanych w bazie rekordów źródłowych:

```bash
docker compose exec -T backend python manage.py assess_innovations --limit 100 --dry-run
docker compose exec -T backend python manage.py assess_innovations --limit 100 --workers 4 --retry-unknown
```

W środowisku produkcyjnym dodaj `-f compose.prod.yaml` po `docker compose`. Flaga `--slug <slug>` pozwala wskazać konkretne rekordy. Polecenie korzysta wyłącznie z zapisanych migawek źródłowych, dzieli blokadę z procesem pobierania i nie nadpisuje ukończonych wymiarów przy niezmienionych danych.

---

## Testy, kontrola jakości i produkcja

```bash
make test              # pytest (backend)
make lint              # ruff + tsc --noEmit + eslint
make schema-check      # walidacja schematu OpenAPI (drf-spectacular)
make migrations-check  # weryfikacja migracji Django
make build-prod        # budowa obrazów produkcyjnych
```

Testy jednostkowe frontendu:

```bash
docker compose exec -T frontend npm test
```

Na produkcji (`compose.prod.yaml`) jedynym wystawionym portem jest `FRONTEND_PORT` (domyślnie `3000`). W pliku `.env` na serwerze należy ustawić `DJANGO_DEBUG=False`, losowy `DJANGO_SECRET_KEY`, `POSTGRES_PASSWORD` oraz `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS` i `DJANGO_CORS_ALLOWED_ORIGINS`.

Push do `main` uruchamia automatyczny deploy przez GitHub Actions. Push wykonuje użytkownik ręcznie; samo `make build-prod` buduje lokalne obrazy.

## Od potrzeby do udokumentowanego efektu

Praktoteka łączy odkrywanie innowacji, porównanie rozwiązań i przygotowanie wdrożenia w jednym procesie. „Powiadom mnie” zbiera potrzeby i kontakty zainteresowanych organizacji, a plan wdrożeniowy prowadzi użytkownika przez kolejne fazy działania. Raport efektów łączy etap wdrożenia, mierniki przed/po, preferencję widoczności podsumowania i załącznik z rezultatami. Impact Radar daje operatorowi PCI wspólny widok transferów oraz narzędzia do ich weryfikacji.

Sposób działania opisują [`AI_USAGE.md`](AI_USAGE.md) i [`DATA_SOURCES.md`](DATA_SOURCES.md). Plan rozwoju i odbiory poszczególnych funkcji są utrzymywane w [`docs/05-plan.md`](docs/05-plan.md) oraz specyfikacjach zadań.

---

## Licencja

Kod udostępniany jest na licencji **EUPL-1.2** — szczegóły w pliku [`LICENSE`](LICENSE).
