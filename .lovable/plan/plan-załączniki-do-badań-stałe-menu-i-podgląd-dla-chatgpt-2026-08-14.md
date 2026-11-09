# Plan: załączniki do badań, stałe menu i podgląd dla ChatGPT

## 1. Załączniki przy badaniach

Sprawdziłem bazę: wszystkie 15 zaimportowanych badań ma **tylko treść tekstową — żaden nie ma podpiętego pliku**. Przy imporcie przepisałem wyniki z Twoich PDF-ów i zrzutów, ale same pliki nie trafiły do magazynu aplikacji. Dlatego nie ma czego otwierać.

Co zrobimy:
- Przy każdym badaniu pojawi się przycisk **„Zobacz załącznik”** (otwiera PDF/zdjęcie w nowej karcie) — widoczny, gdy plik jest podpięty.
- Gdy pliku nie ma, w tym miejscu pojawi się przycisk **„Dodaj załącznik”** — wybierasz plik z telefonu i dopina się do istniejącego wpisu, bez tworzenia nowego badania.
- Można też podmienić/usunąć załącznik.
- Dodatkowo: możliwość dodania **kilku plików** do jednej partii badań (np. 3 strony wyników z jednego dnia) — lista plików pod wpisem, każdy z własnym przyciskiem otwarcia.

Jeśli wolisz, żebym to ja wrzucił pliki: prześlij te 15 dokumentów jeszcze raz w czacie, a podepnę je do odpowiednich wpisów po dacie i nazwie.

## 2. Stałe, zawsze widoczne menu na telefonie

Dziś dolny pasek ma 8 pozycji w jednej przewijanej linii — skrajne (Notatki, Badania) trzeba przesuwać.

Zmiana: dolny pasek staje się **siatką 4 × 2** (dwa rzędy po cztery ikony), bez przewijania, wszystkie osiem pozycji widocznych zawsze:

```text
[ Panel ] [ Dieta ] [ Fitatu ] [ Treningi ]
[Pomiary] [Zdjęcia] [Notatki] [ Badania  ]
```

- Ikony mniejsze, podpisy pod nimi, aktywna zakładka podświetlona jak dziś.
- Pasek trzyma się dołu ekranu i respektuje bezpieczny margines iPhone'a.
- Na szerszym ekranie (tablet/desktop) zostaje jeden rząd ośmiu pozycji.
- Odstęp treści od dołu zostanie powiększony, żeby nic nie chowało się pod paskiem.

## 3. Stały, żywy wgląd dla ChatGPT

To już jest częściowo gotowe: aplikacja wystawia konektor (MCP) z logowaniem Twoim kontem, a ChatGPT po podłączeniu czyta dane **na żywo z bazy** — nie kopie raportu. Dostępne narzędzia: przegląd zdrowia, plany, wpisy z Fitatu, pomiary, notatki, zdjęcia sylwetki (z czasowymi linkami do obrazów) i dopisywanie notatek.

Czego brakuje i co dorobimy:
- Nowe narzędzie **`list_medical_exams`** — ChatGPT zobaczy badania: datę, kategorię, pełny opis wyników oraz link do załączonego pliku (jeśli jest), żeby mógł go otworzyć i przeanalizować.
- Rozszerzenie `get_health_overview` o ostatnie badania, żeby „pełny obraz” zawierał też wyniki laboratoryjne.

Jak to podłączysz (po wdrożeniu):
1. Opublikuj aplikację (przycisk Publish) — konektor działa pod adresem publicznym.
2. W ChatGPT: Ustawienia → Konektory → dodaj własny konektor → adres `https://life-stats-keeper.lovable.app/mcp`.
3. ChatGPT poprosi o zalogowanie — logujesz się tym samym e-mailem co w aplikacji.
4. Od tej pory w rozmowie włączasz konektor i pytasz np. „porównaj moje testosterony 2026 z dietą i wagą” — dane pobiera na bieżąco.

Uwaga: linki do zdjęć i plików są ważne 1 godzinę i wystawiane tylko dla Twojego konta — nikt inny ich nie otworzy.

## Szczegóły techniczne

- `src/routes/_authenticated/badania.tsx` — przycisk otwarcia podpisanego linku, upload/podmiana załącznika do istniejącego wpisu, obsługa wielu plików.
- Nowa tabela `medical_exam_files` (wpis badania, ścieżka w magazynie, nazwa, typ) z RLS na właściciela + GRANT; dotychczasowe pole `storage_path` zostaje dla zgodności.
- `src/components/AppShell.tsx` — dolna nawigacja jako `grid grid-cols-4` z dwoma rzędami, `pb-[env(safe-area-inset-bottom)]`, `sm:grid-cols-8`.
- `src/lib/mcp/tools/list-medical-exams.ts` + rejestracja w `src/lib/mcp/index.ts`; rozszerzenie `get-health-overview.ts` o badania.
