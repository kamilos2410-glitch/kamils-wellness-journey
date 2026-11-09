# Uproszczenie synchronizacji kroków

Na zrzutach widać, że w bloku „Tekst” po `"steps":` wstawiona jest zmienna **Próbki aplikacji Zdrowie** (lista próbek), która przy wysyłce zamienia się w pustą wartość — stąd błąd `invalid_payload` / „Unexpected token '}'”. Brakuje kroku, który zamienia próbki na jedną liczbę.

## Co zrobię

### 1. Krótsza, obrazkowa instrukcja w zakładce Synchronizacja
Przepiszę ekran „Synchronizacja” na listę kroków 1-2-3 z dokładnymi nazwami czynności po polsku, tak jak widnieją w Skrótach, oraz z informacją, gdzie kliknąć **+** (pod danym blokiem, przed blokiem „Tekst”):

1. Znajdź próbki aplikacji Zdrowie — Typ: Kroki, Data początkowa: jest dzisiaj (bez filtra „Wartość to Suma”)
2. **Oblicz statystyki** — Suma, wejście: Próbki aplikacji Zdrowie
3. Bieżąca data → Formatuj datę (`yyyy-MM-dd`)
4. Tekst z JSON-em, gdzie po `"steps":` wstawiamy wynik z kroku 2 (nie próbki)
5. Pobierz zawartość URL — POST + dwa nagłówki

Do każdego kroku dopiszę jednozdaniowe „co dokładnie kliknąć”.

### 2. Endpoint przyjmie dane w bardziej wyrozumiały sposób
Żeby drobne pomyłki w Skrócie nie blokowały synchronizacji, `/api/public/ingest/health` będzie dodatkowo akceptował:

- `steps` jako tekst („9 432”, „9432,0”, „9432 kroki”) — wyciągnięcie liczby
- `steps` jako lista próbek — zsumowanie wartości liczbowych
- pusty/brakujący `steps` — czytelny komunikat po polsku: „Po »steps:« wstaw wynik czynności »Oblicz statystyki«”
- treść wysłaną jako formularz (`date` + `steps`) zamiast JSON

Dzięki temu w wielu przypadkach obecny Skrót zadziała bez dodawania „Zaokrąglij liczbę”.

### 3. Ręczne wpisanie kroków jako zapasowe wyjście
W zakładce Pomiary kroki i tak można wpisać ręcznie — dopiszę o tym jedno zdanie na ekranie Synchronizacji, żeby brak działającego Skrótu nie blokował aplikacji.

## Szczegóły techniczne
- `src/routes/api/public/ingest/health.ts` — normalizacja `steps` (number | string | array próbek) przed walidacją Zod, obsługa `application/x-www-form-urlencoded`, komunikaty błędów po polsku.
- `src/routes/_authenticated/sync.tsx` — nowa treść instrukcji, bez zmian w logice tokenu.
