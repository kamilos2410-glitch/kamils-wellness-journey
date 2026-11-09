import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, jsonResult, supabaseForUser, unauthenticated } from "../supabase";

export default defineTool({
  name: "list_notes",
  title: "Notatki zdrowotne",
  description: "Notatki zdrowotne i medyczne użytkownika z datami.",
  inputSchema: {
    search: z.string().optional().describe("Fraza wyszukiwana w tytule i treści."),
    limit: z.number().int().min(1).max(200).default(50).describe("Maksymalna liczba notatek."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauthenticated();
    const supabase = supabaseForUser(ctx);

    let query = supabase
      .from("notes")
      .select("note_date,title,content,category")
      .order("note_date", { ascending: false })
      .limit(limit);
    if (search) query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) return errorResult(error.message);
    return jsonResult({ count: data?.length ?? 0, notes: data ?? [] });
  },
});
