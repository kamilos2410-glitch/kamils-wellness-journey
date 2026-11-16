export type ParsedFitatu = {
  kcal: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
};

const num = (raw: string) => {
  const v = Number(raw.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

function findValue(text: string, patterns: RegExp[]): number | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const v = num(m[1]);
      if (v !== null) return v;
    }
  }
  return null;
}

/**
 * Parsuje wklejony raport z Fitatu (lub notatkę w stylu "2450 kcal / B180 / T70 / W300").
 */
export function parseFitatuReport(input: string): ParsedFitatu {
  const text = input.replace(/\u00a0/g, " ");

  const kcal = findValue(text, [
    /(\d[\d\s]*[.,]?\d*)\s*kcal/i,
    /kalorie\s*:?\s*(\d+[.,]?\d*)/i,
    /energia\s*:?\s*(\d+[.,]?\d*)/i,
  ]);

  const protein = findValue(text, [
    /bia[lł]ko\s*:?\s*(\d+[.,]?\d*)/i,
    /protein\s*:?\s*(\d+[.,]?\d*)/i,
    /\bB\s*:?\s*(\d+[.,]?\d*)\s*g?\b/,
  ]);

  const fat = findValue(text, [
    /t[lł]uszcz(?:e|)\s*:?\s*(\d+[.,]?\d*)/i,
    /\bT\s*:?\s*(\d+[.,]?\d*)\s*g?\b/,
  ]);

  const carbs = findValue(text, [
    /w[eę]glowodan(?:y|ów)\s*:?\s*(\d+[.,]?\d*)/i,
    /\bW\s*:?\s*(\d+[.,]?\d*)\s*g?\b/,
  ]);

  return {
    kcal: kcal === null ? null : Math.round(kcal),
    protein,
    fat,
    carbs,
  };
}
