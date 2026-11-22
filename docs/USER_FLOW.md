# Przejście przez aplikację

Przejdź po kolei przez kroki 1–12. Zacznij bez logowania, następnie użyj konta organizacji, a na końcu konta operatora PCI.

## 1. Otwórz katalog — bez logowania

Wejdź na `/` → **Szukaj innowacji** (`/innovations`).

- Ustaw **Obszar innowacji** kolejno na technologiczny, edukacyjny i administracyjny. Sprawdź wyniki dla każdego obszaru.
- Zmień **Branżę**, **Beneficjentów** i **Etap wdrożenia**. W dodatkowych filtrach sprawdź **Charakter rozwiązania**, minimalny TRL, pochodzenie i typ organizacji źródłowej. Obszar i charakter to osobne pola.
- Przełącz **Siatkę kart** na **Widok tabeli**, zmień sortowanie i wyczyść filtry.

Do dalszego przejścia wybierz dwa różne przypadki. W lokalnej bazie są:

| Szukana fraza | Rekord | Co porównać |
| --- | --- | --- |
| `KORD` | Kompaktowy Obiekt Retencyjno-Doczyszczający (KORD) | Technologia, prototyp, TRL 7; plan pilotażu. |
| `Mapa zawodowa` | Mapa zawodowa | Edukacja, rozwiązanie wdrożone, TRL nieokreślony; plan transferu/wdrożenia. |

Jeśli tych rekordów nie ma w bazie, wybierz dowolny technologiczny prototyp oraz wdrożoną innowację edukacyjną.

## 2. Wyszukaj rozwiązanie problemu — nadal bez konta

Włącz **Opisz problem dokładniej i dopasuj rozwiązania**. Przykładowy opis:

> Szkoła chce pomóc uczniom poznać różne zawody i przygotować się do wyboru dalszej nauki.

Wybierz branżę i beneficjentów. W **Kontekście wdrożenia** ustaw typ organizacji, lokalizację, skalę problemu i minimalną dojrzałość. Kliknij **Dopasuj rozwiązania**.

Sprawdź wynik i **Dlaczego to dopasowanie?**: problem 40%, branża 20%, beneficjenci 20%, typ organizacji 20%. Zmień opis lub kontekst i ponów dopasowanie, jeśli pojawi się komunikat o przeliczeniu. Lokalizacja wdrożenia jest osobna od pochodzenia innowacji. Wynik oznacza dopasowanie do zapytania, nie szansę powodzenia wdrożenia.

## 3. Sprawdź kartę, oceny i źródła

Otwórz szczegóły wybranej innowacji z wyników (`/innovations/[slug]`). To drugi poziom informacji po skróconej karcie katalogu.

- **Opis rozwiązania:** sprawdź problem, rozwiązanie, obszar, charakter, odbiorców, etap wdrożenia, TRL, zasoby i archetypy partnerów. Przy TRL i etapie odczytaj pochodzenie wartości: źródło, PCI, reguły, AI albo brak danych.
- **Efekty i wskaźniki:** sprawdź innowacyjność, potencjał zastosowania i wiarygodność źródeł oraz ich uzasadnienia w **Dowodach i pochodzeniu informacji**. Brak oceny pozostaje brakiem danych. To inne oceny niż dopasowanie 40/20/20/20.
- W tej samej zakładce sprawdź **Ocenę zgodności z Oslo Manual 2018**: nowość lub istotne ulepszenie oraz udostępnienie użytkownikom lub wdrożenie. Przeczytaj uzasadnienie i ograniczenia.
- **Źródła i materiały:** otwórz odnośnik wydawcy i porównaj go z opisem. Sprawdź daty pobrania i weryfikacji.
- **Podobne rozwiązania:** zobacz proponowane alternatywy. Nie każda innowacja musi mieć podobny rekord.

Wyeksportuj kartę do CSV lub użyj eksportu PDF. PDF otwiera okno drukowania przeglądarki, w którym wybierasz zapis do pliku.

## 4. Porównaj dwa rozwiązania

Dodaj dwie innowacje do porównania i otwórz **Porównanie** (`/compare`). Możesz dodać trzecią.

Sprawdź obszar, etap wdrożenia, TRL, oceny, źródła, ryzyka i zasoby. Jeśli wcześniej wykonałeś dopasowanie, sprawdź także jego składowe. Włącz **Tylko różnice** i wyeksportuj zestawienie.

**Do tego miejsca konto nie jest potrzebne.** Zapis porównania na koncie wymaga logowania; przycisk **Zapisz porównanie** pojawi się po zalogowaniu.

## 5. Sprawdź brak wyników i „Powiadom mnie”

W katalogu wpisz frazę, która nie występuje w bazie. Przy braku wyników możesz wyczyścić filtry albo użyć **Powiadom mnie** i podać e-mail. Nie trzeba zakładać konta; po zalogowaniu używany jest e-mail konta.

Zapis zgłoszenia potwierdza zebranie zapytania i kontaktu. Sam ten krok nie potwierdza wysłania wiadomości o nowych wynikach.

## 6. Zaloguj się dopiero przy zapisie lub planowaniu

Wróć do wybranej innowacji i kliknij **Zaplanuj wdrożenie**. Otworzy się rejestracja.

- Załóż konto albo wybierz **Zaloguj się**, jeśli już je masz. Do demonstracji istniejącego konta organizacji służy przycisk **Demo** na ekranie logowania.
- Po rejestracji lub logowaniu wrócisz do tej innowacji i panelu planowania.
- Uzupełnij ankietę: typ i nazwę organizacji, koordynatora, lokalizację, liczbę odbiorców, obecne podejście, zasoby, kompetencje, termin i ograniczenia. Część danych może pochodzić z wyszukiwania lub profilu.
- Sprawdź dostępny **Kontakt wdrożeniowy**. To trzeci poziom informacji, dostępny po zalogowaniu. Kompletność kontaktu zależy od źródeł.
- Kliknij **Wygeneruj plan w 5 fazach**.

Zapis innowacji do ulubionych również wymaga konta. Jeśli klikniesz go jako gość, zaloguj się i ponów zapis po powrocie. Zalogowany użytkownik może też wrócić do porównywarki i wybrać **Zapisz porównanie**.

## 7. Sprawdź różne plany dla dwóch przypadków

Plan otworzy się pod `/workspace/plans/[id]`.

Sprawdź wariant i uzasadnienie, pięć faz, konkretne działania, kontakt lub proponowany typ partnera, wymagane zasoby, ryzyka, braki informacji i mierniki sukcesu. Wskaż przynajmniej dwa działania oraz miernik, po którym organizacja oceni wynik. Cel w planie jest propozycją do sprawdzenia podczas realizacji.

Następnie wróć do katalogu i wygeneruj plan dla drugiego przypadku z kroku 1. Dla wskazanych rekordów KORD prowadzi do pilotażu, a Mapa zawodowa do transferu/wdrożenia. Porównaj działania i mierniki obu planów. Wariant walidacji sprawdzisz na rekordzie na etapie koncepcji lub wczesnego prototypu.

## 8. Zapisz postęp i raport

W planie zmień stan fazy, dodaj notatkę i zapisz trudność, jeśli występuje. Przejdź do **Moje wdrożenia** (`/workspace`) i ponownie otwórz plan. Sprawdź, czy zmiany zostały zapisane. Tutaj wrócisz też do zapisanych innowacji i porównań.

Na końcu planu otwórz **Jak przebiega Twoje wdrożenie?**:

1. Wybierz przygotowania do pilotażu, rozpoczęty pilotaż albo zakończone wdrożenie.
2. Rozwiń formularz etapu. Wpisz znane wyniki, mierniki przed/po, liczbę odbiorców i wybierz widoczność podsumowania. Zapisz raport. Jeśli pomiaru nie ma, zostaw brak danych.
3. Przy zakończonym wdrożeniu możesz dodać jeden załącznik z wynikami do 10 MB. Pobiera go właściciel planu albo PCI; dodaje i usuwa właściciel. Preferencja publicznego podsumowania nie udostępnia publicznie pliku.
4. Wyeksportuj plan przyciskiem **Eksportuj CSV** lub **Eksportuj PDF**.

Podczas demonstracji wpisuj dane testowe oznaczone jako testowe. Zapisy trafiają do bazy. Deklaracja zakończenia wdrożenia i ukończenie checklisty są osobne od potwierdzenia efektu przez PCI.

## 9. Przeloguj się do panelu PCI

Zapisz nazwę organizacji i innowacji z poprzedniego kroku, żeby odnaleźć ten sam plan.

1. W bocznym menu kliknij **Wyloguj się**. Na telefonie najpierw otwórz menu.
2. Wejdź na `/login` i wybierz **Demo PCI**. Po zalogowaniu otworzy się `/admin`.
3. Przy własnym koncie operatora możesz użyć `/login?next=%2Fadmin`. Zwykłe logowanie bez celu prowadzi do `/workspace`; stamtąd wybierz **Panel PCI**.

Konto organizacji nie ma dostępu do `/admin` — zostanie przekierowane do `/workspace`. Typ organizacji w ankiecie nie nadaje uprawnień operatora. Aktywna sesja operatora pozwala wejść do `/admin` bez ponownego logowania.

Do zmiany konta trzeba się wylogować: otwarcie `/login` z aktywną sesją przekierowuje do aplikacji. Karty tej samej sesji przeglądarki korzystają z tego samego konta. Jeśli chcesz pokazać obie role równolegle, użyj osobnych profili przeglądarki.

## 10. Odszukaj raport i pokaż weryfikację PCI

W panelu PCI zacznij od **Impact Radaru**.

- Znajdź tę samą organizację i innowację. Sprawdź etap, raport, mierniki oraz załącznik, jeśli został dodany.
- Pokaż lejek: plany, rozpoczęte pilotaże, wdrożenia i zweryfikowane efekty. Zgłoszone przez organizację zakończenie może być liczone jako wdrożenie; zweryfikowany efekt wymaga osobnej decyzji PCI.
- Sprawdź akcje **Potwierdź wdrożenie**, **Zweryfikuj efekt** i **Do uzupełnienia**. Przy prośbie o uzupełnienie wpisz notatkę. Potwierdzenie zapisz tylko wtedy, gdy masz podstawę w danych; raport testowy nadal jest testowy.
- Przejdź do **Wdrożenia**. Sprawdź fazy, notatki, trudności i porównywane innowacje dla tego planu.

Aby wrócić do edycji raportu organizacji, wyloguj operatora i zaloguj właściciela planu.

## 11. Sprawdź pozyskiwanie i kontrolę danych

Nadal jako operator PCI:

1. Otwórz **Źródła publiczne**. Sprawdź sześć kanałów: CORDIS, RUJ UJ, Nauka w Polsce, OpenAlex PL, CTT UŁ i IBE. Reprezentują naukę, B+R, oferty technologiczne dla biznesu oraz innowacje szkolne.
2. Przy kanale sprawdź metodę, limit, liczbę lokalnych rekordów, datę synchronizacji i błędy. Domyślny limit to 10 kandydatów na partię, a nie 10 gwarantowanych nowych innowacji.
3. Kliknij **Odśwież** przy jednym kanale. Po zakończeniu sprawdź wynik i datę. Licznik nie musi wzrosnąć: źródło może zwrócić te same lub niepasujące wpisy. Przy błędzie odczytaj komunikat.
4. Jeśli chcesz sprawdzić import pojedynczej innowacji, w tej sekcji podaj URL konkretnej karty HTML lub dokumentu PDF i uruchom import. Następnie odszukaj rekord w katalogu. Publiczny użytkownik nie zgłasza tu własnego pomysłu.
5. W **Jakość i weryfikacja** otwórz rekord i sprawdź braki oraz konflikty; źródła obejrzysz na jego karcie publicznej. Edytor pozwala poprawić m.in. TRL, etap wdrożenia i ocenę Oslo. Po zmianie sprawdź zaktualizowane wartości na publicznej karcie.
6. Otwórz **Duplikaty**. Jeśli są kandydaci, porównaj je przed scaleniem. Jeśli lista jest pusta, ten stan nie pozwala pokazać scalenia.

Odświeżenie z przycisku uruchamia import ręczny; cykliczne pobieranie materiałów działa automatycznie w tle.

## 12. Sprawdź dostępność

Otwórz **Dostępność** w nawigacji publicznej lub bocznym menu. Zmień motyw: jasny, ciemny, kontrast czarno-biały, czarno-żółty i skala szarości. Sprawdź powiększenie tekstu, podkreślanie linków i odczyt na głos.

Przejdź klawiszem Tab przez wyszukiwanie, filtry, kartę i formularz. Sprawdź widoczność fokusu, otwieranie kontrolek klawiaturą oraz układ na małym ekranie.
