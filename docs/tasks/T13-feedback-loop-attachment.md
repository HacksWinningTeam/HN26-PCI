# `T13` — Ankieta statusu wdrożenia, załącznik rezultatów i para transferowa w panelu PCI

- **Status:** `IN_PROGRESS`
- **Layer:** `Full-Stack`
- **UI Design Required:** `Yes` (zatwierdzone jawnym żądaniem użytkownika i dostarczonym zrzutem ekranu)
- **Depends On:** `T12`
- **Traces To:** `REQ-11`, `DEC-034`

## Goal & User Outcome

Na końcu sekcji postępu w `/workspace/plans/[id]` organizacja widzi ankietę **„Jak przebiega Twoje wdrożenie?”** z trzema opcjami (`Przygotowujemy się do pilotażu`, `Rozpoczęliśmy pilotaż`, `Zakończyliśmy wdrożenie`) oraz rozwijanym formularzem etapu. Po wyborze **„Zakończyliśmy wdrożenie”** użytkownik może wgrać prawdziwy załącznik rezultatów do bazy PostgreSQL, a w `/admin` (zarówno w **Impact Radarze**, jak i w zakładce **Wdrożenia**) transfer wyświetla się od razu jako **„Sukces · Zakończone wdrożenie”** pomiędzy organizacją poszukującą a organizacją źródłową innowacji wraz z linkiem do pobrania załącznika.

## Acceptance Criteria

- [x] Ankieta **„Jak przebiega Twoje wdrożenie?”** znajduje się na końcu kolumny postępu w `/workspace/plans/[id]` z opcjami: planowany (`none`), rozpoczęty (`in_pilot`), zakończony (`deployed`).
- [x] Przycisk `Rozwiń formularz tego etapu` odsłania pola daty startu, liczby objętych odbiorców (z opcją `brak danych`), miernika przed i po, widoczności oraz opisu rezultatów.
- [x] Po wybraniu `Zakończyliśmy wdrożenie` formularz rozwija się automatycznie i udostępnia upload prawdziwego załącznika (`POST/GET/DELETE /api/implementation-plans/{id}/attachment/`).
- [x] Panel administratora (`/admin` -> `Impact Radar` i `Wdrożenia`) pokazuje status `Sukces · Zakończone wdrożenie`, parę `{organizacja poszukująca} ↔ {organizacja źródłowa}` oraz link do pobrania wgranego załącznika — bez żadnych danych mockowych.

## Verification Checklist

### Automated Checks
- [x] `make test` passes (75 passed, w tym test uploadu/pobierania załącznika, mierników przed/po oraz pary transferowej)
- [x] `make lint` passes (`ruff check .`, `npm run typecheck`, `npm run lint`)
- [x] `make schema-check` passes (`python manage.py spectacular --validate --fail-on-warn`)
- [x] `make migrations-check` passes (`implementation.0004` applied)
- [x] `make build-prod` passes (`django-nextjs-backend:prod` + `django-nextjs-frontend:prod`)

### Manual Verification
1. W `/workspace/plans/<id>` zjedź na sam dół listy postępu do ankiety „Jak przebiega Twoje wdrożenie?”, wybierz `Zakończyliśmy wdrożenie`, wgraj plik (np. PDF/CSV), wpisz miernik przed/po i kliknij `Zapisz status wdrożenia`.
2. Otwórz `/admin` (`Impact Radar` oraz `Wdrożenia`) — potwierdź status `Sukces · Zakończone wdrożenie`, widoczną parę organizacji (`<Adopter> ↔ <Twórca/Źródło>`) oraz działanie pobrania załącznika.

### Sign-Off
- **Verified By:** `<User>` on `<YYYY-MM-DD HH:MM>`
- **Notes / Follow-Ups:** `—`
