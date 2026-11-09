# Zdrowie & Trening — osobista aplikacja

Prywatna aplikacja (logowanie e-mail) do prowadzenia diety, treningów, pomiarów i zdjęć postępów, z importem danych z Twojego pliku Excel.

## Uwaga o pliku z Google Drive

Link, który podałeś, wskazuje plik **Excel (.xlsx)** na Dysku, a nie Arkusz Google — API Google Sheets go nie odczyta ("The document must not be an Office file"), więc nie znam jeszcze jego kolumn. Rozwiązanie w planie: aplikacja dostanie **import pliku .xlsx / CSV** (wgrywasz plik, widzisz podgląd, mapujesz kolumny na pola aplikacji). Jeśli w międzyczasie przekonwertujesz plik na Arkusz Google (Otwórz w Arkuszach → Plik → Zapisz jako Arkusz Google) i podeślesz link, dołożę też import jednym kliknięciem z Google Sheets przez istniejące połączenie.

## Ekrany

1. **Dashboard** — dzisiejszy cel makro (treningowy/nietreningowy), ostatnia waga, aktywny plan treningowy, ostatnie zdjęcie, szybkie skróty.
2. **Dieta / Plany żywieniowe** — plan z datą obowiązywania, osobne cele dla dnia treningowego i nietreningowego (kcal, B/T/W), notatki tekstowe (to, co dziś trzymasz w Notatkach iPhone). Historia planów w osi czasu, tak jak w Twoim screenie.
3. **Dziennik Fitatu** — dla każdego dnia: wklejasz raport tekstowy z Fitatu, aplikacja parsuje kalorie i makro (B/T/W) i zapisuje jako wpis dnia; można też poprawić ręcznie. Porównanie „zjedzone vs cel" i wykres tygodniowy. Automatyczne pobieranie z Fitatu nie jest możliwe (brak publicznego API) — dlatego wklejanie raportu.
4. **Treningi** — plan treningowy jako tekst (Markdown) z datą rozpoczęcia i statusem (aktywny/archiwalny) + dziennik sesji (data, notatka, opcjonalnie ciężary/serie w tekście).
5. **Pomiary i postępy** — waga, obwody, tętno spoczynkowe, sen, dowolne własne metryki; wykresy w czasie; wpisy można dodawać wstecz z dowolną datą.
6. **Zdjęcia** — galeria po dacie, kilka zdjęć na sesję (przód/bok/tył), wgrywanie zdjęć historycznych z ręcznie ustawianą datą, porównanie dwóch dat obok siebie.
7. **Notatki / Zdrowie** — swobodne notatki z tagami i datą (suplementy, badania, samopoczucie, wizyty).
8. **Import** — wgranie .xlsx/CSV, podgląd zakładek i wierszy, mapowanie kolumn → pomiary / dzienniki diety / notatki; import jest powtarzalny i nie duplikuje wierszy.

## Automatyzacja („uzupełnia się samo")

- Cele makro na dziś podstawiają się automatycznie z aktywnego planu, zależnie od tego, czy dzień jest oznaczony jako treningowy.
- Wklejony raport Fitatu automatycznie wypełnia kcal i makro — bez ręcznego przepisywania.
- Wykresy, serie i podsumowania tygodniowe liczą się same z zapisanych wpisów.
- Import z pliku uzupełnia historię jednym przejściem.

## Zakres techniczny

- Lovable Cloud: baza + logowanie e-mail/hasło + storage na zdjęcia (bucket prywatny, dostęp tylko właściciela).
- Tabele: `profiles`, `diet_plans` (data od, kcal/B/T/W dla dnia treningowego i nietreningowego, notatki), `food_logs` (dzień, kcal, B/T/W, surowy tekst raportu), `workout_plans` (tekst, data startu, aktywny), `workout_sessions`, `measurements` (typ, wartość, jednostka, data), `progress_photos` (ścieżka w storage, data, ujęcie), `notes` (tytuł, treść, tagi, data), `imports` (źródło, hash wiersza — deduplikacja). Wszystkie z RLS na `auth.uid()` i GRANT-ami.
- Parser raportu Fitatu i parser xlsx/CSV po stronie serwera (server functions), walidacja Zod.
- Interfejs po polsku, ciemny motyw, mobile-first (używasz na iPhone).
- Google Sheets: import przez istniejące połączenie dołożę, gdy plik będzie Arkuszem Google.

## Etapy

1. Cloud + logowanie + schemat bazy + storage zdjęć.
2. Dieta, cele makro, dziennik Fitatu z parserem.
3. Treningi, pomiary, wykresy.
4. Zdjęcia postępów (w tym historyczne) i notatki.
5. Import xlsx/CSV + dashboard spinający całość.
