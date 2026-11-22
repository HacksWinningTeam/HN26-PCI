# Źródła danych, aktualizacje i ochrona informacji

Dane o innowacjach trafiają do Praktoteki ze skonfigurowanych publicznych repozytoriów i kanałów oraz z pojedynczych adresów wskazanych przez operatora PCI. System nie indeksuje całego Internetu na ślepo — pobiera tylko jawne źródła o znanej strukturze, zapamiętuje stan pobierania i oznacza nowo dodane rekordy do przeglądu PCI.

---

## Skonfigurowane kanały domyślne

Konfiguracja startowa (`backend/apps/ingestion/default_feeds.py`) obejmuje sześć kanałów publicznych (limit `10` kandydatów na partię):

| Kanał | Kategoria | Metoda / Adapter | Sposób pobierania |
| --- | --- | --- | --- |
| **CORDIS — Projekty B+R z udziałem Polski (EU Open Data)** | Projekty B+R | `API` / `cordis_json` | Publiczne API CORDIS z zapytaniem dla projektów z udziałem Polski (*innovation*, *prototype*, *pilot*); paginacja po parametrze strony `p`. |
| **RUJ UJ / Repozytoria Uczelniane (OAI-PMH)** | Nauka i patenty | `OAI-PMH` / `oai_pmh` | Protokół OAI-PMH (`ListRecords`, `metadataPrefix=oai_dc`); obsługa `resumptionToken` z automatycznym restartem po wygaśnięciu tokenu. |
| **Nauka w Polsce — Technologie i Innowacje (RSS)** | Nauka i patenty | `RSS` / `rss` | Kanał RSS serwisu Nauka w Polsce (PAP); pobieranie tytułów, opisów i linków artykułów. |
| **OpenAlex PL — Badania i innowacje** | Nauka i patenty | `API` / `openalex` | Publiczne API OpenAlex filtrowane na polskie instytucje (`institutions.country_code:pl,has_abstract:true`); rekonstrukcja abstraktów z `abstract_inverted_index`, paginacja do limitu 10 000 wyników API. |
| **CTT UŁ — Oferta technologiczna dla biznesu** | Startupy i biznes | `HTML katalog` / `ctt_offers` | [Katalog CTT Uniwersytetu Łódzkiego](https://www.ctt.uni.lodz.pl/dla-biznesu/oferta-technologiczna): odkrywanie poszczególnych kart technologii, pobieranie opisu bez nawigacji/stopki, stronicowanie i offset; odczyt jawnego TRL także cyframi rzymskimi. |
| **IBE — Innowacje pedagogiczne w szkołach** | Administracja i edukacja | `HTML katalog` / `ibe_school_pdf` | [Dobre praktyki IBE](https://www.ibe.edu.pl/pl/dobre-praktyki): odkrywanie PDF-ów wyłącznie z sekcji innowacji pedagogicznych, odczyt dokumentu i nazwy szkoły z formularza, tytuł z katalogu; pomijanie pozostałych materiałów/projektów. |

Poza kanałami domyślnymi panel operatora PCI (`/admin`) pozwala:
- dodawać własne kanały `SourceFeed` (JSON API w tym Dane.gov.pl JSON:API, OpenAlex i CORDIS, a także kanały RSS/Atom i OAI-PMH),
- pobierać pojedyncze publiczne adresy URL (`scrape_url_and_ingest`) z automatycznym rozpoznawaniem HTML, JSON, XML oraz plików PDF (`pypdf`).

Nowe katalogi nie są pojedynczymi ręcznie podanymi dokumentami: automat przy każdym przebiegu odkrywa aktualne odnośniki i pobiera konkretne opisy. Metoda `HTML katalog` obsługuje tylko dwa wskazane serwisy i ich znane ścieżki dokumentów; linki zewnętrzne oraz nawigacja są pomijane. Brak rozpoznanych kart lub niedostępny dokument powoduje rzeczywisty błąd kanału bez przesunięcia zapisanego kursora.

CTT pokrywa oferty transferu dla biznesu, a IBE innowacje realizowane w szkołach (wydawca opisuje realizację w roku szkolnym 2024/2025). To poszerza przekrój do czterech grup źródeł z FAQ, ale nie oznacza pełnego monitorowania startupów, samorządów ani bezpośredniej integracji z urzędami patentowymi. Wartości ze źródła pozostają deklaracjami wydawcy do weryfikacji PCI. Lokalizacja szkoły pozostaje nieustalona, zamiast korzystać z powtarzanego w PDF adresu IBE w Warszawie.

---

## Cykliczne pobieranie i spójność bazy

- **Harmonogram:** w środowisku produkcyjnym (`compose.prod.yaml`) działa osobny proces `ingestion` (`run_ingestion_worker`), który pobiera dane przy starcie i cyklicznie co `INGESTION_INTERVAL_SECONDS` (domyślnie `3600` s, minimum `60` s). W środowisku lokalnym uruchamia się go opcjonalnie profilem `--profile ingestion`.
- **Stan paginacji (`harvest_state`):** po przetworzeniu partii zapisywana jest bieżąca strona, offset lub token wznowienia. Co 5 partii backfillu worker wraca na początek kanału, żeby wychwycić świeże wpisy bez utraty pozycji starszych stron.
- **Blokada współbieżności:** cykliczny worker, ręczne odświeżenie z panelu PCI, import pojedynczego URL i wsadowe przeliczanie ocen (`assess_innovations`) korzystają ze wspólnej blokady sesyjnej PostgreSQL (`pg_try_advisory_lock`).
- **Liczniki kanałów:** pole `records_count` jest wyliczane z faktycznej liczby unikalnych, niescalonych innowacji lokalnie powiązanych z kanałem (`SourceFeed.sources`) — powtórne synchronizacje nie zawyżają liczników.

---

## Kontrola zmian, duplikaty i nieaktualność

1. **Filtr trafności:** wpisy niezwiązane z innowacjami, technologią, B+R ani wdrożeniami są pomijane przed utworzeniem rekordu.
2. **Detekcja zmian (`content_hash`):** dla każdego źródła zapisywana jest migawka tekstu (do `6000` znaków) oraz hash SHA-256. Jeśli treść pod tym samym URL się nie zmieniła, system aktualizuje tylko daty dostępności źródła bez ponownego wywoływania ekstrakcji AI.
3. **Odświeżenie vs konflikt:** zmiana treści źródła aktualizuje opisy, klasyfikację, ocenę Oslo 2018, dowody i oceny jakości, nie nadpisując pól oznaczonych wcześniej jako `pci_verified`. Rozwój dojrzałości w ramach jednego źródła (np. prototyp → pilotaż lub wyższy TRL) przenosi zweryfikowany rekord do ponownego przeglądu (`pending_review`) z zapisem różnicy w audycie. Regresja TRL albo rozbieżność między wieloma źródłami oznacza rekord jako `conflict`.
4. **Deduplikacja:** nowe rekordy porównywane są z aktywną bazą (75% podobieństwa znormalizowanego tytułu + 25% nazwy organizacji). Wynik `≥ 72%` oznacza rekord jako potencjalnego duplikatu (`duplicate_of`), który operator może scalić w `/admin` z zachowaniem wszystkich źródeł i dowodów.
5. **Nieaktualność:** zweryfikowane rekordy nieodświeżane dłużej niż `stale_after_days` (`180` dni) automatycznie dostają status `stale`.
6. **Audyt zmian (`InnovationAuditLog`):** każde pozyskanie, edycja, weryfikacja, odrzucenie, scalenie i aktualizacja klasyfikacji zapisuje autora, metodę, czas i diff pól.

---

## Zasady dostępu i RODO

- **Poszanowanie zabezpieczeń stron:** adaptery wykrywają blokady antybotowe i CAPTCHA (`_assert_not_antibot`, m.in. Turnstile, reCAPTCHA, hCaptcha) i natychmiast przerywają pobieranie bez prób obchodzenia zabezpieczeń, raportując błąd operatorowi.
- **Publiczne adresy URL:** walidator `public_source_url` odrzuca adresy lokalne, wewnętrzne i prywatne zakresy IP.
- **Ochrona kontaktów:** publiczny katalog i karta poziomu 2 nie zwracają prywatnych danych kontaktowych (`contact_info`); trafiają one dopiero do widoku po rejestracji (poziom 3) i planu wdrożeniowego.
- **Anonimowa analityka:** model `AnalyticsEvent` zapisuje wyłącznie typy zdarzeń (`view`, `filter`, `search`), obszary, sektory i filtry — bez powiązania z użytkownikiem, adresem IP czy identyfikatorem sesji.

---

## Ograniczenia źródeł

1. **Wybrane kanały zamiast otwartego crawlera:** automat zbiera dane tylko ze skonfigurowanych API/kanałów oraz ręcznie wskazanych URL.
2. **Domyślny status `pending_review`:** automatycznie pobrane rekordy wymagają przeglądu i potwierdzenia przez operatora PCI, zanim zostaną oznaczone jako zweryfikowane.
3. **Limity techniczne formatów i API:**
   - migawka tekstu jest ograniczona do `6000` znaków (`8000` dla HTML, do `20` stron i `10 000` znaków dla PDF),
   - parser `pypdf` odczytuje tylko warstwę tekstową PDF (skany bez OCR nie zostaną sparsowane),
   - podstawowa paginacja OpenAlex sięga do `10 000` pierwszych wyników zapytania.
4. **Niekompletność źródeł pierwotnych:** wiele abstraktów naukowych i notek prasowych nie zawiera informacji o TRL, kosztach czy kontakcie wdrożeniowym — system wykazuje te braki w `missing_info` zamiast je dopisywać.
