# PROJECT KNOWLEDGE — PCI / Radar Innowacji

> **HackNation 2026 | Wyzwanie Podkarpackiego Centrum Innowacji (PCI)**  
> **Przeznaczenie dokumentu:** kontekst wejściowy dla AI coding agents; można zapisać w repozytorium jako `PROJECT_KNOWLEDGE.md`.  
> **Tryb pracy:** 24-godzinny hackathon; priorytet: krótki, wiarygodny scenariusz od identyfikacji innowacji do uzasadnionej rekomendacji.

## 0. Konwencje dla agenta

- **[WYMAGANE]** — zapisane w oficjalnym opisie lub regulaminie.
- **[ZALECANE]** — nasze świadome decyzje dla MVP, nie narzucone organizatorowi.
- **[OPCJONALNE]** — można pominąć bez utraty istoty propozycji.
- **[DO POTWIERDZENIA]** — niesprawdzone szczegóły wymagające decyzji lub zapytania mentora.
- Nie utożsamiaj **oceny projektów przez jury** z **wewnętrznym scoringiem innowacji**: to dwa różne mechanizmy.
- Nie wymyślaj fikcyjnych partnerów, grantów, źródeł danych i wyników AI, przedstawiając je jako realnie zweryfikowane fakty.
- Każda funkcja ma służyć przejściu użytkownika przez proces: **odkrycie / pozyskanie ze źródeł → uporządkowanie i klasyfikacja → ocena (fakty vs szacunki + źródła) → wyszukiwanie, filtrowanie i porównywanie → ocena potencjału zastosowania**.
- **ZAKAZ ZMIANY KIERUNKU (FAQ organizatora):** **Nie tworzymy platformy do zgłaszania nowych pomysłów**, portalu społecznościowego, platformy crowdfundingowej ani narzędzia do pozyskiwania finansowania. Tworzymy narzędzie do **automatycznego wyszukiwania, identyfikowania, analizowania i oceniania istniejących innowacyjnych rozwiązań na terenie Polski**.
- AI może wspierać analizę i klasyfikację, ale system musi **wskazywać źródła informacji** oraz **odróżniać fakty potwierdzone od szacunków**.

### Źródła oficjalne

1. `PCI - Pełna treść zadania konkursowego.pdf` — sekcje 2–9: wymagania, oczekiwany rezultat, zasoby, demo i oceny.
2. `PCI -Regulamin zadania konkursowego.pdf` — §2: dwa etapy oceny, §3: nagrody, §4: licencja EUPL-1.2 i publikacja.
3. `Doprecyzowanie wyzwania RADAR INNOWACJI – HackNation 2026` (FAQ organizatora) — doprecyzowanie celu, 3 obszarów (Oslo Manual 2018), grup docelowych, źródeł, kryteriów oceny (w tym TRL 1–9), listy wyłączeń („Czego nie tworzymy?”) oraz oczekiwanego rezultatu.

**Gdy ten plik różni się od regulaminu, treści zadania lub FAQ organizatora, obowiązuje dokument organizatora.**

---

## 1. Zrozumienie problemu i celu

### Problem

W Polsce w różnych środowiskach (nauka, biznes/startupy, administracja, edukacja) powstają i są wdrażane wartościowe innowacyjne rozwiązania, które często pozostają mało znane lub trudno dostępne ze względu na **rozproszenie informacji w wielu źródłach**. Brakuje jednego miejsca umożliwiającego ich automatyczne wyszukanie, uporządkowanie, ocenę rzeczywistego poziomu rozwoju (wdrożenia i dojrzałości) oraz ocenę potencjału praktycznego zastosowania.

### Zakres innowacji i definicja [WYMAGANE — FAQ organizatora]

System koncentruje się na **trzech obszarach**:

1. **Technologiczny** — nowe technologie, produkty, wynalazki i rozwiązania techniczne.
2. **Edukacyjny** — innowacyjne metody nauczania, narzędzia edukacyjne i rozwiązania wspierające rozwój szkół oraz uczelni.
3. **Administracyjny** — rozwiązania usprawniające funkcjonowanie administracji publicznej, samorządów i instytucji publicznych.

Punktem odniesienia dla definicji innowacji jest podręcznik **OECD/Eurostat Oslo Manual 2018**: *innowacja to nowe lub ulepszone rozwiązanie, które znacząco różni się od dotychczasowych i zostało udostępnione użytkownikom lub wdrożone w praktyce*.

### Cel projektu [WYMAGANE — FAQ organizatora]

Stworzenie prototypu inteligentnego **Radaru Innowacji**, który umożliwia **automatyczne wyszukiwanie, identyfikowanie, analizowanie i ocenianie istniejących innowacyjnych rozwiązań na terenie Polski**:

1. **Wyszukuje** istniejące innowacje w polskich i ogólnodostępnych źródłach informacji.
2. **Automatycznie gromadzi i porządkuje** dane (API, automatyczne przeszukiwanie stron, analiza dokumentów i publikacji z wykorzystaniem AI) oraz **cyklicznie aktualizuje** zgromadzoną bazę.
3. **Rozpoznaje obszar i charakter** innowacji (technologiczny, edukacyjny, administracyjny).
4. **Ocenia poziom wdrożenia i dojrzałość** rozwiązania (w tym skalę TRL 1–9, jeśli ma zastosowanie), innowacyjność, potencjał zastosowania oraz wiarygodność.
5. **Umożliwia wyszukiwanie, filtrowanie i porównywanie** innowacji odpowiednio do potrzeb poszczególnych grup docelowych.
6. **Prezentuje wyniki w postaci przejrzystych kart innowacji** wraz ze **źródłami informacji** oraz rozróżnieniem **faktów potwierdzonych od szacunków**.

**Najważniejsza wartość projektu:** stworzenie jednego miejsca, w którym można odkrywać polskie innowacje, sprawdzać ich rzeczywisty poziom rozwoju i szybko ocenić, gdzie mogą znaleźć praktyczne zastosowanie (skrócenie czasu znalezienia istniejącego rozwiązania i zwiększenie liczby wdrażanych innowacji w oparciu o polskie IP).

### Czego NIE tworzymy [WYMAGANE — FAQ organizatora]

Radar **NIE** jest:
- platformą do zgłaszania nowych pomysłów;
- portalem społecznościowym dla innowatorów;
- platformą crowdfundingową;
- narzędziem do pozyskiwania finansowania (ani wyszukiwania inwestorów).

### Grupy docelowe [WYMAGANE — FAQ organizatora]

Potencjalnymi odbiorcami Radaru są:
- **inwestorzy i podmioty komercyjne**;
- **instytucje publiczne i samorządy**;
- **uczelnie i jednostki naukowe**;
- **szkoły i placówki edukacyjne**;
- **startupy i przedsiębiorstwa**;
- **indywidualni innowatorzy i wynalazcy**.

System powinien umożliwiać wyszukiwanie rozwiązań odpowiednio do potrzeb i zainteresowań poszczególnych grup.

### Analityka użytkowników [OPCJONALNE — FAQ organizatora]

System może opcjonalnie gromadzić anonimowe dane dotyczące korzystania z aplikacji (np. najczęściej wyszukiwane obszary, przeglądane innowacje, popularne kategorie rozwiązań) w celu identyfikowania trendów i zainteresowań. Ewentualne przetwarzanie danych osobowych musi być zgodne z **RODO**.

### Jednozdaniowa koncepcja MVP [ZALECANE]

> **Radar Innowacji** — inteligentny katalog istniejących polskich innowacji pozyskiwanych z publicznych źródeł, klasyfikowanych w obszarach technologicznym, edukacyjnym i administracyjnym, ocenianych pod kątem poziomu wdrożenia, TRL i potencjału zastosowania, z czytelnymi kartami źródeł (fakty vs szacunki), filtrowaniem pod grupy docelowe i porównywarką.

---

## 2. Oficjalne kryteria i deliverables

### Kryteria etapu I [WYMAGANE — regulamin §2]

| Kryterium | Waga | Co powinien zobaczyć juror |
|---|---:|---|
| Związek z wyzwaniem i jakość rozwiązania problemu | 20% | Cała ścieżka od pomysłu do dalszego wykorzystania |
| Pomysł i oryginalność | 20% | Wyróżnik lepszy niż zwykły formularz i lista |
| Użyteczność dla użytkowników i jakość doświadczenia | 20% | Niski próg zgłoszenia, czytelne podpowiedzi, zrozumiałe wyniki |
| Kompletność oraz jakość prototypu/demonstracji | 20% | Działające demo na dwóch sensownych przykładach |
| Potencjał wdrożeniowy, skalowalność i transfer innowacji | 20% | Dalszy workflow, model wielu instytucji, transparentne rekomendacje |

Każde z pięciu kryteriów jest oceniane w skali 0–5. Regulamin opisuje **dwuetapową ocenę**.

### Etap II [WYMAGANE, jeśli zakwalifikowani]

- Zgodnie ze szczegółowym regulaminem PCI do drugiego etapu przechodzą **trzy najwyżej ocenione zespoły**.
- **Pitch deck / wystąpienie do 5 minut**.
- Każde z kryteriów wystąpienia ma wagę **20%**: spójność, jasność przekazu, zainteresowanie odbiorcy, pomysłowość prezentacji, charyzma.
- Wygrywa pierwszy zespół w rankingu etapu II, zgodnie z regulaminem PCI.
- [DO POTWIERDZENIA] Jeśli inne informacje organizatora podają inną liczbę finalistów, potwierdzić zasady bezpośrednio u PCI.

### Deliverables zgłoszenia [WYMAGANE]

- [ ] Tytuł projektu.
- [ ] Opis problemu i proponowanego rozwiązania.
- [ ] Opis działania i głównych funkcji.
- [ ] **Prezentacja PDF, maksymalnie 10 slajdów**.
- [ ] **Film demonstracyjny do 3 minut** w dostępnym **otwartym repozytorium**, z podanym linkiem.

### Materiały opcjonalne w zgłoszeniu

- Repozytorium kodu źródłowego.
- Działający prototyp lub demonstrator.
- Zrzuty ekranu, link do demo, materiały graficzne / makiety / modele.

**Istotna subtelność:** oficjalne „oczekiwany rezultat” to **prototyp**, natomiast lista formalnych załączników do zgłoszenia wymienia działający prototyp jako dodatkową pozycję. **Dla naszego zespołu działający prototyp traktujemy jako P0**, bo wzmacnia prezentację i 20% kryterium kompletności; nie przedstawiaj tego jednak jako literalnego obowiązku dodania osobnego linku do aplikacji.

### Techniczne zasady zadania [WYMAGANE]

- Organizator **nie narzuca języka, frameworka ani technologii**.
- Przy wykorzystaniu AI/ML, automatycznych rekomendacji, danych czy integracji trzeba opisać **źródła, założenia działania i ograniczenia**.
- Zwrócić uwagę na **skalowanie na wiele organizacji**, ochronę danych, integracje, przejrzystość ocen/rekomendacji, rozwój po hackathonie.
- W demo pokazać sekwencję: wprowadzenie/wykrycie → opis → scoring → odbiorcy/partnerzy/ścieżki → uzasadnienie i **oczekiwane mierniki skuteczności**.
- W miarę możliwości ocenić **co najmniej dwa przykładowe przypadki użycia**.

---

## 3. Zakres MVP w 24 godziny

### P0 — rdzeń demonstracyjny [ZALECANE]

1. **Pozyskiwanie i porządkowanie istniejących innowacji** z wybranych polskich źródeł (API / scraping / analiza dokumentów z AI + ziarno zweryfikowanych rekordów demo z linkami źródłowymi) oraz mechanizm **cyklicznej aktualizacji** (lub odświeżenia indeksu).
2. **Rozpoznawanie obszaru i charakteru innowacji** (`Technologiczny`, `Edukacyjny`, `Administracyjny`) w oparciu o definicję Oslo Manual 2018.
3. **Wyszukiwanie, filtrowanie i porównywanie innowacji** — dostosowane do grup docelowych (inwestorzy, samorządy/instytucje publiczne, uczelnie, szkoły, startupy/firmy, indywidualni wynalazcy), obszaru, poziomu wdrożenia i TRL.
4. **Czytelna Karta Innowacji** — opis rozwiązania, obszar zastosowania, **źródła informacji**, status/poziom wdrożenia (`koncepcja`, `prototyp`, `testy`, `wdrożenie pilotażowe`, `rozwiązanie stosowane w praktyce`), dojrzałość (`TRL 1–9`, jeśli ma zastosowanie), ocena potencjału zastosowania i wiarygodności.
5. **Transparentna ocena z rozróżnieniem faktów od szacunków** — jawne wskazanie, co jest potwierdzone źródłowo, a co jest szacunkiem/klasyfikacją AI.
6. **Co najmniej dwa kontrastowe, wiarygodne przypadki** (np. technologiczny z TRL + edukacyjny lub administracyjny wdrożony w praktyce) pokazujące różne poziomy gotowości i potencjału zastosowania.
7. **Przygotowany film do 3 minut i PDF do 10 slajdów**.

### P1 — jeśli P0 jest gotowe [ZALECANE]

- Porównywarka wybranych innowacji obok siebie (np. porównanie 2–3 kart: obszar, poziom wdrożenia, TRL, wiarygodność, źródła).
- Harmonogram/panel cyklicznej aktualizacji bazy (wykrywanie nowych rekordów i zmian statusu wdrożenia).
- Opcjonalna anonimowa analityka zainteresowań (najczęściej wyszukiwane obszary i kategorie, zgodnie z RODO).
- Eksport karty innowacji / zestawienia porównawczego.

### P2 — out of scope [OPCJONALNE / WYŁĄCZONE]

- **Wyłączone przez FAQ:** formularz zgłaszania nowych pomysłów przez użytkowników, funkcje społecznościowe, crowdfunding, pozyskiwanie finansowania / kojarzenie inwestorów.
- Pełne crawlowanie całego internetu w czasie rzeczywistym bez ograniczeń.
- Produkcyjny system kont wielu organizacji, SSO, rozbudowany silnik uprawnień.
- Trenowanie własnych modeli ML od zera.

**Reguła zakresu:** najpierw stwórz działający pipeline odkrywania/indeksacji z realnych źródeł + wyszukiwanie, filtrowanie, karty oceny (fakty vs szacunki) i porównywanie na co najmniej dwóch kontrastowych przykładach.

---

## 4. Sugerowana architektura [ZALECANE; nie narzucona]

```text
Formularz zgłoszenia / import przykładu
  -> Innovation Record
  -> ocena jakości opisu / braków
  -> Explainable Scoring Engine
  -> Similarity Search (katalog)
  -> Partner & Next-step Recommender
  -> Innovation Detail + Action Plan + Explanation
```

**Preferowany stack prototypu:** TypeScript + React/Next.js (albo stack już znany zespołowi), Zod do walidacji, lokalne fixture JSON i prosty store/persistencja. AI/LLM **opcjonalnie** jako warstwa analizy tekstu, ale cały produkt musi działać również bez płatnego API. Można zacząć od reguł i dopiero potem ulepszyć je modelami.

### Proponowana struktura repozytorium

```text
src/
  app/                           # UI
    innovations/                 # lista + szczegóły
    submit/                      # nowy pomysł
    assess/                      # ocena/wyjaśnienie
  components/
  domain/innovation/
    types.ts
    schema.ts
    scoring.ts
    similarity.ts
    recommendations.ts
    partnerMatching.ts
    seed.ts
  data/fixtures/                # dane demonstracyjne opisane w README
public/
submission/
  presentation.pdf              # <= 10 slajdów
  demo.mp4                      # <= 3 min + publiczny link
README.md
DATA_SOURCES.md
AI_USAGE.md
LICENSE                           # uzgodniona licencja i kompatybilne zależności
PROJECT_KNOWLEDGE.md
```

Jeżeli działająca aplikacja wymaga wdrożenia, wybierz **najprostsze odtwarzalne wdrożenie**; demo nie powinno zależeć od niepewnego zewnętrznego API.

---

## 5. Proponowany model danych [ZALECANE]

### Innovation

| Pole | Przykład / opis |
|---|---|
| `id` | UUID/string |
| `title` | Nazwa pomysłu |
| `summary` | Opis w 2–4 zdaniach |
| `problem` | Jaki problem jest rozwiązywany? |
| `solution` | Na czym polega innowacja? |
| `innovation_type` | technological / organizational / educational / social / process / other |
| `sector_tags` | np. edukacja, zdrowie, administracja |
| `organization_name` | Instytucja zgłaszająca |
| `organization_type` | school / university / local_government / public_institution / other |
| `creator_display_name` | osoba lub zespół — w demo dane fikcyjne |
| `target_users` | odbiorcy / użytkownicy |
| `maturity` | concept / prototype / pilot / deployed |
| `evidence` | wyniki pilotażu, opis badań, dokumentacja lub `none` |
| `expected_impact` | deklarowane rezultaty, hipotezy |
| `transfer_requirements` | koszty, kompetencje, zasoby potrzebne do wdrożenia |
| `created_at`, `updated_at` | ISO datetime |
| `status` | draft / submitted / assessed / matched / in_pilot |
| `visibility` | public / restricted / private (MVP może ograniczyć do fikcyjnych danych publicznych) |

### Assessment

- `innovation_id`
- `criteria`: lista `{criterion_id, weight, score, explanation, evidence_refs}`.
- `overall_score` — deterministycznie wyliczony, nie „przybliżony przez AI”.
- `strengths`, `risks`, `missing_information`.
- `assessed_at`, `assessment_version` — wersjonowanie reguł.
- `reviewed_by` i `review_note` (opcjonalne na hackathon).

### Match i Recommendation

- `related_innovation_ids`: przykłady podobnych rozwiązań + wyjaśnienie podobieństwa.
- `partner_candidates`: podmioty/kategorie podmiotów, poziom dopasowania, przyczyna; **nie fałszuj nazw rzeczywistych partnerów**.
- `recommended_path`: `research` / `prototype` / `pilot` / `transfer` / `partnership` / `commercialization`.
- `recommended_actions`: lista krótkich działań z uzasadnieniem i miernikami sukcesu.
- `confidence` albo `evidence_level`: jawnie wskazać niepewność, nie przedstawiać tego jako gwarancji wdrożenia.

### Minimalne interfejsy TypeScript (przykładowe)

```ts
type InnovationType =
  | 'technological' | 'organizational' | 'educational'
  | 'social' | 'process' | 'other';

type Maturity = 'concept' | 'prototype' | 'pilot' | 'deployed';

type NextStep = 'research' | 'prototype' | 'pilot' | 'transfer' | 'partnership';

interface Innovation {
  id: string;
  title: string;
  problem: string;
  solution: string;
  type: InnovationType;
  organizationName: string;
  targetUsers: string[];
  sectorTags: string[];
  maturity: Maturity;
  evidence: string[];
}

interface ScoringDimension {
  key: string;
  score: number;           // np. 0..5, skala jawna
  weight: number;          // suma wag = 1
  explanation: string;
  evidence: string[];
}

interface InnovationAssessment {
  innovationId: string;
  dimensions: ScoringDimension[];
  overallScore: number;    // jeden jednoznaczny sposób liczenia
  missingInformation: string[];
  nextStep: NextStep;
  nextStepReason: string;
  measurableSuccessCriteria: string[];
}
```

---

## 6. Scoring innowacji — zasady transparentności

**To nasz algorytm produktu, NIE oficjalna skala oceniania rozwiązań HackNation przez jury.**

### Proponowane kryteria oceny innowacji [WYMAGANE — FAQ organizatora]

1. **Poziom wdrożenia:** `koncepcja`, `prototyp`, `testy`, `wdrożenie pilotażowe`, `rozwiązanie stosowane w praktyce`.
2. **Dojrzałość technologiczna:** skala **TRL (Technology Readiness Level 1–9)**, jeśli ma zastosowanie (np. w obszarze technologicznym; w edukacyjnym/administracyjnym może być `N/A` lub opcjonalna).
3. **Innowacyjność:** stopień nowości i ulepszenia względem istniejących rozwiązań (w odniesieniu do Oslo Manual 2018).
4. **Potencjał zastosowania:** możliwość wykorzystania w innych instytucjach, organizacjach lub branżach.
5. **Wiarygodność:** dostępność dokumentacji, potwierdzeń wdrożenia i wiarygodnych źródeł.

Rezultatem oceny powinna być **czytelna karta innowacji** zawierająca: opis rozwiązania, obszar zastosowania, źródło informacji, status wdrożenia, poziom gotowości (w tym TRL, jeśli dotyczy) i ocenę potencjału. **System musi wskazywać źródła informacji oraz odróżniać fakty potwierdzone od szacunków.**

### Metoda liczenia

`overallScore = sum(score_i * weight_i) / 5 * 100` (wynik 0–100). Suma wag powinna wynosić 1. Oprócz wyniku pokazuj **co jest udokumentowane, co jest deklaracją autora i czego brakuje**. Nie traktuj braku dowodu jako definitywnego dowodu braku wartości pomysłu.

### Rekomendacja dalszego kroku

Nie rekomenduj automatycznie „komercjalizacji” każdej wysoko ocenionej innowacji. Uwzględnij **dojrzałość, typ i możliwość wykorzystania**. Przykładowa logika:

- Koncept bez dowodów → **research / validation**: rozmowy z odbiorcami + pilotaż problemu.
- Prototyp ze wstępnymi wynikami → **pilot** w drugiej organizacji.
- Zweryfikowane rozwiązanie organizacyjne/edukacyjne → **transfer** i pakiet wdrożeniowy.
- Technologia wymagająca dalszego rozwoju → **partnership** z instytucją/firmą o odpowiednich kompetencjach.

### Mierniki skuteczności — wymagane w scenariuszu demonstracji

Dla każdej rekomendacji pokaż 1–3 konkretne miary, np.:

- Liczba organizacji gotowych do pilotażu.
- Liczba użytkowników testowych, odsetek pozytywnych rezultatów pilotażu.
- Szacowany koszt i czas wdrożenia w porównaniu z metodą dotychczasową.
- Liczba wykonanych kroków transferu / skontaktowanych partnerów.

Miary powinny wynikać z charakteru pomysłu; nie twórz fikcyjnych „osiągniętych wyników”.

---

## 7. Similarity i partner matching

### Podobne innowacje — wariant pewny na 24 h

- Znormalizuj tytuł, problem, opis i tagi.
- Wyznacz podobieństwo na podstawie tokenów/tagów/TF-IDF lub lekkiej biblioteki; wypisz podstawę dopasowania.
- Zwróć najwyżej kilka wyników; jeżeli nic nie pasuje, **powiedz „brak podobnych w bazie demo”**, a nie „na świecie nic podobnego nie istnieje”.
- Nie używaj wyszukania podobieństwa jako twardego stwierdzenia o naruszeniu patentu.

### Dopasowanie partnera — wariant pewny

- Mały, jawnie oznaczony katalog **archetypów partnerów** albo zweryfikowanych instytucji z tagami kompetencji i obszarów zastosowań.
- Dopasowanie: problem/branża + dojrzałość + potrzeby zasobowe + zakres organizacji.
- Wyjaśnij „dlaczego ten typ partnera” zamiast generować pozornie pewne rekomendacje.
- Link kontaktowy dla prawdziwej instytucji pokazywać tylko wtedy, gdy został sprawdzony; fikcyjne podmioty oznaczaj `DEMO`.

### AI — opcja poprawiająca UX, nie wymóg zadania

- LLM może **porządkować opis** i sugerować pytania uzupełniające.
- Liczby scoringu i ścieżka rekomendacji pozostają deterministyczne lub **zatwierdzane przez eksperta**.
- Gdy model jest nieosiągalny, aplikacja ma działać z regułami / fixture.
- Jeśli uruchamiasz AI, w `AI_USAGE.md` opisz model/usługę, typ przesyłanych danych, ograniczenia, zasady bezpieczeństwa i sposób walidacji odpowiedzi.

---

## 8. Źródła danych i dane demonstracyjne

### Kategorie źródeł wskazane w FAQ organizatora [WYMAGANE — FAQ]

- **Nauka i technologie:** Google Scholar, polskie uczelnie i instytuty badawcze oraz bazy patentowe (np. UPRP, EPO, PBN, PPM, PAN dLibra).
- **Projekty badawcze i innowacyjne:** NCBR, PARP, NCN, Fundusze Europejskie, CORDIS, Interreg.
- **Startupy i biznes:** strony internetowe firm, startupów, inkubatorów i centrów transferu technologii, instytucji finansujących.
- **Administracja i edukacja:** strony samorządów, szkół, uczelni i instytucji publicznych, raporty oraz opisy zrealizowanych projektów.

Pozyskiwanie danych może odbywać się poprzez **API, automatyczne przeszukiwanie stron internetowych oraz analizę dokumentów i publikacji z wykorzystaniem AI**, z **cykliczną aktualizacją bazy**.

### Przykładowe zasoby z pełnej treści zadania [OPCJONALNE DO WYKORZYSTANIA]

- UPRP: <https://ewyszukiwarka.pue.uprp.gov.pl/search/simple-search>.
- Europejski Urząd Patentowy: <https://register.epo.org/regviewer>.
- Polska Bibliografia Naukowa: <https://pbn.nauka.gov.pl/core/#/home>.
- Portal publikacji: <https://ppm.edu.pl/index.seam>.
- Cyfrowe biblioteki PAN: <https://www.czasopisma.pan.pl/dlibra>.
- Interreg Europe: <https://interreg.gov.pl/lista-projektow/>.
- NCBR: <https://www.gov.pl/web/ncbr/wyszukiwarka-sukcesow-beneficjentow>.

**Te URL-e są przykładami źródeł wskazanymi przez organizatora, a nie gwarancją publicznego API czy swobodnej licencji eksportu.** Przed integracją sprawdź dostęp, zasady i atrybucję. Na 24-godzinne MVP integracja z bazą patentów **nie jest obowiązkowa**.

### Minimum dwóch scenariuszy demonstracyjnych [ZALECANE]

**A. Innowacja organizacyjna/edukacyjna, gotowa do transferu**

- Fikcyjny projekt usprawniający obsługę mieszkańców lub edukację, z opisanym pilotażem.
- Scoring z wysoką możliwością transferu i jawnymi dowodami.
- Rekomendacja: przygotuj pakiet wdrożeniowy i pilotaż w kolejnej instytucji.

**B. Innowacja technologiczna na etapie idei**

- Fikcyjny pomysł technologiczny, bez potwierdzenia potrzeb i bez prototypu.
- Scoring ujawnia braki dowodów.
- Rekomendacja: walidacja potrzeb, dopiero później prototyp/partner.

Oba przykłady mają **inne wyniki i inne kolejne kroki**. Dane oznacz `synthetic demo`, jeżeli nie pochodzą z weryfikowalnego źródła.

---

## 9. Ekrany produktu i scenariusz jury

### Ekrany P0

1. **Discover / Radar** — wyszukiwarka i katalog istniejących polskich innowacji z filtrowaniem pod grupy docelowe, obszar (`Technologiczny`, `Edukacyjny`, `Administracyjny`), poziom wdrożenia i TRL.
2. **Innovation Card (Detail & Assessment)** — czytelna karta innowacji: opis rozwiązania, obszar zastosowania, źródła informacji, status wdrożenia, TRL (jeśli dotyczy), ocena potencjału i wiarygodności z jawnym rozróżnieniem **faktów potwierdzonych od szacunków**.
3. **Compare** — porównywanie wybranych innowacji (poziom wdrożenia, TRL, innowacyjność, potencjał zastosowania, wiarygodność, źródła).
4. **Sources & Refresh (Ingestion)** — podgląd źródeł danych (nauka, projekty B+R, startupy, administracja/edukacja), statusu indeksacji i cyklicznej aktualizacji bazy.
5. *(Opcjonalnie)* **Analytics / Trends** — anonimowe statystyki najczęściej wyszukiwanych obszarów i kategorii (zgodne z RODO).

### Demo do 3 minut (film jest obowiązkowy)

| Czas orientacyjny | Co pokazujemy |
|---|---|
| 0:00–0:20 | Problem ukrytych innowacji i jedna obietnica produktu |
| 0:20–0:55 | Dodanie/wybranie pomysłu i uporządkowany opis |
| 0:55–1:25 | Scoring z uzasadnieniem |
| 1:25–1:55 | Podobne rozwiązania i dopasowanie partnera |
| 1:55–2:20 | Rekomendacja następnych działań + mierniki |
| 2:20–2:45 | Drugi przykład z inną rekomendacją |
| 2:45–3:00 | Skalowanie i końcowa wartość rozwiązania |

Scenariusz musi być odtwarzalny; przed filmem wyłącz zbędne animacje, błędy i zależności od niestabilnych API. Film musi być umieszczony zgodnie z wymogiem „dostępnego, otwartego repozytorium” i link publicznie działać bez logowania.

### Jakość UX

- Formularz prosty, bez konieczności znajomości specjalistycznego żargonu.
- Nie pokazuj jednego „magicznego %” bez rozbicia na kryteria.
- Odróżniaj dowody, deklaracje i szacunki.
- Wyświetlaj rzeczywisty kolejny krok; nie kończ procesu na karcie wyniku.
- Zapewnij czytelność mobilną i podstawową dostępność.

---

## 10. Testy akceptacyjne

- [ ] Nowa innowacja może być wprowadzona, zwalidowana i odnaleziona w katalogu.
- [ ] Katalog wspiera **co najmniej typ technologiczny i nietechnologiczny**.
- [ ] Wynik scoringu jest deterministyczny i zgodny z wagami.
- [ ] Każda punktacja ma komentarz i informację o dostępnych/brakujących dowodach.
- [ ] Podobne projekty są wyświetlane z wyjaśnieniem, a brak dopasowań nie powoduje halucynacji.
- [ ] System potrafi zasugerować różne ścieżki dla dwóch różnych przypadków.
- [ ] Każda ścieżka zawiera przynajmniej dwa działania i miernik sukcesu.
- [ ] Reklamowane integracje są realne; pozostałe wyraźnie oznaczone jako planowane.
- [ ] Dane demo i partnerzy syntetyczni są oznaczeni.
- [ ] Link do filmu działa publicznie, film **≤ 3 min**, prezentacja **≤ 10 slajdów**.
- [ ] Zależności i przyszła publikacja w EUPL-1.2 są prawnie możliwe.

**Definition of Done:** odtwarzalny scenariusz identyfikacji/zgłoszenia, ocena z transparentnymi kryteriami, podobieństwa, sensowna rekomendacja dalszych działań i partnera, dwa testowe przypadki, PDF i film, plus README z ograniczeniami, danymi i licencjami.

---

## 11. Plan 24 h

| Odcinek | Development | Demo / dokumentacja |
|---|---|---|
| T+0–2 h | Uzgodnienie typów, scoringu, dwóch demo cases | Pitch, główna obietnica produktu |
| T+2–7 h | Formularz + katalog + fixture | Rozpisanie user journey |
| T+7–12 h | Scoring i explainability + testy | Zrzuty ekranu prototypu |
| T+12–16 h | Similarity + recommendation + dwa przypadki | Szkielet PDF (max 10 slajdów) |
| T+16–19 h | Stabilność, UX, ewentualnie AI assistance | Storyboard filmiku |
| T+19–22 h | Freeze, testy i README | Nagranie, montaż, link publiczny |
| T+22–24 h | Smoke test i działające demo | PDF finalny, kontrola zgłoszenia |

**Reguła:** nie uruchamiaj głębokiej integracji patentowej, dopóki scoring, rekomendacje i film nie są gotowe.

---

## 12. Podział na agentów / moduły

- **Agent FRONTEND:** katalog, formularz, detail, assessment, rekomendacje i responsywność.
- **Agent DOMAIN:** model danych, reguły scoringu, deterministyczne rekomendacje, testy.
- **Agent MATCHING:** podobieństwa, katalog partnerów/archetypów, wyjaśnienia i fixture.
- **Agent DEMO:** przykłady o różnych wynikach, stabilny demo-flow, film, PDF.
- **Agent QA/LEGAL:** README, źródła, licencje, ochrona danych, kontrola, że aplikacja działa bez API.

Zamrozić kontrakty (`Innovation`, `Assessment`, `Recommendation`) przed równoległą pracą agentów. AI nie ma samo zmieniać wag/kryteriów scoringu bez aktualizacji testów i dokumentacji.

### Instrukcja wykonawcza dla agenta

1. Przeczytaj dokument i istniejący kod; wskaż P0, które realizujesz.
2. Wprowadzaj zmiany w małych, uruchamialnych partiach.
3. Dla scoringu najpierw testy, potem UI.
4. Jeśli korzystasz z AI, opisz dowody i ograniczenia; nie traktuj wyniku modelu jako prawdy.
5. Nie umieszczaj kluczy API ani danych osobowych rzeczywistych ludzi w repozytorium.
6. Każdy ekran musi być potrzebny w demonstracji; unikaj zbędnego boilerplate.
7. Po implementacji uruchom build/testy, opisz co rzeczywiście działa, a co jest planowane.

---

## 13. Prezentacja, pitch i propozycja narracji

### Prezentacja PDF do 10 slajdów [ZALECANE]

1. Problem: ukryte innowacje między instytucjami.
2. Użytkownicy i brakujący proces.
3. Propozycja wartości i workflow.
4. Formularz / wykrycie innowacji.
5. Scoring i przejrzystość ocen.
6. Wykrywanie podobieństw i partnerzy.
7. Rekomendacja + mierniki sukcesu.
8. Dwa przykłady: różne wyniki i kroki.
9. Architektura, bezpieczeństwo, źródła, ograniczenia.
10. Potencjał wdrożenia, rozwój i call to action.

### Narracja pitchu 5-minutowego (jeśli awans)

**Problem → demo end-to-end → dlaczego rekomendacje są wiarygodne → przenoszenie innowacji między instytucjami → skalowanie i następny krok.** Pitch ma wartość konkursową niezależną od poziomu skomplikowania technologicznego; zadbaj o jasność i demonstrację na prawdziwie działającym produkcie.

---

## 14. Prawa, licencje, źródła, kontakty

- Zwycięskie rozwiązanie ma być **publicznie udostępnione na licencji EUPL-1.2** (regulamin §1 i §4).
- Regulamin przewiduje publikację w publicznym repozytorium GitHub Ministerstwa Cyfryzacji z licencją i wskazaniem autorów.
- W odróżnieniu od wyzwania MC, **PCI nie przejmuje wyłącznych autorskich praw majątkowych do rozwiązania**; korzysta z niego na zasadach open source (§4 regulaminu).
- Komplet kodu źródłowego, dokumentacja i udostępnienie zgodnie z EUPL-1.2 są warunkami przekazania nagrodzonego rozwiązania; w repozytorium należy od początku używać komponentów i zasobów, których licencje pozwalają na tę publikację.
- Nie deklaruj kompatybilności każdej biblioteki na podstawie intuicji; sprawdź ją. Tekst licencji pozyskaj z wiarygodnego oficjalnego źródła, nie generuj z pamięci.
- Jeśli usługa AI wymaga płatnego konta, zapewnij działanie bez niej i opisz koszty/ograniczenia.
- Nagroda według regulaminu: **11 111,00 zł brutto** (jedna główna).
- Regulamin ma drobne niejasności redakcyjne (m.in. „X dni” dla wypłaty); nie podejmuj na ich podstawie automatycznych decyzji prawnych.
- Osoba wskazana przez PCI: **Kacper Moczarny**, `k.moczarny@pcinn.org`; mentorzy na stanowisku PCI i Discordzie wyzwania.

---

## 15. Otwarte decyzje

- [ ] Jakie pięć kryteriów i wag przyjmujemy jako naszą **ocenę innowacji**?
- [ ] Czy w MVP oceny dokonuje autor, ekspert czy silnik reguł z zatwierdzeniem?
- [ ] Jak reprezentujemy dowody i braki informacji?
- [ ] Które pomysły i instytucje są prawdziwe, a które syntetyczne?
- [ ] Czy rekomendujemy partnerów po nazwie czy archetypy?
- [ ] Czy AI jest rzeczywiście potrzebne i czy działa bez płatnej infrastruktury?
- [ ] Gdzie trwale hostowany będzie film i czy link działa bez logowania?
- [ ] Jakie ograniczenia i ścieżki rozwoju pokażemy jury?

## 16. Skrócony prompt startowy do coding agenta

> Budujemy HackNation 2026, PCI „Radar Innowacji”. Zacznij od `PROJECT_KNOWLEDGE.md`. Tworzymy narzędzie do **automatycznego wyszukiwania, identyfikowania, analizowania i oceniania istniejących innowacyjnych rozwiązań w Polsce** (NIE platformę do zgłaszania nowych pomysłów, NIE portal społecznościowy, NIE crowdfunding). Zaimplementuj P0: pozyskiwanie/porządkowanie danych ze źródeł (z cykliczną aktualizacją), klasyfikację w 3 obszarach (`Technologiczny`, `Edukacyjny`, `Administracyjny`, Oslo Manual 2018), wyszukiwanie/filtrowanie pod grupy docelowe, porównywarkę oraz przejrzystą kartę innowacji (poziom wdrożenia, TRL 1–9 jeśli dotyczy, innowacyjność, potencjał zastosowania, wiarygodność) ze wskazaniem źródeł i odróżnieniem faktów potwierdzonych od szacunków. Pokaż co najmniej dwa kontrastowe przypadki. Zapewnij możliwość przygotowania publicznego filmu ≤ 3 min i PDF ≤ 10 slajdów. Pamiętaj, że zwycięski projekt musi nadawać się do publikacji na EUPL-1.2. Zrób plan implementacji, potem koduj, testuj i raportuj rzeczywisty stan.
