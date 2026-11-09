# Plan: jeden link „tylko do czytania” dla ChatGPT

Masz rację — ChatGPT umie tylko otworzyć adres URL. Nie zaloguje się, nie kliknie, nie odświeży sesji. Dlatego zrobimy **sekretny link publiczny**, pod którym jest cała Twoja aplikacja w formie prostej strony do czytania.

## Jak to będzie działać

- W aplikacji (menu ⚙️ → „Dostęp dla ChatGPT”) pojawi się pole z gotowym adresem, np.
  `https://life-stats-keeper.lovable.app/raport/8f3c...` oraz przyciski **Kopiuj**, **Otwórz** i **Wygeneruj nowy link** (stary natychmiast przestaje działać).
- Adres zawiera długi, niemożliwy do zgadnięcia klucz. Nikt bez tego klucza nic nie zobaczy, nie ma go w wyszukiwarkach (blokada indeksowania).
- Wklejasz link raz do ChatGPT i mówisz „czytaj to”. Za każdym razem widzi **aktualne** dane — strona generuje się na żywo z bazy.

## Co będzie na stronie raportu

Jedna, długa, czytelna strona (prosty tekst + nagłówki, bez JavaScriptu — tak, żeby ChatGPT na pewno ją odczytał):

- Plany dietetyczne (makro dzień treningowy / nietreningowy, daty, aktywny plan)
- Wpisy z Fitatu (dzień po dniu: kcal, białko, tłuszcz, węgle, czy był trening) + średnie
- Plany i sesje treningowe z pełnym opisem ćwiczeń
- Pomiary (waga, obwody, sen, kroki) pogrupowane po datach
- Notatki
- Badania lekarskie: data, kategoria, pełny opis wyników + **linki do załączników**
- Zdjęcia sylwetki pogrupowane po datach + **linki do zdjęć**

## Załączniki i zdjęcia

Pliki w magazynie są prywatne, a podpisane linki wygasają po godzinie — dla ChatGPT to za mało. Dlatego każdy plik dostanie **stały adres w obrębie tego samego sekretnego linku**, np.
`.../raport/8f3c.../plik/badanie-2026-07-01-morfologia.pdf`.
Ten adres serwer sam pobiera z magazynu i oddaje plik. Działa tak długo, jak długo działa link — i przestaje działać, gdy wygenerujesz nowy.

Uwaga praktyczna: ChatGPT czyta tekst strony bardzo dobrze; PDF-y i zdjęcia otwiera zależnie od trybu — dlatego pełne wyniki badań są też **przepisane tekstem** na stronie, żeby analiza działała nawet bez otwierania pliku.

## Bezpieczeństwo

- Klucz losowy 32-bajtowy, w bazie trzymany jako skrót (hash), nie da się go odczytać z bazy.
- Link można w każdej chwili unieważnić jednym kliknięciem.
- Strona jest tylko do odczytu — przez link nie da się nic zmienić ani skasować.
- Nagłówki `noindex, nofollow` + wpis w `robots.txt`.

## Szczegóły techniczne

- Nowa tabela `public.share_links` (user_id, token_hash, created_at, revoked_at, last_accessed_at) z RLS na właściciela + GRANT; token generowany po stronie serwera i pokazywany tylko właścicielowi po zalogowaniu.
- `src/routes/api/public/raport/$token.ts` — handler GET zwracający wyrenderowany HTML (semantyczny, statyczny) oraz wariant `?format=json`; walidacja tokenu przez hash, odczyt danych klientem `supabaseAdmin` ograniczonym do `user_id` z rekordu tokenu.
- `src/routes/api/public/raport/$token/plik/$path.ts` — strumieniowanie pliku z bucketów `medical-exams` i `progress-photos` po weryfikacji tokenu i przynależności pliku do tego użytkownika.
- Ładny alias `/raport/$token` przekierowujący na endpoint publiczny (żeby adres był krótki).
- `src/components/AppShell.tsx` — pozycja „Dostęp dla ChatGPT” w menu ⚙️; nowy ekran `src/routes/_authenticated/udostepnianie.tsx` z kopiowaniem i regeneracją linku.
- Konektor MCP zostaje bez zmian jako opcja dla klientów, które potrafią się logować.
