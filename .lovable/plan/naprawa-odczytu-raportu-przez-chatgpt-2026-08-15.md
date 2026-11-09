# Naprawa odczytu raportu przez ChatGPT

Sprawdziłem Twój link na żywo: strona **działa** i zwraca pełny raport (ok. 100 KB HTML, status 200). Problem nie leży w aplikacji ani w przekierowaniu — leży w dwóch „zakazach dla robotów”, które sam wystawiam razem z tą stroną:

1. `robots.txt` na opublikowanej stronie zawiera:
   ```text
   User-agent: *
   Disallow: /raport/
   Disallow: /api/public/raport/
   ```
2. Sama strona raportu wysyła `noindex, nofollow` (w nagłówku HTTP i w `<meta>`).

Moduł pobierania stron w ChatGPT respektuje te reguły i dlatego odmawia pobrania — stąd komunikat „Cache miss / nie mogę otworzyć”, mimo że w incognito wszystko widać.

## Co zrobię

- Usunę blokady `Disallow: /raport/` i `Disallow: /api/public/raport/` z `robots.txt`.
- Usunę nagłówek `x-robots-tag: noindex, nofollow` oraz `<meta name="robots">` ze strony raportu i z plików (PDF-y, zdjęcia).
- Dodam lekki wariant tekstowy `?format=txt` (czysty tekst, bez tabel HTML) — szybszy i pewniejszy w odczycie, gdyby duża strona sprawiała kłopot.
- W ekranie „Dostęp dla ChatGPT” pokażę bezpośredni adres `/api/public/raport/<klucz>` (bez przekierowania) jako zalecany do wklejenia w źródłach rozmowy, plus krótką notkę o `?format=txt`.

## Bezpieczeństwo

Prywatność nadal opiera się wyłącznie na tajnym, niemożliwym do zgadnięcia kluczu w adresie — tak jak dotąd. Zdjęcie blokad dla robotów oznacza tylko tyle, że automat, który zna link, może go przeczytać (o to nam chodzi). Strona nie trafi do wyszukiwarek, bo nikt do niej nie linkuje, a klucz możesz w każdej chwili unieważnić przyciskiem „Wygeneruj nowy”.

Jeśli wolisz absolutny brak ryzyka indeksacji, alternatywa jest taka: zostawić `noindex` i zamiast tego wpuścić w `robots.txt` konkretne boty OpenAI (`ChatGPT-User`, `OAI-SearchBot`) — ale ChatGPT bywa wtedy nadal wybredny, więc rekomenduję wariant pełnego zdjęcia blokad.

## Szczegóły techniczne

- `public/robots.txt` — usunięcie dwóch reguł `Disallow`.
- `src/routes/api/public/raport/$token.ts` i `.../plik/$.ts` — usunięcie nagłówka `x-robots-tag`; obsługa `?format=txt`.
- `src/lib/share-report.server.ts` — usunięcie `<meta name="robots">`, dodanie renderera `text/plain`.
- `src/routes/_authenticated/udostepnianie.tsx` — pokazanie adresu bezpośredniego `/api/public/raport/<klucz>` i wariantu `?format=txt`.
- Po zmianach konieczna ponowna publikacja, żeby ChatGPT zobaczył nowy `robots.txt`.
