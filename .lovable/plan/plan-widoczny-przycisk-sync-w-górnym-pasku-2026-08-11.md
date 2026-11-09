# Plan: widoczny przycisk Sync w górnym pasku

## Problem
Zakładka **Sync** (z tokenem do Skrótu iOS) istnieje w aplikacji, ale znajduje się w dolnej nawigacji, która na małym ekranie wymaga przewijania w prawo. Na przesłanym zrzucie widać tylko 6 pierwszych zakładek, więc Sync i Import są niewidoczne.

## Cel
Użytkownik powinien móc łatwo kliknąć i przejść do ekranu Sync, żeby zobaczyć token i instrukcję.

## Co zbudujemy
1. W górnym pasku `AppShell` obok przycisku „Wyloguj” dodać ikonę ustawień/synchronizacji.
2. Kliknięcie ikony otworzy małe menu (dropdown) z linkami:
   - **Synchronizacja** → `/sync`
   - **Import danych** → `/import`
3. Zakładki Sync i Import zostaną usunięte z dolnej nawigacji, żeby nie dublować ścieżek i nie zaciemniać głównego menu.
4. Dolny pasek zostanie zwężony do 7 pozycji: Panel, Dieta, Fitatu, Treningi, Pomiary, Zdjęcia, Notatki.

## Pliki do zmiany
- `src/components/AppShell.tsx` — dodanie ikony ustawień, dropdownu z linkami do Sync/Import, usunięcie Sync i Import z dolnej nawigacji.

## Oczekiwany efekt
W prawym górnym rogu każdego ekranu pojawi się ikona (np. zębatka lub strzałki synchronizacji). Po kliknięciu użytkownik od razu widzi opcję „Synchronizacja” i może przejść do ekranu z tokenem.
