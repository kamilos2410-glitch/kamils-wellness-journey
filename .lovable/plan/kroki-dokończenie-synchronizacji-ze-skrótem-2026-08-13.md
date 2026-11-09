# Kroki: dokończenie synchronizacji ze Skrótem

## Co widać na zrzucie
Blok „Tekst” jest już poprawny: data w cudzysłowie, po `"steps":` niebieska zmienna **Suma** bez cudzysłowów. Mimo to serwer dostaje puste miejsce po `"steps":`, czyli zmienna **Suma** przy uruchomieniu nie ma żadnej wartości. To nie jest wina formatu tekstu — czynność „Oblicz statystyki” zwraca pustkę (najczęściej dlatego, że blok „Znajdź próbki aplikacji Zdrowie” ma jeszcze filtr „Wartość to Suma” albo nie znajduje próbek za dziś).

Nie jest to jeszcze potwierdzone po stronie serwera — dlatego pierwszy krok planu to podejrzenie, co dokładnie przychodzi z telefonu.

## Plan

### 1. Podejrzenie surowej treści (diagnostyka)
Endpoint `/api/public/ingest/health` przy błędzie zwróci w odpowiedzi krótki podgląd tego, co faktycznie przyszło (obcięty do ~200 znaków, bez tokenu). Dzięki temu z jednego zrzutu ekranu będzie widać, czy `steps` jest puste, czy zawiera listę próbek.

### 2. Tolerancja na pustą sumę — wariant „wyślij próbki”
Alternatywna, prostsza ścieżka bez „Oblicz statystyki”: Skrót wysyła listę próbek, a sumowanie robi aplikacja. Endpoint już umie sumować listy, więc dopiszę obsługę tekstowej postaci próbek (np. `„1 234 kroki, 500 kroków”`), którą Skrót wkleja jako tekst.

### 3. Uproszczona instrukcja w ⚙️ → Synchronizacja
Instrukcja zostanie skrócona do wersji bez „Oblicz statystyki”:
1. Znajdź próbki aplikacji Zdrowie — Typ: Kroki, Data początkowa: jest dzisiaj, **Wartość to Suma pozostaje włączone**
2. Bieżąca data → Formatuj datę `yyyy-MM-dd`
3. Tekst: `{"days":[{"date":"[Sformatowana data]","steps":[Próbki aplikacji Zdrowie]}]}`
4. Pobierz zawartość URL — POST + dwa nagłówki

Czyli mniej bloków niż teraz i wykorzystanie tego, co użytkownik już ma skonfigurowane.

### 4. Weryfikacja
Sprawdzę oba warianty (suma liczbowa i lista próbek) zapytaniami testowymi i potwierdzę, że ponowne wysłanie tego samego dnia aktualizuje wpis zamiast tworzyć duplikat.

## Szczegóły techniczne
- `src/routes/api/public/ingest/health.ts` — podgląd surowej treści w odpowiedzi błędu, parsowanie tekstowej listy próbek (sumowanie liczb z tekstu), zachowanie obecnych komunikatów po polsku.
- `src/routes/_authenticated/sync.tsx` — nowa, 4-blokowa instrukcja.
