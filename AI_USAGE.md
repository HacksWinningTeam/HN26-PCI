# AI, reguły i transparentne rekomendacje

W Praktotece podstawą działania są reguły deterministyczne zapisane w kodzie backendu. Model językowy (Google Gemini) pełni rolę opcjonalnej warstwy wspomagającej pracę z tekstem — pomaga streszczać i tłumaczyć opisy ze źródeł, wyciągać cytowane przesłanki do oceny wstępnej oraz dopasowywać styl listy działań w planie wdrożeniowym.

Wyszukiwanie i ranking dopasowania (domyślnie 40/20/20/20), obliczanie wiarygodności, wybór wariantu planu, wykrywanie duplikatów i wybór ścieżki rekomendacji są obliczane deterministycznie i działają bez klucza API. Mogą korzystać z metadanych wcześniej uzupełnionych przez AI. Klasyfikacja i plan mają wariant regułowy, który zapewnia ciągłość działania także przy niedostępności API. Gemini dostarcza dodatkowo oceny innowacyjności i potencjału zastosowania oparte na cytowanych źródłach. Przy niezmienionej podstawie system ponownie wykorzystuje zapisane oceny.

---

## Co robią reguły, a co analizuje AI

| Obszar | Warstwa regułowa (zawsze aktywna) | Warstwa AI — Google Gemini (opcjonalna) |
| --- | --- | --- |
| **Pozyskiwanie i klasyfikacja** (`backend/apps/ingestion/ai_service.py`) | Odfiltrowanie wpisów bez słów kluczowych innowacji, normalizacja polskich znaków, dopasowanie obszaru (`technological`, `educational`, `administrative`), charakteru, branż, beneficjentów i lokalizacji. Wykrywanie poziomu wdrożenia z odfiltrowaniem wzmianek przyszłych lub planowanych (np. „planowane wdrożenie”), odczyt jawnych wzmianek `TRL 1–9` (bez zgadywania TRL z samego słowa „wdrożenie”), detekcja statusu patentowego i braków danych. | Analiza surowego tekstu źródłowego (`temperature=0.2`): ocena trafności (`is_relevant_innovation`), tłumaczenie i zredagowanie pól polskich (`title_pl`, `short_summary_pl`, `problem_pl`, `solution_pl`), doprecyzowanie kategorii z zamkniętych list dozwolonych wartości (`ALLOWED_*`), wskazanie braków i przesłanek do oceny Oslo Manual 2018. |
| **Wstępne oceny jakości `quality-v1`** (`backend/apps/innovations/assessment.py`) | **Wiarygodność (`credibility`, 0–100)** liczona wyłącznie systemowo: materiał źródłowy (25 pkt), dowód powiązany ze źródłem — fakt PCI 25 pkt albo dosłowna deklaracja ze źródła 15 pkt (25 pkt), aktualna weryfikacja PCI (20 pkt), świeżość pobrania ≤90 / ≤180 / >180 dni (15 pkt), brak zapisanych sprzeczności (15 pkt). Walidacja cytatów z odpowiedzi AI oraz cache’owanie po hashu wejścia i źródeł. | **Innowacyjność (`innovativeness`)** i **Potencjał zastosowania (`application_potential`)** (`temperature=0` przy osobnym przeliczeniu): ocena po 3 kryteria w skali `0–4` na wymiar na podstawie zapisanych źródeł, z krótkim uzasadnieniem po polsku, dokładnym `source_url` i dosłownym cytatem (`excerpt`). |
| **Zgodność z Oslo Manual 2018** (`backend/apps/ingestion/ai_service.py`) | Dwukryterialna funkcja `evaluate_oslo_compliance` sprawdzająca osobno nowość/ulepszenie oraz udostępnienie użytkownikom lub wdrożenie w praktyce. Pełna zgodność (`compliant`) wymaga potwierdzenia obu warunków; przy braku pełnych dowodów status przyjmuje wartość `partial`, `needs_verification` albo `non_compliant`. | Może wskazać krótkie uzasadnienie nowości (`oslo_novelty`) i udostępnienia (`oslo_availability`) oraz zweryfikowany cytatem wynik kryterium różnicy z rubryki innowacyjności. |
| **Wyszukiwanie problemowe i porównywarka** (`backend/apps/discovery/matching.py`, `comparison.py`) | W pełni deterministyczne. Normalizacja polskich znaków, prosty stemming końcówek, usunięcie stop-słów (`POLISH_STOPWORDS`), rozwinięcie grup synonimów domenowych (`SYNONYM_GROUPS`), wyliczenie wag 40/20/20/20 (`problem_score`, `sector_score`, `beneficiary_score`, `organization_fit_score`), sprawdzenie progu minimalnego (30%) i niskiej pewności (45%), ocena kompletności zapytania oraz wyznaczenie różnic i liderów w porównywarce. | Obliczenia regułowe backendu. |
| **Plan wdrożeniowy** (`backend/apps/implementation/planner.py`) | Wybór wariantu (`validation` dla koncepcji i wczesnych prototypów do TRL 3, `pilot` dla prototypów i testów, `transfer_deployment` dla pilotaży i rozwiązań wdrożonych), dobór ścieżki (`contact_creator` przy aktywnym patencie lub zgłoszeniu UPRP/EPO przed wdrożeniem, `partnership`, `pilot`, `transfer`), wygenerowanie 5 faz, blokerów, ryzyk, podobnych projektów i mierników przeskalowanych liczbą odbiorców. | `personalize_phases_with_gemini` (`temperature=0.2`) opcjonalnie redaguje listy działań w 5 fazach według kontekstu organizacji. Prompt wymaga zachowania faktów, kontaktów i liczb. Kod zachowuje wariant i kolejność faz oraz sprawdza strukturę odpowiedzi. Treść działań stanowi propozycję dla organizacji wdrażającej. |

---

## Odróżnienie faktów od szacunków

Każde kluczowe pole klasyfikacji (`primary_area`, `innovation_character`, `sectors`, `beneficiary_groups`, `trl`, `deployment_level`, `oslo_compliant`) niesie w `classification_provenance` informację o swoim pochodzeniu:
- `pci_verified` — wartość zweryfikowana lub poprawiona przez operatora PCI; chroniona przed automatycznym nadpisaniem przy kolejnych importach,
- `source` — wartość odczytana bezpośrednio z metadanych źródła,
- `rule_based` — wartość wywnioskowana przez reguły na podstawie tekstu,
- `ai_suggested` — propozycja modelu Gemini po walidacji słownikowej,
- `unknown` — brak informacji w źródle (np. gdy tekst nie podaje poziomu TRL).

Dodatkowo dowody przypisane do innowacji (`Evidence`) rozdzielają fakty potwierdzone przez PCI (`verified_fact`), deklaracje ze źródła (`source_declaration`), wyliczenia systemowe (`system_calculation`), szacunki AI (`ai_estimate`) oraz braki informacji (`missing_info`).

---

## Jakie dane trafiają do modelu AI

Klient `backend/apps/core/gemini.py` łączy się z Google Gemini Developer API lub Vertex AI Express (`GEMINI_MODEL`, domyślnie `gemini-3.8-flash`, timeout `45` s w ustawieniach klienta / `60` s w `.env.example`, wymuszona odpowiedź JSON).

1. **Podczas importu i oceny jakości (`ai_service.py`, `assessment.py`):**
   - Wysyłane są materiały ze skonfigurowanego źródła lub URL wskazanego przez operatora: nazwa rejestru, URL, tytuł roboczy oraz wycinek tekstu (do `4500` znaków na rekord przy ekstrakcji i do `4` zapisanych źródeł po `4500` znaków przy osobnej ocenie jakości). Kanały domyślne wskazują publicznych wydawców; zakres walidacji URL opisuje [`DATA_SOURCES.md`](DATA_SOURCES.md).
   - Zakres tych wywołań obejmuje materiały źródłowe, w tym ewentualne nazwiska i kontakty opublikowane przez wydawcę. Dane kont, ankiety organizacji i zapytania użytkowników pozostają poza zakresem tych wywołań.
   - Ocena dołączona do ekstrakcji używa `temperature=0.2`; osobne przeliczenie jakości przez `assessment.py` używa `temperature=0`.
2. **Podczas generowania planu wdrożeniowego (`planner.py`):**
   - Dopiero gdy zalogowany użytkownik uruchomi utworzenie planu, wysyłane są: tytuł innowacji, wyliczony regułowo wariant i ścieżka, 5 faz bazowych oraz zadeklarowany kontekst z ankiety (`organization_name`, `organization_type`, `role_title`, `deployment_location`, `potential_users_count`, `key_constraints`).
   - Fazy bazowe zawierają także treści wynikające z `current_approach`, `available_resources`, `team_competencies` i `target_timeline`, wymagania i ryzyka innowacji, mierniki oraz kontakt do twórcy ze źródła lub rekordu PCI. Te dane również trafiają do promptu.
   - Do Google trafia treść wybranych pól kontekstu i faz, także ewentualne dane osobowe wpisane w tych tekstach. Hasła, identyfikatory sesji, pole e-mail konta, raporty efektów i pliki załączników pozostają poza zakresem tych wywołań AI.
3. **Podczas wyszukiwania, filtrowania i porównywania:**
   - Do AI nie trafiają żadne dane — wszystko liczy się lokalnie w backendzie.

---

## Walidacja odpowiedzi i kompletność ocen

- **Instrukcje dla modelu:** prompty ekstrakcji i oceny oznaczają pobrany materiał jako dane i nakazują ignorowanie instrukcji z jego treści. Te instrukcje ukierunkowują analizę na opis innowacji i materiał dowodowy.
- **Słowniki zamknięte:** wartości klasyfikacji spoza dozwolonych zbiorów (`ALLOWED_*`) są odrzucane na rzecz wyniku regułowego.
- **Weryfikacja cytatem w ocenie jakości (`validate_dimension`):** kryterium dostaje punkty `0–4` tylko wtedy, gdy odpowiedź zawiera niepuste uzasadnienie (do `1000` znaków), URL przypisany do rekordu i zaakceptowany przez `public_source_url` oraz fragment (`12–400` znaków) występujący w migawce `raw_snapshot` po normalizacji białych znaków. Prompt wymaga polskiego języka uzasadnienia. Cytat zapewnia możliwość prześledzenia podstawy oceny przez operatora. Jeśli brakuje choć jednego kryterium w wymiarze, cały wymiar pozostaje nieustalony (`status: "unknown"`, `score: null`).
- **Niezależność wiarygodności:** w indeksie `credibility` system nigdy nie traktuje wyjaśnień wygenerowanych przez AI ani powtarzających się cytowań jako niezależnego dowodu.
- **Kontrola struktury planu:** odpowiedź Gemini musi zawierać 5 elementów faz i niepuste listy działań dla faz `1..5`. Kod zachowuje bazowe pola faz, podmienia tylko działania i ogranicza ich liczbę do 5 na fazę; przy nieprawidłowej strukturze zapisuje plan regułowy (`ai_personalized = False`). Treść wygenerowanych działań użytkownik ocenia w kontekście swojej organizacji.

---

## Jak korzystać z rekomendacji

1. **Wyjaśnione dopasowanie.** Wynik 40/20/20/20 pokazuje zbieżność problemu z opisem i metadanymi innowacji. Rozbicie na cztery składowe pomaga wybrać projekty do dalszej analizy wdrożeniowej.
2. **Wyszukiwanie dopasowane do domeny.** Normalizacja polskich słów, rdzenie i grupy synonimów łączą język potrzeb organizacji z językiem opisów innowacji. Branża, beneficjenci i typ organizacji pozwalają doprecyzować wyniki.
3. **Oceny z podstawą źródłową.** Indeksy jakości i ocena Oslo 2018 porządkują przesłanki dostępne w materiale źródłowym. Cytaty i pochodzenie pól wspierają weryfikację PCI oraz dalszą analizę merytoryczną, techniczną i patentową.
4. **Czytelna kompletność informacji.** Status „Brak danych” wskazuje, które informacje warto pozyskać od twórcy lub wydawcy, aby przygotować wdrożenie. Ocena liczbowa pojawia się przy spełnieniu warunków walidacji danego wymiaru.
5. **Ciągłość planowania.** Szablony regułowe dostarczają pięciofazowy plan działania, a dostępne Gemini dodatkowo dostosowuje język działań do kontekstu organizacji.
6. **Od celu do wyniku.** Mierniki w planie są proponowanymi celami; szablon może przyjąć skalę `100` odbiorców przy pustym polu profilu. Raport organizacji i osobna weryfikacja PCI dokumentują późniejsze efekty.
