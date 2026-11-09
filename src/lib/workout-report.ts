export type ParsedWorkoutReport = {
  title: string | null;
  date: string | null;
  exercises: { name: string; lines: string[] }[];
};

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  stycznia: 1, lutego: 2, marca: 3, kwietnia: 4, maja: 5, czerwca: 6,
  lipca: 7, sierpnia: 8, września: 9, wrzesnia: 9, października: 10, pazdziernika: 10,
  listopada: 11, grudnia: 12,
};

const pad = (n: number) => String(n).padStart(2, "0");

function findDate(text: string): string | null {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const long = text.match(/\b(\d{1,2})\s+([A-Za-zżźćńółęąśŻŹĆĄŚĘŁÓŃ]+)\s+(\d{4})\b/);
  if (long) {
    const m = MONTHS[long[2]!.toLowerCase()];
    if (m) return `${long[3]}-${pad(m)}-${pad(Number(long[1]))}`;
  }

  const dotted = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (dotted) return `${dotted[3]}-${pad(Number(dotted[2]))}-${pad(Number(dotted[1]))}`;

  return null;
}

const isDetailLine = (l: string) =>
  /^(set|w)\s*\d+\s*:/i.test(l) ||
  /^(notes?|notatki|rir|przerwa|tempo)\b/i.test(l) ||
  /^\d/.test(l);

/**
 * Parsuje raport treningowy: nazwa treningu (pierwsza linia), data,
 * oraz lista ćwiczeń z ich seriami / notatkami.
 */
export function parseWorkoutReport(input: string): ParsedWorkoutReport {
  const lines = input
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (!lines.length) return { title: null, date: null, exercises: [] };

  const date = findDate(input);
  let title: string | null = null;
  let startIdx = 0;

  for (let i = 0; i < Math.min(lines.length, 3); i++) {
    const l = lines[i]!;
    if (findDate(l)) continue;
    if (isDetailLine(l)) break;
    title = l.slice(0, 120);
    startIdx = i + 1;
    break;
  }

  const exercises: { name: string; lines: string[] }[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const l = lines[i]!;
    if (findDate(l) && !isDetailLine(l)) continue;
    if (isDetailLine(l)) {
      if (exercises.length) exercises[exercises.length - 1]!.lines.push(l);
      continue;
    }
    exercises.push({ name: l.slice(0, 120), lines: [] });
  }

  return { title, date, exercises: exercises.filter((e) => e.lines.length || e.name.length > 2) };
}
