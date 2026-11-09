# Statyczny plik JSON w publicznym magazynie (CDN) dla ChatGPT

## Co ustaliłem

Opublikowany `robots.txt` już nie blokuje raportu (sprawdzone: zwraca `Allow: /` dla `ChatGPT-User` i `OAI-SearchBot`). Mimo to moduł webowy ChatGPT zgłasza `Cache miss` przy adresach dynamicznych z `/api/...` i `Cache-Control: no-store`. Sugestia z Twojej rozmowy jest trafna: potrzebny jest zwykły, statyczny plik pod publicznym adresem CDN.

## Co zrobię

- Utworzę publiczny kubełek magazynu (tylko odczyt) i będę w nim trzymał jeden plik z raportem, np. `raport/<klucz>.json`, plus bliźniaczy `raport/<klucz>.txt`.
- Adres będzie prosty i statyczny — bez `/api/`, bez przekierowań, z normalnym cache'owaniem CDN. Taki link ChatGPT pobiera niezawodnie.
- Plik będzie odświeżany automatycznie: przy każdym zapisie danych w aplikacji (dieta, Fitatu, treningi, pomiary, notatki, badania, zdjęcia) raport zostanie przegenerowany w tle.
- W ekranie „Dostęp dla ChatGPT” dojdzie przycisk „Odśwież teraz” oraz informacja o dacie ostatniego odświeżenia, gdyby chciał wymusić aktualizację ręcznie.
- Główny link do kopiowania zmienię na ten statyczny adres CDN. Dotychczasowe adresy `/api/public/raport/...` (HTML, txt, JSON) zostaną jako zapas.

## Zdjęcia i załączniki

Same pliki medyczne i zdjęcia zostają prywatne — w raporcie będą, tak jak teraz, linki przez tajny klucz. Jeśli okaże się, że ChatGPT nie potrafi ich pobrać, w kolejnym kroku mogę przenieść je również pod statyczne adresy z losową, niemożliwą do zgadnięcia ścieżką.

## Bezpieczeństwo

Nazwa pliku zawiera ten sam długi, tajny klucz, więc adresu nie da się zgadnąć. Plik nie zawiera identyfikatorów użytkownika ani ścieżek wewnętrznych. „Wygeneruj nowy” unieważnia stary klucz i usuwa poprzedni plik z magazynu — wtedy trzeba podmienić link w ChatGPT.

## Szczegóły techniczne

- Migracja: publiczny kubełek `raporty` z polityką `SELECT` dla `anon`, zapisy wyłącznie z serwera (service role).
- Nowa funkcja serwerowa `publishShareReport` (chroniona), która renderuje JSON/TXT wspólnym generatorem z `src/lib/share-report.server.ts` i uploaduje do magazynu z `upsert` i krótkim `cache-control`.
- Wywołanie po mutacjach danych oraz przyciskiem w `src/routes/_authenticated/udostepnianie.tsx`.
- Usuwanie starego pliku przy generowaniu/unieważnianiu klucza w `src/lib/share.functions.ts`.
- Po zmianach konieczna ponowna publikacja aplikacji.
