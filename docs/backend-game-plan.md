# Backend Game Plan — PCI / Radar Innowacji

Dokument opisuje zrealizowane fazy backendu (**A–E**), checklistę testów po Fazach A–E oraz plan **Fazy F (Live Scraping, PDF i konektory polskich źródeł publicznych)**.

---

## 1. Stan wyjściowy i zrealizowane fazy (A–E: DONE)

Wszystkie zmiany są zaimplementowane w `backend/`, pokryte testami (`21 passed` w lokalnym `.venv`), bez błędów `ruff`, z ważną specyfikacją OpenAPI (`drf-spectacular --validate --fail-on-warn`) i czystymi migracjami:

- **Faza A (`b89c855`) — Jakość danych, proweniencja klasyfikacji, Oslo 2018, `ScoringConfig`, `InnovationAuditLog`:**
  - `Innovation`: `is_public`, `is_incomplete`, `is_synthetic_demo`, `classification_provenance`, `oslo_assessment`, `radar_user_types`, `patent_status`.
  - `InnovationSource`: `raw_snapshot`, `content_hash` (`SHA-256`).
  - `ScoringConfig` podpięty pod 40/20/20/20 w `POST /api/discovery/match/`.
  - `InnovationAuditLog` automatycznie rejestrujący edycje, weryfikacje i scalenia.
- **Faza B (`addea25`) — Silnik pozyskiwania, Gemini AI, adaptery i deduplikacja:**
  - `apps/ingestion/ai_service.py`: klient REST pod **Google Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, `responseMimeType: "application/json"`) z deterministycznym fallbackiem regułowym.
  - `apps/ingestion/adapters.py`: parsery `JSON`, `RSS/Atom/OAI-PMH XML`, `HTML` i tekstu.
  - `apps/ingestion/pipeline.py` + `manage.py run_ingestion`: wykrywanie zmian (`content_hash`), sprzeczności (`conflict`), duplikatów (`duplicate_of`, podobieństwo `>= 72%`) i rekordów nieaktualnych (`stale`, `> 180` dni).
  - Zmienne `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_TIMEOUT_SECONDS` zlustrowane w `.env.example`, `compose.yaml` i `compose.prod.yaml`.
- **Faza C (`c38e126`) — Inteligentne doprecyzowanie, filtry katalogu, porównywarka i eksporty:**
  - `POST /api/discovery/match/` zwraca `completeness_percent`, `missing_fields`, `suggested_fields` (podpowiedzi branż/beneficjentów/typu organizacji/lokalizacji z tekstu), używa synonimów PL i zapisuje wyniki w `InnovationMatch`.
  - `GET /api/innovations/` obsługuje filtry wielowartościowe po przecinku (`OR` w filtrze, `AND` między filtrami), `has_verified_sources=true` oraz szukanie po `_pl` i `_en`.
  - `POST /api/discovery/compare/` (2–3 innowacje obok siebie z różnicami, liderami ocen i jakością dowodów).
  - `GET /api/innovations/<slug>/export/?export_format=json|md|csv` oraz `POST /api/comparisons/export/`.
- **Faza D (`6628cf6`) — Ścieżki rekomendacji, patenty UPRP/EPO, personalizacja Gemini i eksport planu:**
  - `ImplementationPlan`: `recommendation_path` (`contact_creator`, `pilot`, `transfer`, `partnership`), `recommendation_rationale`, `missing_info_blockers`, `similar_innovations`, `partner_archetypes`, `ai_personalized`.
  - Ścieżka patentowa UPRP/EPO automatycznie kieruje na `contact_creator` z krokami o IP/CTT w Fazie 2.
  - Opcjonalna personalizacja kroków 5 faz przez Gemini z deterministycznym fallbackiem.
  - `GET /api/implementation-plans/<id>/export/?export_format=md|csv|json`.
- **Faza E (`da713f2`) — Analityka trendów RODO i pełne operacje admina PCI:**
  - Model `AnalyticsEvent` bez PII (brak `user`, IP i sesji): automatyczne zliczanie wyświetleń i wyszukiwań + `POST /api/analytics/track/` + `GET /api/analytics/trends/`.
  - `POST /api/admin/innovations/` (ręczny import z wykrywaniem duplikatu), `POST /api/admin/innovations/<slug>/reject/` (ukrycie z katalogu + audyt), rozszerzone `merge-duplicate` o dowolny `target_slug`, `GET /api/admin/innovations/<slug>/history/`, `GET/PATCH /api/admin/scoring-config/`.

---

## 2. Co przetestować teraz po Fazach A–E (Checklista weryfikacji)

### A. Szybki start lokalnie (API + Swagger `/api/docs/`)
1. Uzupełnij w lokalnym `.env` (opcjonalnie, jeśli chcesz od razu zobaczyć Gemini w akcji):
   ```env
   GEMINI_API_KEY=twoj-klucz-gemini
   GEMINI_MODEL=gemini-2.5-flash
   ```
2. Odpal migracje, seed i serwer deweloperski w `backend/`:
   ```bash
   cd backend
   DJANGO_DEBUG=True .venv/bin/python manage.py migrate
   DJANGO_DEBUG=True .venv/bin/python manage.py seed_demo
   DJANGO_DEBUG=True .venv/bin/python manage.py runserver 8000
   ```
   *(Lub przez Docker: `make up` / `docker compose up --build`, jeśli masz włączonego Dockera).*
3. Otwórz interaktywną dokumentację OpenAPI: **`http://127.0.0.1:8000/api/docs/`** (lub przez proxy frontendu na porcie `3000`).

### B. Scenariusze testowe do przeklikania (Swagger / `curl` / frontend)
1. **Inteligentne wyszukiwanie problemu i podpowiedzi (`POST /api/discovery/match/`)**:
   - Wyślij samo `{"problem_text": "Nasza gmina szuka pomocy dla emerytów w usługach online"}` -> sprawdź `completeness_percent` (`< 100`), `missing_fields`, `suggested_fields` (powinno wykryć `administracja`, `seniors_60_plus`, `public_institution`) i trafienia przez synonimy (`e-urzad-senior`).
2. **Filtry katalogu i eksport karty (`GET /api/innovations/...`)**:
   - Sprawdź `GET /api/innovations/?primary_area=administrative,educational&has_verified_sources=true`.
   - Sprawdź `GET /api/innovations/e-urzad-senior/export/?export_format=md` i `csv` (bez wycieku `contact_info`).
3. **Porównywarka 2–3 innowacji (`POST /api/discovery/compare/` + `/api/comparisons/export/`)**:
   - Wyślij `{"innovation_slugs": ["e-urzad-senior", "aqua-guard-gdynia", "aerosense-ndt"]}` -> sprawdź `score_leaders`, `highlights`, `differences` i `evidence_quality`.
4. **Ścieżka patentowa + personalizacja Gemini (`POST /api/implementation-plans/`)**:
   - Zaloguj się / zarejestruj (`POST /api/auth/login/` np. `soltys@trzebownisko.pl` / `demo1234`), wygeneruj plan dla `aerosense-ndt` -> sprawdź `recommendation_path: "contact_creator"`, krok o UPRP/EPO w Fazie 2, `similar_innovations`, `missing_info_blockers` oraz `ai_personalized` (`true`, jeśli ustawiłeś `GEMINI_API_KEY`).
   - Pobierz eksport planu: `GET /api/implementation-plans/<id>/export/?export_format=md`.
5. **Analityka trendów RODO (`GET /api/analytics/trends/`)**:
   - Po kliknięciu kilku kart (`GET /api/innovations/<slug>/`) i wysłaniu zdarzenia na `POST /api/analytics/track/`, sprawdź `GET /api/analytics/trends/` (`most_viewed_innovations`, `top_filters`, `rising_trends`, `gdpr_compliant: true`).
6. **Panel admina PCI (`/api/admin/...`)**:
   - `POST /api/admin/innovations/` — zaimportuj ręcznie rekord podobny do istniejącego i sprawdź `potential_duplicate_slug` + wpis w `GET /api/admin/innovations/<slug>/history/`.
   - `POST /api/admin/innovations/<slug>/reject/` — sprawdź, że rekord znika z `GET /api/innovations/` (`404` na detalu) i zostawia ślad `reject` w historii.
   - `GET/PATCH /api/admin/scoring-config/` — zmień wagi (np. `50/20/20/10`, wersja `v2.0`) i sprawdź, że `POST /api/discovery/match/` zwraca `scoring_version: "v2.0"`.

---

## 3. Faza F — Live Scraping, PDF i konektory polskich źródeł publicznych (DONE)

Zaimplementowane w `backend/`, pokryte testami (`23 passed` w `.venv`), czyste pod `ruff`, z ważnym schematem OpenAPI (`drf-spectacular --validate --fail-on-warn`) i czystymi migracjami:

1. **Konektory realnych źródeł publicznych bez obchodzenia CAPTCHA/antybotów (`apps/ingestion/adapters.py`)**:
   - **CORDIS / EU Open Data JSON (`hits.hit[].project`)**: automatyczne pobieranie projektów B+R z udziałem polskich podmiotów i tłumaczenie/klasyfikacja przez Gemini.
   - **Repozytoria naukowe i uczelniane OAI-PMH (`<OAI-PMH><ListRecords>`, `oai_dc`)**: obsługa rekordów Dublin Core (np. RUJ UJ, repozytoria uczelniane).
   - **Dane.gov.pl JSON:API (`data[].attributes`), OpenAlex (`abstract_inverted_index`) oraz kanały RSS/Atom** (np. `https://naukawpolsce.pl/rss.xml`) z czyszczeniem HTML.
   - **Ochrona przed antybotami**: wykrywanie stron z weryfikacją przeglądarki / CAPTCHA i bezpieczne odrzucanie komunikatem `ValueError` / HTTP `400` bez obchodzenia zabezpieczeń.
   - **Zasilenie `seed_demo`**: zaktualizowane `SourceFeed` z realnymi końcówkami publicznymi (CORDIS PL, RUJ UJ OAI-PMH, Nauka w Polsce RSS) oraz `config.max_records` / `config.live_fetch`.
2. **Scraping na żądanie i konfiguracja źródeł (`apps/ingestion/views.py`, `urls.py`, `pipeline.py`)**:
   - **`POST /api/admin/ingestion/scrape-url/`**: pobiera wskazany URL (HTML/JSON/RSS/OAI-PMH/PDF), klasyfikuje przez Gemini (z fallbackiem regułowym), wykrywa duplikaty i zapisuje jako `pending_review` z `raw_snapshot`, `content_hash` i wpisem w `InnovationAuditLog`.
   - **`GET/POST /api/admin/source-feeds/`** oraz **`GET/PATCH/DELETE /api/admin/source-feeds/<id>/`**: pełny CRUD źródeł `SourceFeed` wraz z konfiguracją `config` (`live_fetch`, `max_records`, `adapter`).
3. **Obsługa dokumentów PDF (`pypdf`)**:
   - Dodano `pypdf>=5.0,<7.0` do `backend/pyproject.toml` oraz `parse_pdf_document()` w `adapters.py` z automatycznym rozpoznawaniem PDF po `Content-Type`, rozszerzeniu `.pdf` i nagłówku `%PDF-`.
4. **Weryfikacja E2E na żywo z `GEMINI_API_KEY`**:
   - Przetestowano pobranie na żywo rekordów z CORDIS PL, RUJ UJ OAI-PMH, Nauka w Polsce RSS i dokumentu PDF (`pypdf`).
   - Zweryfikowano `POST /api/admin/ingestion/scrape-url/` na żywo z Gemini (`ai_used=True`, polskie streszczenie i tytuł), wykrycie duplikatu na równoległym URL oraz wygenerowanie spersonalizowanego planu wdrożeniowego (`ai_personalized=True`) na świeżo zescrapowanej innowacji.
