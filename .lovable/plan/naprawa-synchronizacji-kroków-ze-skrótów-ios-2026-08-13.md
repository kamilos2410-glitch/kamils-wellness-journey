# Naprawa synchronizacji kroków ze Skrótów iOS

## Cel
Doprowadzić skrót do poprawnego wysyłania dziennej liczby kroków bez kolejnych prób i niejasnych komunikatów.

## Zakres zmian
1. **Uprościć instrukcję w ekranie Synchronizacja**
   - rozpisać dokładnie, które czynności dodać w Skrótach i w jakiej kolejności;
   - wyjaśnić, jak pobrać samą liczbową sumę kroków zamiast całego obiektu „Próbki aplikacji Zdrowie”;
   - pokazać poprawny wzór tekstu: data w cudzysłowie, liczba kroków bez cudzysłowu;
   - doprecyzować ustawienia POST, obu nagłówków oraz treści żądania.

2. **Ułatwić rozpoznawanie błędów**
   - endpoint nadal będzie bezpiecznie sprawdzał token i strukturę danych;
   - zamiast technicznego błędu parsera zwróci krótką polską informację, czy problem dotyczy tokenu, daty, czy wartości kroków.

3. **Zweryfikować pełny przepływ**
   - przetestować poprawny raport `{"days":[{"date":"2026-08-13","steps":1234}]}`;
   - sprawdzić odrzucenie błędnego tokenu i nieprawidłowej treści;
   - potwierdzić, że ponowne uruchomienie skrótu aktualizuje ten sam dzień zamiast tworzyć duplikat.

## Co oznacza obecny zrzut
Połączenie i token działają. Błąd `invalid_payload` wynika z tego, że w polu `steps` Skrót wstawia całe „Próbki aplikacji Zdrowie”, a serwer oczekuje jednej liczby, np. `9432`.