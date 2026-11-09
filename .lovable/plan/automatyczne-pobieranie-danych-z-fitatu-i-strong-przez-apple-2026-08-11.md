# Automatyczne pobieranie danych z Fitatu i Strong (przez Apple Health)

Fitatu i Strong nie mają publicznego API, ale obie aplikacje zapisują dane do Apple Health. Zamiast wysyłać zrzuty ekranu, telefon sam prześle dane do aplikacji: cyklicznie (rano i wieczorem) oraz na żądanie przyciskiem.

## Jak to będzie działać

```text
Fitatu ─┐
        ├─> Apple Health ─> Skrót iOS ─> endpoint aplikacji ─> baza (Jedzenie / Treningi)
Strong ─┘                      ^
                               |
             automatyzacja 8:00 i 20:00  +  ikona "Aktualizuj raport"
```

1. Skrót czyta ze Zdrowia dane z ostatnich 2 dni: kalorie, białko, tłuszcz, węglowodany oraz treningi (nazwa/typ, data, czas trwania).
2. Wysyła je jednym zapytaniem do prywatnego adresu aplikacji, zabezpieczonego tajnym tokenem.
3. Aplikacja zapisuje/aktualizuje wpis dnia w Fitatu i sesję treningową — bez duplikatów (ponowne wysłanie tego samego dnia tylko nadpisuje dane).
4. Dzień treningowy wykrywa się automatycznie, więc cele makro podstawią się same, tak jak dziś.

## Co dostajesz w aplikacji

- Zakładka Jedzenie: nowy wpis dnia tworzony automatycznie; ręczny zrzut ekranu zostaje jako opcja (np. gdy chcesz rozbicie na posiłki — Health tego nie przekazuje).
- Zakładka Treningi: sesja z datą, nazwą i czasem trwania. Pełne serie i ciężary nadal wklejasz raportem ze Strong; jeśli sesja z Health już istnieje, wklejony raport ją uzupełni, a nie zduplikuje.
- Na panelu: informacja „ostatnia synchronizacja: godzina” oraz przycisk „Aktualizuj raport”, który przypomni, żeby odpalić Skrót (iPhone sam może to zrobić po otwarciu aplikacji).

## Plusy i minusy tej drogi

- Plusy: legalne i stabilne, brak przechowywania Twoich haseł do Fitatu/Strong, działa w tle, historia z ostatnich dni sama się domyka.
- Minusy: jednorazowa konfiguracja Skrótu na iPhonie; z Health przychodzą sumy dzienne (bez podziału na posiłki) i podstawowe dane treningu; jeśli Fitatu/Strong nie mają włączonego zapisu do Zdrowia, trzeba to raz włączyć w ich ustawieniach.

## Szczegóły techniczne

- Nowy endpoint `POST /api/public/ingest/health` (TanStack server route) przyjmujący JSON: `{ days: [{ date, kcal, protein, fat, carbs, workouts: [{ name, start, duration_min }] }] }`.
- Autoryzacja nagłówkiem `x-ingest-token` porównywanym w sposób odporny na timing z sekretem `HEALTH_INGEST_TOKEN` (wygenerowanym po stronie serwera) + walidacja Zod; brak/zły token = 401.
- Zapis przez `supabaseAdmin` importowany wewnątrz handlera, na stałe `user_id` właściciela aplikacji (jedno-użytkownikowa aplikacja).
- Idempotencja: `food_logs` po `(user_id, log_date)` — upsert; `workout_sessions` po `(user_id, session_date, title)` — insert tylko gdy brak wpisu. Wymaga migracji dodającej unikalne indeksy.
- `is_training_day` ustawiane na podstawie obecności treningu w danym dniu.
- Nowa tabela `sync_state` (lub notatka techniczna) z czasem ostatniego przyjętego pinga, pokazywanym na panelu.
- Endpoint pod `/api/public/*`, bo wywołuje go Skrót spoza sesji; cała ochrona to token + walidacja wejścia, brak zwracania danych osobowych.

## Konfiguracja po Twojej stronie (dam gotową instrukcję krok po kroku)

1. W Fitatu i Strong włączyć zapis do aplikacji Zdrowie.
2. Zainstalować Skrót (przekażę gotowy przepis: bloki „Znajdź próbki zdrowia”, „Znajdź treningi”, „Pobierz zawartość URL”).
3. Wkleić do Skrótu adres endpointu i token (pokażę je raz po wdrożeniu).
4. Dodać automatyzację o 8:00 i 20:00 oraz ikonę Skrótu na ekranie głównym do ręcznego odświeżenia.
