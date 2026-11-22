# Źródła danych, aktualizacje i ochrona informacji

Dane o innowacjach trafiają do Praktoteki ze skonfigurowanych publicznych repozytoriów i kanałów oraz z pojedynczych adresów wskazanych przez operatora PCI. Dobór źródeł o znanej strukturze, zapis stanu pobierania i przegląd nowych rekordów przez PCI tworzą uporządkowany proces zasilania katalogu.

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

Automat przy każdym przebiegu odkrywa aktualne odnośniki w katalogach i pobiera konkretne opisy. Adaptery `HTML katalog` rozpoznają strukturę CTT UŁ i IBE oraz ścieżki ich dokumentów, koncentrując import na kartach technologii i opisach innowacji szkolnych. Zapisany kursor pozwala kontynuować pobieranie; przy błędzie kanału zachowuje pozycję do kolejnej próby.

CTT pokrywa oferty transferu dla biznesu, a IBE innowacje realizowane w szkołach (wydawca opisuje realizację w roku szkolnym 2024/2025). Wybrane kanały reprezentują cztery grupy źródeł z FAQ i łączą perspektywę nauki, B+R, biznesu oraz edukacji. Deklaracje wydawcy zachowują pochodzenie i trafiają do weryfikacji PCI. Lokalizacja szkoły jest traktowana osobno od adresu wydawcy IBE.

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
5. **Nieaktualność:** przy przebiegu pobierania funkcja `mark_stale_innovations` oznacza jako `stale` niescalone, zweryfikowane rekordy z `last_verified_at` nie późniejszym niż data sprzed `stale_after_days` (domyślnie `180` dni). Data zapisana w aplikacji wspiera kierowanie rekordów do ponownej oceny.
6. **Audyt zmian (`InnovationAuditLog`):** każde pozyskanie, edycja, weryfikacja, odrzucenie, scalenie i aktualizacja klasyfikacji zapisuje autora, metodę, czas i diff pól.

---

## Przechowywanie i dostęp do danych

- **Poszanowanie zabezpieczeń stron:** adaptery wykrywają blokady antybotowe i CAPTCHA (`_assert_not_antibot`, m.in. Turnstile, reCAPTCHA, hCaptcha) i natychmiast przerywają pobieranie bez prób obchodzenia zabezpieczeń, raportując błąd operatorowi.
- **Walidacja i obsługa URL:** kanały domyślne wskazują znanych publicznych wydawców. Konfiguracja kanału i ręczny import korzystają z `URLField` oraz wymagają sesji i uprawnień operatora PCI. `_download` obsługuje połączenie HTTP. Osobny `public_source_url` w `apps/innovations/assessment.py` sprawdza schemat, nazwę hosta i jawne adresy IP przy wyborze materiałów oraz walidacji cytatów do oceny jakości.
- **Ochrona kontaktów:** oddzielne pole `contact_info` jest pomijane w publicznym katalogu i szczegółach poziomu 2. Zwraca je warstwa zarejestrowana (poziom 3) i plan wdrożeniowy. Opisy i cytaty zachowują treść materiału źródłowego, co umożliwia prześledzenie pochodzenia informacji.
- **Konta i dane organizacji:** PostgreSQL przechowuje konta, hashe haseł, sesje Django, profile organizacji, zapisane porównania i innowacje. Plany zachowują migawkę kontekstu organizacji oraz postęp i notatki. Powiązanie z kontem pozwala wrócić do własnego kontekstu i kontynuować wdrożenie.
- **Zapytania i zgłoszenia powiadomień:** `ProblemQuery` zapisuje opis problemu i kontekst; model przewiduje opcjonalne powiązanie z użytkownikiem. `MatchNotification` przechowuje e-mail, opis i filtry oraz opcjonalne konto. Zgłoszenia tworzą bazę potrzeb i kontaktów do organizacji zainteresowanych rozwiązaniami.
- **Raporty i załączniki:** `ImplementationPlan` przechowuje zadeklarowany etap wdrożenia, daty, liczbę odbiorców, opis rezultatu, mierniki przed/po, URL dowodu, preferencję widoczności oraz decyzję operatora PCI. Jeden plik wyników (do 10 MB) wraz z nazwą, typem, rozmiarem i datą jest zapisany bezpośrednio w PostgreSQL. Pobranie wymaga konta właściciela planu lub operatora PCI; zapis i usunięcie pliku wymagają właściciela planu.
- **Widoczność efektów:** `outcome_visibility` zapisuje `pci_only` albo `public_summary`. Raport jest dostępny właścicielowi i PCI, a preferencja wskazuje oczekiwany sposób wykorzystania podsumowania efektów.
- **Anonimowa analityka:** osobny model `AnalyticsEvent` zapisuje typ zdarzenia (`view`, `filter`, `search`), identyfikator innowacji, obszar, sektor, beneficjentów, filtry i czas — bez pola użytkownika, adresu IP czy identyfikatora sesji. Ten osobny zbiór zdarzeń służy analizie korzystania z katalogu i filtrów.
- **Cykl pracy z danymi i AI:** dane zapisane w PostgreSQL wspierają kontynuację planów i historię weryfikacji. Właściciel może wymienić lub usunąć załącznik przez API planu. Zakres materiałów i kontekstu organizacji wysyłanych do Google opisuje [`AI_USAGE.md`](AI_USAGE.md); pliki z wynikami nie są dołączane do obecnych wywołań AI.

---

## Sposób pracy ze źródłami

1. **Źródła dopasowane do zadania:** skonfigurowane API, kanały i katalogi obejmują naukę, B+R, oferty transferu technologii i innowacje szkolne. Operator rozszerza bazę o kolejne kanały i pojedyncze URL.
2. **Weryfikacja PCI:** status `pending_review` prowadzi nowo pozyskane rekordy do przeglądu operatora; potwierdzone informacje zyskują oznaczenie weryfikacji.
3. **Przetwarzanie materiałów:**
   - `raw_snapshot` przechowuje do `6000` znaków znormalizowanego tytułu i tekstu; hash tego wycinka wspiera wykrywanie zmian,
   - parsery przygotowują do `8000` znaków dla HTML i wielu formatów kanałów; PDF jest odczytywany z warstwy tekstowej maksymalnie `20` stron i skracany do `10 000` znaków przed dalszym przetwarzaniem,
   - paginacja OpenAlex obejmuje do `10 000` pierwszych wyników zapytania.
4. **Uzupełnianie wiedzy o innowacji:** pola `missing_info` wskazują informacje do pozyskania przy kontakcie z twórcą, np. poziom TRL, koszty lub warunki wdrożenia. Pomaga to zaplanować kolejne działania walidacyjne.
