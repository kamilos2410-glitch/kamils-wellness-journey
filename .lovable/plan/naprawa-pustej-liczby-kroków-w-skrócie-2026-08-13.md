# Naprawa pustej liczby kroków w Skrócie

## Co potwierdza obecny błąd
Pole `received` pokazuje, że telefon wysłał poprawną datę `2026-08-13`, ale po `"steps":` wysłał pusty tekst. Problem występuje przed wysłaniem danych: czynność „Znajdź próbki aplikacji Zdrowie” nie zwraca żadnych kroków.

## Plan

### 1. Poprawić źródło kroków w Skrócie
Instrukcja w aplikacji pokaże jednoznacznie, że w czynności „Znajdź próbki aplikacji Zdrowie” należy:
- pozostawić typ „Kroki”;
- pozostawić datę początkową „jest dzisiaj”;
- usunąć wiersz/filtr „Wartość to Suma”, ponieważ ten filtr powoduje pusty wynik.

### 2. Przywrócić prawidłowe sumowanie
Bezpośrednio pod wyszukiwaniem próbek należy dodać czynność „Oblicz statystyki”, wybrać „Suma” i jako wejście wskazać „Próbki aplikacji Zdrowie”.

W bloku „Tekst” po `"steps":` zostanie użyta niebieska zmienna **Suma**, bez cudzysłowów:

```text
{"days":[{"date":"[Sformatowana data]","steps":[Suma]}]}
```

### 3. Ujednolicić komunikat błędu
Endpoint przestanie sugerować sprzeczną konfigurację z próbkami w cudzysłowie. Przy pustej wartości wskaże dokładnie: usuń filtr „Wartość to Suma”, dodaj „Oblicz statystyki → Suma” i wstaw zmienną „Suma”.

### 4. Zweryfikować oba przypadki
Sprawdzę:
- poprawne zapisanie liczbowej sumy kroków;
- czytelny komunikat, gdy wyszukiwanie próbek nadal zwraca pusty wynik;
- aktualizację istniejącego wpisu z tego samego dnia bez duplikatu.

## Szczegóły techniczne
- `src/routes/_authenticated/sync.tsx` — poprawiona, jednoznaczna instrukcja konfiguracji Skrótu.
- `src/routes/api/public/ingest/health.ts` — komunikat błędu zgodny z prawidłowym układem czynności.
