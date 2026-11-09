import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "add_note",
  title: "Dodaj notatkę",
  description:
    "Zapisuje nową notatkę zdrowotną (np. wnioski z analizy) w dzienniku zalogowanego użytkownika.",
  inputSchema: {
    title: z.string().trim().min(1).describe("Tytuł notatki."),
    content: z.string().trim().min(1).describe("Treść notatki."),
    note_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Data notatki (YYYY-MM-DD); domyślnie dzisiaj."),
    category: z.string().optional().describe("Kategoria, np. 'analiza', 'zdrowie'."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, note_date, category }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: ctx.getUserId(),
        title,
        content,
        note_date: note_date ?? new Date().toISOString().slice(0, 10),
        category: category ?? "analiza",
      })
      .select("note_date,title,category")
      .single();

    if (error) return errorResult(error.message);
    return jsonResult({ saved: data });
  },
});
