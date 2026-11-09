# Ostatnia poprawka Skrótu do synchronizacji kroków

## Co jest teraz źle
Na zrzucie blok **„Oblicz Suma”** znajduje się pod „Pobierz zawartość URL” i jako wejście ma **Zawartość URL**. W tej konfiguracji oblicza odpowiedź serwera zamiast kroków. W bloku „Tekst” nadal znajduje się zmienna **Próbki aplikacji Zdrowie**, a powinna być tam zmienna **Suma**.

## Dokładne kroki na iPhonie
1. Przytrzymać blok **„Oblicz Suma z Zawartość URL”** i przeciągnąć go na samą górę — bezpośrednio pod **„Znajdź próbki aplikacji Zdrowie”**, a przed „Bieżąca data”.
2. W tym bloku dotknąć niebieskiej zmiennej **„Zawartość URL”** i zamienić ją na **„Próbki aplikacji Zdrowie”**. Blok ma brzmieć: **„Oblicz Suma z Próbki aplikacji Zdrowie”**.
3. W bloku **„Tekst”** usunąć niebieską zmienną **„Próbki aplikacji Zdrowie”** znajdującą się po `"steps":`.
4. W tym samym miejscu wstawić niebieską zmienną **„Suma”**. Nie dodawać wokół niej cudzysłowów.
5. Pozostawić blok **„Pobierz zawartość URL”** na samym końcu i nacisnąć ▶.

Poprawny układ bloków:

```text
Znajdź próbki aplikacji Zdrowie
↓
Oblicz Suma z Próbki aplikacji Zdrowie
↓
Bieżąca data
↓
Formatuj datę
↓
Tekst (steps: Suma)
↓
Pobierz zawartość URL
```

Po uruchomieniu prawidłowa odpowiedź to `{"ok":true,"days":1}`.
