# Automatyczne kroki: harmonogram + domykanie wczorajszego dnia

## Jak jest teraz
Skrót wysyła kroki tylko wtedy, gdy sam naciśniesz ▶, i wysyła wyłącznie dzisiejszy dzień.
Serwer przy powtórnym wysłaniu tej samej daty nadpisuje wynik (nie duplikuje), a przyjmuje nawet 31 dni naraz — więc podstawa do automatyzacji już działa.

Czyli: dziś widzisz wynik, ale jutro rano dzisiejszy dzień zostanie „zamrożony” na wartości z ostatniego ręcznego wysłania, dopóki nie dodamy automatyzacji.

## Co zrobię
1. **Instrukcja automatyzacji w aplikacji (⚙️ → Synchronizacja)** — krok po kroku, jak w Skrótach ustawić Automatyzację osobistą „Pora dnia”:
   - 12:00, 20:00 i 00:30, opcja „Uruchom natychmiast” (bez pytania o potwierdzenie).
   - Wyjaśnienie, że każda automatyzacja odpala ten sam Skrót.
2. **Rozszerzenie Skrótu o wczorajszy dzień** — instrukcja dodania drugiej pary bloków (próbki + suma dla „wczoraj”) i wysłania obu dni w jednym tekście:
   `{"days":[{"date":"[Wczoraj]","steps":[Suma wczoraj]},{"date":"[Dziś]","steps":[Suma dziś]}]}`
   Dzięki temu uruchomienie o 00:30 domyka pełną liczbę kroków z poprzedniej doby.
3. **Data ostatniej synchronizacji** — na ekranie Synchronizacja pokażę, kiedy ostatnio przyszły dane i za jakie dni, żebyś od razu widział, czy automat działa.

## Szczegóły techniczne
- Zmiany tylko w `src/routes/_authenticated/sync.tsx` (treść instrukcji + panel statusu z tabeli `sync_state`).
- Endpoint `api/public/ingest/health` nie wymaga zmian: waliduje do 31 dni i robi upsert po (użytkownik, metryka, data).
- Brak zmian w bazie danych.

## Ograniczenie, o którym warto wiedzieć
iOS uruchamia automatyzacje czasowe tylko przy odblokowanym telefonie lub chwilę po; sporadyczne opóźnienie kilku minut jest normalne. Kolejne uruchomienie i tak poprawi dane wstecz.
