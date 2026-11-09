# Tylko kroki z Apple Zdrowie — reszta synchronizacji do usunięcia

Rezygnujemy z automatyzacji Fitatu i Strong (Fitatu wymaga premium do połączenia ze Zdrowiem, a Strong przekazuje za mało danych — sama nazwa i czas treningu nie wystarczą). Zostaje jedno: **kroki** wpadają automatycznie z aplikacji Zdrowie. Kalorie i makro nadal wklejasz zrzutem ekranu, treningi nadal wklejasz raportem ze Strong — bez zmian.

## Jak to będzie działać

```text
iPhone (Zdrowie: kroki) ─> Skrót iOS ─> aplikacja ─> Pomiary → Codzienne → Kroki
                              ^
                    automatyzacja 8:00 i 20:00
```

Skrót wysyła kroki z ostatnich kilku dni. Ten sam dzień wysłany ponownie nadpisuje wartość, nie tworzy drugiego wpisu (Zdrowie dolicza kroki w ciągu dnia, więc wieczorny wysył poprawia poranny).

## Co zostaje uproszczone

- **Endpoint** przyjmuje już tylko `{"days":[{"date":"2026-08-12","steps":9432}]}` — znika obsługa kalorii, makro i treningów. Nadal chroniony tajnym tokenem.
- **Zakładka Synchronizacja** zostaje, ale skrócona: adres, token, status ostatniej synchronizacji i instrukcja Skrótu **tylko dla kroków** (jeden blok „Znajdź próbki zdrowia → Kroki → Suma” zamiast pięciu).
- **Panel** — usuwamy linijkę „Ostatnia synchronizacja z telefonu / Aktualizuj raport” ze strony głównej; status zostaje w zakładce Synchronizacja, żeby panel był czysty.

## Co usuwamy całkowicie

- Zapis kalorii/makro do `food_logs` z Apple Health.
- Zapis treningów do `workout_sessions` z Apple Health oraz automatyczne oznaczanie dnia treningowego na tej podstawie (dzień treningowy nadal wykrywa się z ręcznie wklejonego raportu Strong — bez zmian).
- Instrukcję w zakładce Synchronizacja dotyczącą włączania Fitatu/Strong w Zdrowiu.

## Czego nie ruszamy

- Ręczny zrzut ekranu Fitatu z odczytem AI (`/jedzenie`) — bez zmian.
- Ręczne wklejanie raportu Strong (`/treningi`) — bez zmian.
- Automatyczne podstawianie celów makro na podstawie wpisanego treningu — bez zmian.
- Tabela `sync_state` i unikalne indeksy na `food_logs` / `workout_sessions` — zostają (indeks na `food_logs` jest potrzebny ręcznemu formularzowi Fitatu).

## Szczegóły techniczne

- `src/routes/api/public/ingest/health.ts`: schemat Zod zawężony do `{ days: [{ date, steps }] }` (steps: liczba całkowita 0–200000). Zapis do `measurements` jako `metric='kroki'`, `unit='kroki'`, `measured_at=date`, przez `supabaseAdmin` na `user_id` właściciela. Autoryzacja tokenem `HEALTH_INGEST_TOKEN` bez zmian.
- Migracja: unikalny indeks `measurements (user_id, metric, measured_at)` — dziś go nie ma, a bez niego upsert kroków zrobiłby duplikaty. Sprawdzone: w obecnych danych nie ma zduplikowanych trójek, więc indeks założy się czysto i nie skasuje żadnego wiersza. Upsert użyje `onConflict: "user_id,metric,measured_at"`.
- `src/lib/sync.functions.ts` (`getIngestConfig`) zostaje bez zmian.
- `src/routes/_authenticated/sync.tsx`: przepisany opis i wzór JSON pod same kroki.
- `src/routes/_authenticated/panel.tsx`: usunięcie zapytania o `sync_state` z `Promise.all` i akapitu ze statusem synchronizacji.

## Po Twojej stronie (dam instrukcję w aplikacji)

Skrót będzie miał raptem trzy kroki: „Znajdź próbki zdrowia” (Kroki, Dzisiaj, Suma) → „Tekst” z JSON-em → „Pobierz zawartość URL” (POST + token). Plus automatyzacja o 8:00 i 20:00.
