# Stały raport na żywo dla ChatGPT w formacie JSON

## Odpowiedź

Tak — możemy zrobić jeden link, który wystarczy przekazać ChatGPT tylko raz. Nie będzie to plik do ponownego wysyłania: każde otwarcie adresu wygeneruje raport na żywo z aktualnych danych w aplikacji.

Sprawdzony obecnie adres zwraca kod 404 i komunikat „Link nieaktywny lub nieprawidłowy”. Oznacza to, że użyty w rozmowie klucz został już unieważniony lub zastąpiony. Sam format HTML nie jest obecnie przyczyną odpowiedzi tego adresu.

## Co zmienię

- Dodam osobny publiczny adres w formacie JSON, np. `/api/public/raport/<klucz>/dane.json`.
- JSON będzie generowany przy każdym odczycie bezpośrednio z bazy i będzie miał wyłączone buforowanie, więc nowe pomiary, posiłki, treningi, notatki i badania pojawią się pod tym samym adresem automatycznie.
- Raport obejmie wszystkie obecne sekcje oraz stałe, chronione tym samym kluczem adresy do zdjęć i załączników medycznych.
- Odpowiedź będzie miała prostą, jednoznaczną strukturę i datę wygenerowania, aby ChatGPT łatwiej odczytywał dane niż z dużej strony HTML.
- W ekranie „Dostęp dla ChatGPT” głównym linkiem do kopiowania ustawię wariant JSON; wersje HTML i tekstowa pozostaną dostępne pomocniczo.
- Dodam jasną informację, że „Wygeneruj nowy” unieważnia poprzedni adres — wtedy trzeba podmienić link w ChatGPT. Przy zwykłym dopisywaniu danych link pozostaje bez zmian.

## Jak będzie działać

```text
Dodajesz dane w aplikacji
        ↓
ChatGPT ponownie otwiera ten sam link JSON
        ↓
Endpoint pobiera aktualny stan bazy
        ↓
ChatGPT widzi nowe dane bez nowego pliku i bez nowego linku
```

## Ważne ograniczenie

Aplikacja zapewni aktualne dane pod stałym adresem, ale nie może zmusić ChatGPT do samoczynnego odświeżania źródła w tle. Gdy chcesz nową analizę, wystarczy poprosić go w rozmowie o ponowne odczytanie tego samego źródła. Nowy link będzie potrzebny wyłącznie po świadomym kliknięciu „Wygeneruj nowy” lub „Unieważnij”.

Jeśli moduł internetowy ChatGPT nadal zgłosi `Cache miss` dla poprawnego, działającego JSON-u, będzie to ograniczenie po stronie dostępu webowego ChatGPT, a nie nieaktualność raportu. Najpierw zweryfikuję nowo wygenerowany adres na opublikowanej domenie i jego odpowiedź bez logowania.

## Szczegóły techniczne

- Nowa trasa GET: `src/routes/api/public/raport/$token/dane[.]json.ts`.
- Wspólny generator danych w kodzie serwerowym, aby HTML, tekst i JSON korzystały z tych samych zapytań i filtrów użytkownika.
- Nagłówki `Content-Type: application/json; charset=utf-8` i `Cache-Control: no-store`.
- Brak operacji zapisu; dostęp nadal wyłącznie przez długi tajny klucz, z kontrolą właściciela każdego pliku.
- Aktualizacja ekranu udostępniania i test odpowiedzi 200, struktury JSON oraz odnośników do załączników.