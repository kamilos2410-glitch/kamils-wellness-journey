import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  imageDataUrl: z.string().min(20).max(12_000_000),
});

export type FitatuScreenshotResult = {
  date: string | null;
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  goal_kcal: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
  goal_carbs: number | null;
  meals: { name: string; kcal: number | null; protein: number | null; fat: number | null; carbs: number | null }[];
};

const num = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export const parseFitatuScreenshot = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<FitatuScreenshotResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Brak klucza AI");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content:
              "Odczytujesz zrzuty ekranu z aplikacji Fitatu. Zwracasz WYŁĄCZNIE poprawny JSON, bez komentarzy i bez bloków kodu.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Odczytaj dane z tego zrzutu ekranu Fitatu i zwróć JSON o strukturze:
{"date":"YYYY-MM-DD lub null","kcal":liczba,"protein":liczba,"fat":liczba,"carbs":liczba,"goal_kcal":liczba,"goal_protein":liczba,"goal_fat":liczba,"goal_carbs":liczba,"meals":[{"name":"Śniadanie","kcal":liczba,"protein":liczba,"fat":liczba,"carbs":liczba}]}
Zasady: wartości spożyte to liczby przed ukośnikiem (np. "Kcal 2450 /2800" => kcal 2450, goal_kcal 2800). Kolumny przy posiłkach to kolejno B (białko), T (tłuszcz), W (węglowodany). Brakujące wartości ustaw na null.
DATA: u góry jest pasek dni tygodnia z numerami. Wybrany (oglądany) dzień to ten w WYPEŁNIONYM CIEMNYM/CZARNYM KÓŁKU — użyj właśnie jego numeru. NIE bierz dnia zaznaczonego jasnym/białym tłem ani zegara w statusbarze (to dzisiejsza data). Miesiąc i rok wywnioskuj z układu dni tygodnia (litery P W Ś C P S N) względem dzisiejszej daty ${new Date().toISOString().slice(0, 10)}; wybrany dzień jest zwykle dzisiaj lub wcześniej. Jeśli nie da się jednoznacznie ustalić – null.
Nie dodawaj żadnego tekstu poza JSON.`,
              },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Nie udało się odczytać danych ze zrzutu ekranu");
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;

    const meals = Array.isArray(parsed["meals"])
      ? (parsed["meals"] as Record<string, unknown>[]).map((m) => ({
          name: String(m["name"] ?? "").slice(0, 60),
          kcal: num(m["kcal"]),
          protein: num(m["protein"]),
          fat: num(m["fat"]),
          carbs: num(m["carbs"]),
        }))
      : [];

    const date = typeof parsed["date"] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(parsed["date"])
      ? (parsed["date"] as string)
      : null;

    return {
      date,
      kcal: num(parsed["kcal"]),
      protein: num(parsed["protein"]),
      fat: num(parsed["fat"]),
      carbs: num(parsed["carbs"]),
      goal_kcal: num(parsed["goal_kcal"]),
      goal_protein: num(parsed["goal_protein"]),
      goal_fat: num(parsed["goal_fat"]),
      goal_carbs: num(parsed["goal_carbs"]),
      meals: meals.filter((m) => m.name),
    };
  });
