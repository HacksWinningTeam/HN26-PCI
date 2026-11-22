# Praktoteka — Radar Innowacji PCI

Radar Innowacji dla Podkarpackiego Centrum Innowacji (HackNation 2026). Aplikacja zbiera dane o polskich rozwiązaniach technologicznych, edukacyjnych i administracyjnych z publicznych źródeł, porządkuje je i prowadzi odbiorcę od opisu problemu lub katalogu, przez porównanie, aż po pięciofazowy plan wdrożenia.

Dodatkowe opisy dla oceniających:
- [`AI_USAGE.md`](AI_USAGE.md) — co robi AI, co liczą reguły, jakie dane trafiają do modelu i jakie są ograniczenia wyników.
- [`DATA_SOURCES.md`](DATA_SOURCES.md) — lista źródeł, sposób cyklicznego pobierania, obsługa duplikatów/konfliktów i ochrona danych.

---

## Jak działa produkt

### Bez logowania (odkrywanie i porównanie)
- **Wspólne wyszukiwanie (`/innovations`):** katalog z filtrami i rozwijany opis problemu w jednym miejscu (dawny adres `/solve` przekierowuje tutaj z zachowaniem parametrów).
- **Dopasowanie 40 / 20 / 20 / 20:** zapytanie problemowe dostaje wynik rozbity na zbieżność opisu (40%), branżę (20%), grupy beneficjentów (20%) i typ organizacji (20%) wraz z oceną kompletności opisu.
- **Karta innowacji (`/innovations/[id]`):** opis rozwiązania, źródła, wyekstrahowane dowody, ocena kryteriów Oslo Manual 2018, wstępne indeksy jakości oraz oznaczenie pochodzenia wartości (ze źródła, potwierdzone przez PCI, szacunek regułowy lub AI).
- **Porównywarka 2–3 projektów (`/compare`):** zestawienie dojrzałości, TRL, składowych dopasowania, jakości dowodów i różnic między rozwiązaniami oraz eksport do JSON, Markdown i CSV.
- **Alerty „Powiadom mnie”:** zapisanie zapytania i adresu e-mail, gdy bieżące wyniki są za słabe.

### Po rejestracji (plan i realizacja)
- **Kontekst organizacji (`/workspace`):** krótka ankieta (typ i nazwa instytucji, rola, lokalizacja, skala odbiorców, obecne podejście, zasoby, kompetencje, termin i ograniczenia).
- **Plan wdrożeniowy (`/workspace/plans/[id]`):** system dobiera jeden z trzech wariantów (walidacja, pilotaż albo transfer/wdrożenie) i konkretną ścieżkę działania (np. kontakt z właścicielem IP przy aktywnym patencie, partnerstwo, pilotaż lub transfer). Plan ma pięć faz, blokery braków, ryzyka, mierniki sukcesu, interaktywną checklistę oraz dane kontaktowe ze źródła lub weryfikacji PCI. Gotowy plan można wyeksportować do JSON, Markdown i CSV.

### Panel operatora PCI (`/admin`)
- Przegląd rekordów oczekujących na weryfikację (`pending_review`), oznaczonych konfliktem (`conflict`), nieaktualnych (`stale`) i niekompletnych w tabeli z sortowaniem, filtrowaniem i historią zmian (`InnovationAuditLog`).
- Edycja pól rekordu (w tym `deployment_level`, `trl`, `oslo_compliant`) z oznaczeniem `pci_verified`.
- Wykrywanie potencjalnych duplikatów (podobieństwo ≥ 72%) i scalanie rekordów bez utraty źródeł.
- Konfiguracja kanałów `SourceFeed`, uruchamianie synchronizacji oraz ręczny import pojedynczego adresu URL (HTML, JSON, XML/RSS/OAI-PMH, PDF).
- Podgląd planów wdrożeniowych organizacji, ich bieżącej fazy i zgłaszanych trudności.

### Dostępność i języki
- Pięć motywów (jasny, ciemny, dwa warianty wysokiego kontrastu, skala szarości), skalowanie tekstu 25%–200%, podkreślanie linków i odczyt na głos (`speechSynthesis`) w panelu „Dostępność”, otwieranym z górnej nawigacji publicznej lub panelu bocznego aplikacji.
- Interfejs w języku polskim (domyślnym) i angielskim.

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

   Domyślna konfiguracja w `compose.yaml` działa od razu bez dodatkowych sekretów. Aby włączyć wsparcie Google Gemini, wpisz `GEMINI_API_KEY` w `.env` — bez klucza system działa w pełni na regułach deterministycznych.

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

3. Utwórz konto operatora PCI:

   ```bash
   make createsuperuser
   ```

4. Dostępne adresy (wszystko przez jeden port proxy Next.js):

| Usługa | Adres przez proxy | Adres bezpośredni (dev) |
| --- | --- | --- |
| Aplikacja | http://localhost:3000 | — |
| Swagger UI | http://localhost:3000/api/docs/ | http://localhost:8000/api/docs/ |
| ReDoc | http://localhost:3000/api/redoc/ | http://localhost:8000/api/redoc/ |
| Schemat OpenAPI | http://localhost:3000/api/schema/ | http://localhost:8000/api/schema/ |
| Healthcheck | http://localhost:3000/api/health/ | http://localhost:8000/api/health/ |
| Django Admin | http://localhost:3000/admin/ | http://localhost:8000/admin/ |

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

---

## Licencja

Kod udostępniany jest na licencji **EUPL-1.2** — szczegóły w pliku [`LICENSE`](LICENSE).
