# Plany treningowe z eksportu Strong + kilka aktywnych planów

## Co się zmieni w zakładce Treningi

### 1. Dodawanie planu przez wklejenie eksportu ze Strong
Sekcja "Nowy plan" dostaje takie samo pole i podgląd jak sekcja zapisu odbytego treningu:

- Wklejasz tekst planu ze Strong (nazwa w pierwszej linii, potem ćwiczenia i serie).
- Aplikacja sama uzupełnia **nazwę planu** (z pierwszej linii) i **datę rozpoczęcia** (jeśli w tekście jest data; inaczej dzisiejsza) — obie nadal możesz ręcznie poprawić.
- Pod polem pojawia się podgląd: nazwa, data, liczba ćwiczeń i lista ich nazw.
- Zapis trafia do planów treningowych — pełna treść w polu planu, więc szczegóły serii są zachowane.

Ręczne pisanie planu od zera zostaje możliwe (to samo pole tekstowe).

### 2. Kilka aktywnych planów jednocześnie
- Zapisanie nowego aktywnego planu **nie wyłącza** pozostałych aktywnych planów.
- Na liście planów każdy aktywny ma znacznik "aktywny", a przy każdym planie pojawia się przełącznik aktywny / zakończony, żeby móc zamknąć plan, gdy go kończysz.
- Lista planów: aktywne na górze, potem pozostałe, w obu grupach od najnowszej daty rozpoczęcia.

### 3. Rozwijany podgląd planu
Plan na liście pokazuje nagłówek (nazwa, data, liczba ćwiczeń) i po kliknięciu rozwija ćwiczenia z seriami — tak jak zapisane treningi, zamiast jednego bloku surowego tekstu.

## Szczegóły techniczne
- Zmiany wyłącznie w `src/routes/_authenticated/treningi.tsx`; parser `src/lib/workout-report.ts` używany bez zmian (`parseWorkoutReport` dla treści planu).
- Usunięcie w mutacji `savePlan` kroku `update({ is_active: false }).eq("is_active", true)`.
- Nowa mutacja `togglePlanActive` (update `is_active` po `id`), unieważnienie zapytań przez `queryClient`.
- Brak zmian w schemacie bazy i w narzędziach MCP — `list_plans` i przegląd zdrowia już zwracają wiele planów; przegląd pokazuje tylko najnowszy aktywny plan i tak zostaje.
