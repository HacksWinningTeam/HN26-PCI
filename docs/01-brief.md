# 01 — Distilled Hackathon Brief

> Primary project brief & challenge context: [`docs/PROJECT_KNOWLEDGE.md`](PROJECT_KNOWLEDGE.md) (**PCI / Radar Innowacji — HackNation 2026**).
> Distilled from `docs/PROJECT_KNOWLEDGE.md`, `docs/inputs/organizer-brief/`, and `docs/inputs/my-notes.md` via `hackathon-kickoff`. Keep concise so agents can read the whole brief quickly without re-reading raw PDFs.

## Timeline

- **Submission Deadline:** `<YYYY-MM-DD HH:MM>`
- **Demo Slot & Length:** `<YYYY-MM-DD HH:MM, e.g. 3 min + 2 min Q&A>`
- **Code Freeze:** `<YYYY-MM-DD HH:MM — default 2h before deadline; only fixes and demo prep after this>`

## Problem & Demo Goal

- **Problem Statement:** Informacje o istniejących polskich innowacjach są rozproszone, a osoba szukająca rozwiązania dla konkretnego problemu nie ma prostego sposobu, aby znaleźć, porównać i ocenić możliwe wdrożenia. Samo odnalezienie innowacji nie prowadzi dziś użytkownika przez kolejne kroki jej zastosowania w jego organizacji.
- **Demo Goal:** Użytkownik opisuje problem albo przegląda katalog, doprecyzowuje branżę i grupę odbiorców, otrzymuje wyjaśnione procentowe dopasowania, porównuje innowacje, rejestruje się przy wybranym rozwiązaniu, uzupełnia krótki kontekst organizacji i otrzymuje spersonalizowany pięciostopniowy plan wdrożeniowy. Następnie oznacza postęp na checkliście, a administrator PCI widzi stan wdrożenia i pochodzenie danych.
- **Target Users:** Główny użytkownik to osoba szukająca projektu lub rozwiązania problemu i rozważająca jego wdrożenie w organizacji, gminie, szkole, uczelni, instytucji publicznej, firmie lub inicjatywie. Drugą rolą jest administrator/operator PCI. Twórca innowacji nie jest wymaganym użytkownikiem systemu.

## Judging Criteria

| Criterion | Weight / Priority | How Our Demo Addresses It |
| --- | --- | --- |
| `<e.g., Technical Execution>` | `<e.g., 40%>` | `<Concrete proof in our app>` |

## Requirements

| ID | Requirement | Priority | Source (PDF / Notes) | Target Task(s) |
| --- | --- | --- | --- | --- |
| `REQ-01` | Publiczny katalog istniejących polskich innowacji pozyskanych z jawnych źródeł | Must | PDF + FAQ | `TBD (hackathon-plan)` |
| `REQ-02` | Jeden ekran „Szukaj innowacji”: katalog, fraza i rozwijany opis problemu; wspólny panel wyszukiwania i filtrów nad wynikami | Must | DEC-004, DEC-014, DEC-015 | `T03` |
| `REQ-03` | Doprecyzowanie zapytania przez branżę, beneficjentów, lokalizację wdrożenia i typ organizacji | Must | DEC-004, DEC-005 | `TBD (hackathon-plan)` |
| `REQ-04` | Ranking dopasowań: problem 40%, branża 20%, beneficjenci 20%, zastosowanie w typie organizacji 20%, z widocznym wyjaśnieniem | Must | DEC-005 | `TBD (hackathon-plan)` |
| `REQ-05` | Katalog z poziomym panelem filtrów, wynikami na pełną szerokość, widokiem siatki/tabeli i porównaniem 2–3 innowacji | Must | FAQ + Notes + DEC-015 | `T03` |
| `REQ-06` | Trzy poziomy informacji: skrócona karta, publiczny detal oraz warstwa zarejestrowana z planem i kontaktem; źródła, TRL, wdrożenie i fakty vs szacunki | Must | FAQ + DEC-005 | `TBD (hackathon-plan)` |
| `REQ-07` | Rejestracja wymagana dopiero dla planu wdrożeniowego, zapisanych danych i śledzenia postępu | Must | DEC-004 | `TBD (hackathon-plan)` |
| `REQ-08` | Ankieta określająca typ organizacji, lokalizację, skalę, obecne podejście, zasoby, kompetencje, termin i ograniczenia | Must | DEC-005 | `TBD (hackathon-plan)` |
| `REQ-09` | Personalizowany plan w wariancie walidacji, pilotażu albo transferu/wdrożenia, z pięcioma fazami, ryzykami, zasobami i miernikami | Must | DEC-005 | `TBD (hackathon-plan)` |
| `REQ-10` | Checklista realizacji planu i zapis postępu użytkownika | Must | DEC-004 | `TBD (hackathon-plan)` |
| `REQ-11` | Panel PCI do weryfikacji danych oraz szczegółowego podglądu porównań, planów i postępu wdrożeń; nawigacja administratora i wspólna tabela z sortowaniem, filtrami i paginacją | Must | DEC-004, DEC-005, DEC-020, DEC-022, DEC-026 | `T04` (delivered subset; broader redesign cancelled) |
| `REQ-12` | Automatyczne pozyskiwanie, aktualizacja i kontrola jakości danych źródłowych | Must | FAQ | `TBD (hackathon-plan)` |
| `REQ-13` | Eksport karty/planu oraz „Powiadom mnie” wymagające tylko e-maila (z konta lub podanego ręcznie) | Should | Notes + DEC-005 | `TBD (hackathon-plan)` |
| `REQ-14` | Anonimowa analityka wyszukiwań i trendów zgodna z RODO | Could | FAQ + Notes | `TBD (hackathon-plan)` |

## Core User Flows

1. **Problem → dopasowanie → wdrożenie:** użytkownik otwiera „Szukaj innowacji” i rozwija opis problemu → opisuje problem → system stopniowo prosi o branżę, beneficjentów, lokalizację wdrożenia i typ organizacji → pokazuje jakość opisu oraz ranking z rozbiciem wyniku 40/20/20/20 → użytkownik otwiera kartę i porównuje rozwiązania → wybiera „Odkryj plan” → rejestruje się i uzupełnia ankietę organizacji → otrzymuje pięciofazowy plan walidacji, pilotażu albo transferu/wdrożenia → zapisuje postęp na checkliście.
2. **Katalog → porównanie → wdrożenie:** użytkownik otwiera ten sam ekran „Szukaj innowacji” → korzysta z wyszukiwania, wspólnych filtrów oraz widoku kart/tabeli → porównuje 2–3 rekordy → otwiera szczegóły → po rejestracji generuje plan dostosowany do swojej organizacji.
3. **Brak wyniku → powiadomienie:** użytkownik nie otrzymuje wystarczająco dobrych dopasowań → zmienia kryteria albo wybiera „Powiadom mnie” → podaje e-mail lub, jeśli jest zalogowany, zatwierdza e-mail konta.
4. **Operator PCI:** administrator przegląda rekordy wymagające weryfikacji, poprawia lub łączy dane, kontroluje źródła i widzi, które zarejestrowane organizacje realizują poszczególne plany oraz na jakim są etapie.

## MVP Scope (Must-Have)

- Jeden publiczny ekran wyszukiwania (`/innovations`) łączący katalog i opis problemu; dwa wejścia z landing page otwierają odpowiedni stan tego samego widoku (`DEC-014`).
- Doprecyzowanie zapytania oraz wyjaśniony ranking dopasowań.
- Filtry, skrócona i szczegółowa karta, transparentne źródła oraz porównanie.
- Rejestracja i profil kontekstu wdrożenia.
- Personalizowany pięciostopniowy plan wraz z checklistą postępu.
- Minimalny panel PCI: weryfikacja rekordów i podgląd wdrożeń.
- Co najmniej dwa kontrastowe przypadki demonstracyjne.

## Nice-to-Have (Only After MVP Is Verified)

- Eksport karty, porównania lub planu do PDF.
- „Powiadom mnie” dla zapytań bez odpowiedniego wyniku.
- Analityka trendów i popularności filtrów.
- Zaawansowany harmonogram automatycznego odświeżania źródeł.

## Explicit Out of Scope

- Konta i panel samoobsługowy dla twórców innowacji.
- Publiczny formularz zgłaszania nowych pomysłów.
- Portal społecznościowy, crowdfunding i wyszukiwanie inwestorów.
- Pełne crawlowanie Internetu w czasie rzeczywistym.
- Automatyczne ujawnianie niezweryfikowanych lub niepublicznych danych kontaktowych.

## Open Questions / Assumptions

- `[OPEN]` Jaki jest termin zgłoszenia, demo i code freeze?
- `[ASSUMPTION]` Grupy odbiorców są metadanymi beneficjentów innowacji, a nie typami kont użytkowników.
- `[ASSUMPTION]` Wynik procentowy oznacza podobieństwo/dopasowanie do zapytania, a nie gwarancję skuteczności wdrożenia.
- `[ASSUMPTION]` Dane kontaktowe widoczne w warstwie zarejestrowanej są potrzebne do realizacji planu i pochodzą ze źródła albo weryfikacji PCI.
- `[ASSUMPTION]` Reguły wybierają wariant i fakty planu, a AI jedynie personalizuje jego treść.
